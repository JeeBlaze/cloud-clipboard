import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';
import { SUPABASE_SQL_SCHEMA } from '../src/lib/supabase-schema';

const router = Router();

// Dynamic Maximum file size configuration (Single Source of Truth)
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '300', 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Configure Multer with disk storage in temp directory for scalable large file uploads (up to 300MB)
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, storage.getUploadDir());
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeExt = path.extname(file.originalname);
    cb(null, `clip-${uniqueSuffix}${safeExt}`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // Dynamic limit based on MAX_FILE_SIZE_MB
  },
  fileFilter: (_req, _file, cb) => {
    cb(null, true);
  },
});

// Configure chunk upload handler (5MB memory limit per chunk)
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per individual chunk
  },
});

// Helper for client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// 0. APP CONFIG ENDPOINT
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    defaultExpiryMinutes: parseInt(process.env.DEFAULT_EXPIRY_MINUTES || '10', 10),
  });
});

// ==========================================
// CHUNKED LARGE FILE UPLOAD PIPELINE (Up to 300 MB)
// ==========================================

// 1A. INITIALIZE UPLOAD SESSION
router.post('/upload/init', async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    // Rate limit: 40 upload session creations per 10 min
    if (!storage.checkRateLimit(`upload_init_${ip}`, 40, 10 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        error: 'Too many upload sessions. Please wait a few minutes before trying again.',
        errorCode: 'RATE_LIMITED',
      });
    }

    const { fileName, fileSize, mimeType, expiryMinutes, burnOnRead, contentType } = req.body;

    if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'File name is required.',
        errorCode: 'MISSING_FILENAME',
      });
    }

    const numericSize = parseInt(fileSize, 10);
    if (isNaN(numericSize) || numericSize <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file size provided.',
        errorCode: 'INVALID_FILE_SIZE',
      });
    }

    // Strict validation against 300 MB maximum
    if (numericSize > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        error: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
        errorCode: 'FILE_TOO_LARGE',
      });
    }

    const session = storage.createUploadSession({
      fileName: fileName.trim(),
      fileSize: numericSize,
      mimeType,
      contentType: contentType === 'image' || mimeType?.startsWith('image/') ? 'image' : 'file',
      expiryMinutes: expiryMinutes ? parseInt(expiryMinutes, 10) : 10,
      burnOnRead: burnOnRead === 'true' || burnOnRead === true,
      chunkSize: 5 * 1024 * 1024, // 5 MB chunks
    });

    return res.json({
      success: true,
      uploadId: session.uploadId,
      chunkSize: session.chunkSize,
      totalChunks: session.totalChunks,
      maxFileSizeMb: MAX_FILE_SIZE_MB,
    });
  } catch (err: any) {
    console.error('[Upload Init Error]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize upload session. Please try again.',
      errorCode: 'SERVER_ERROR',
    });
  }
});

// 1B. UPLOAD SINGLE 5MB CHUNK
router.post('/upload/chunk', chunkUpload.single('chunk'), async (req: Request, res: Response) => {
  try {
    const { uploadId, chunkIndex } = req.body;
    const file = req.file;

    if (!uploadId || chunkIndex === undefined || !file) {
      return res.status(400).json({
        success: false,
        error: 'Missing upload session ID, chunk index, or binary chunk data.',
        errorCode: 'INVALID_CHUNK_REQUEST',
      });
    }

    const idx = parseInt(chunkIndex, 10);
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chunk index provided.',
        errorCode: 'INVALID_CHUNK_INDEX',
      });
    }

    const result = await storage.appendChunk(uploadId, idx, file.buffer);

    return res.json({
      success: true,
      chunkIndex: idx,
      bytesReceived: result.bytesReceived,
      totalBytes: result.totalBytes,
    });
  } catch (err: any) {
    console.error('[Upload Chunk Error]', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to process file chunk. Please retry.',
      errorCode: 'CHUNK_FAILED',
    });
  }
});

// 1C. FINALIZE CHUNKED UPLOAD & GENERATE CLIPBOARD
router.post('/upload/finalize', async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.body;
    if (!uploadId || typeof uploadId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Upload session ID is required to finalize clipboard.',
        errorCode: 'MISSING_UPLOAD_ID',
      });
    }

    const item = await storage.finalizeUploadSession(uploadId);
    const now = Date.now();

    return res.status(201).json({
      success: true,
      item: {
        id: item.id,
        code: item.code,
        contentType: item.contentType,
        fileName: item.fileName,
        fileSize: item.fileSize,
        mimeType: item.mimeType,
        createdAt: new Date(item.createdAt).toISOString(),
        expiresAt: new Date(item.expiresAt).toISOString(),
        expiresInSeconds: Math.max(0, Math.floor((item.expiresAt - now) / 1000)),
      },
    });
  } catch (err: any) {
    console.error('[Upload Finalize Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to finalize clipboard.',
      errorCode: 'FINALIZE_FAILED',
    });
  }
});

// 1D. CREATE DIRECT CLIPBOARD (For Text & small payloads)
router.post('/clipboard/create', (req: Request, res: Response, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
          errorCode: 'FILE_TOO_LARGE',
        });
      }
      return res.status(400).json({ success: false, error: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    // Rate limit: 30 creations per 10 min
    if (!storage.checkRateLimit(`create_${ip}`, 30, 10 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait a few minutes before creating another clipboard.',
        errorCode: 'RATE_LIMITED',
      });
    }

    const { contentType, textContent, expiryMinutes, burnOnRead } = req.body;
    const file = req.file;

    // Validate Input
    if (contentType === 'text') {
      if (!textContent || typeof textContent !== 'string' || textContent.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Text content cannot be empty.',
          errorCode: 'EMPTY_TEXT',
        });
      }

      if (textContent.length > 500000) {
        return res.status(400).json({
          success: false,
          error: 'Text exceeds maximum limit of 500,000 characters.',
          errorCode: 'TEXT_TOO_LONG',
        });
      }

      const item = await storage.createItem({
        contentType: 'text',
        textContent: textContent.trim(),
        expiryMinutes: expiryMinutes ? parseInt(expiryMinutes, 10) : 10,
        burnOnRead: burnOnRead === 'true' || burnOnRead === true,
      });

      const now = Date.now();
      return res.status(201).json({
        success: true,
        item: {
          id: item.id,
          code: item.code,
          contentType: item.contentType,
          createdAt: new Date(item.createdAt).toISOString(),
          expiresAt: new Date(item.expiresAt).toISOString(),
          expiresInSeconds: Math.max(0, Math.floor((item.expiresAt - now) / 1000)),
        },
      });
    } else if (contentType === 'file' || contentType === 'image' || file) {
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Please select or drop a file to upload.',
          errorCode: 'MISSING_FILE',
        });
      }

      // Server-side strict size check
      if (file.size > MAX_FILE_SIZE_BYTES) {
        if (file.path && fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch (e) {}
        }
        return res.status(400).json({
          success: false,
          error: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
          errorCode: 'FILE_TOO_LARGE',
        });
      }

      const isImage = file.mimetype.startsWith('image/');
      const detectedContentType = isImage ? 'image' : 'file';

      const item = await storage.createItem({
        contentType: detectedContentType,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        localFilePath: file.path,
        expiryMinutes: expiryMinutes ? parseInt(expiryMinutes, 10) : 10,
        burnOnRead: burnOnRead === 'true' || burnOnRead === true,
      });

      const now = Date.now();
      return res.status(201).json({
        success: true,
        item: {
          id: item.id,
          code: item.code,
          contentType: item.contentType,
          fileName: item.fileName,
          fileSize: item.fileSize,
          mimeType: item.mimeType,
          createdAt: new Date(item.createdAt).toISOString(),
          expiresAt: new Date(item.expiresAt).toISOString(),
          expiresInSeconds: Math.max(0, Math.floor((item.expiresAt - now) / 1000)),
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type specified. Must be "text", "image", or "file".',
        errorCode: 'INVALID_CONTENT_TYPE',
      });
    }
  } catch (err: any) {
    console.error('[API Create Error]', err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while creating your clipboard.',
      errorCode: 'SERVER_ERROR',
    });
  }
});

// 2. RETRIEVE CLIPBOARD
router.get('/clipboard/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code?.trim();
    if (!code || !/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'The clipboard code must be exactly 6 digits.',
        errorCode: 'INVALID_CODE',
      });
    }

    const ip = getClientIp(req);
    // Rate limit: 60 checks per 5 min
    if (!storage.checkRateLimit(`retrieve_${ip}`, 60, 5 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        error: 'Too many lookup attempts. Please wait a moment before trying again.',
        errorCode: 'RATE_LIMITED',
      });
    }

    const item = await storage.getItemByCode(code);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'That code is invalid or has expired.',
        errorCode: 'NOT_FOUND',
      });
    }

    const now = Date.now();
    if (now > item.expiresAt) {
      await storage.deleteItem(code);
      return res.status(410).json({
        success: false,
        error: 'Your clipboard has expired.',
        errorCode: 'EXPIRED',
      });
    }

    return res.json({
      success: true,
      item: {
        id: item.id,
        code: item.code,
        contentType: item.contentType,
        textContent: item.textContent,
        fileName: item.fileName,
        fileSize: item.fileSize,
        mimeType: item.mimeType,
        fileData: item.fileBase64 ? `data:${item.mimeType || 'application/octet-stream'};base64,${item.fileBase64}` : undefined,
        downloadUrl: `/api/clipboard/${item.code}/download`,
        createdAt: new Date(item.createdAt).toISOString(),
        expiresAt: new Date(item.expiresAt).toISOString(),
        expiresInSeconds: Math.max(0, Math.floor((item.expiresAt - now) / 1000)),
      },
    });
  } catch (err: any) {
    console.error('[API Retrieve Error]', err);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while retrieving the clipboard.',
      errorCode: 'SERVER_ERROR',
    });
  }
});

// 3. DOWNLOAD FILE WITH STREAMING
router.get('/clipboard/:code/download', async (req: Request, res: Response) => {
  console.log("================================");
  console.log("[DOWNLOAD REQUEST RECEIVED]");
  console.log("method:", req.method);
  console.log("url:", req.originalUrl);
  console.log("params:", req.params);
  console.log("query:", req.query);
  console.log("headers:", req.headers);
  console.log("================================");

  const code = req.params.code?.trim();

  try {
    if (!code || !/^[0-9]{6}$/.test(code)) {
      console.warn('[DOWNLOAD] Invalid code format received:', code);
      return res.status(400).json({ error: 'Invalid code format', code });
    }

    console.log("[DOWNLOAD] Looking up clipboard for code:", code);
    const item = await storage.getItemByCode(code);
    console.log("[DOWNLOAD] Item found:", !!item);
    console.log("[DOWNLOAD] Item metadata:", item ? {
      id: item.id,
      code: item.code,
      contentType: item.contentType,
      fileName: item.fileName,
      fileSize: item.fileSize,
      mimeType: item.mimeType,
      localFilePath: item.localFilePath,
      hasBuffer: !!item.fileBuffer,
      hasBase64: !!item.fileBase64,
      hasText: !!item.textContent,
      burnOnRead: item.burnOnRead,
      expiresAt: new Date(item.expiresAt).toISOString(),
    } : null);

    if (!item) {
      console.warn('[DOWNLOAD] Code not found or expired:', code);
      return res.status(404).json({ error: 'File not found or expired', code });
    }

    console.log("[DOWNLOAD] Storage path:", item.localFilePath);

    // Sanitize filename for headers
    const rawFileName = item.fileName || 'downloaded-file';
    const safeAsciiName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeEncodedName = encodeURIComponent(rawFileName);

    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');

    if (item.localFilePath) {
      const fileExists = fs.existsSync(item.localFilePath);
      console.log("[DOWNLOAD] File exists on disk:", fileExists);

      if (!fileExists) {
        console.error('[DOWNLOAD] File not found on disk at path:', item.localFilePath);
        return res.status(404).json({ error: 'File data missing on server disk', path: item.localFilePath });
      }

      const stats = fs.statSync(item.localFilePath);
      const actualSize = stats.size;
      console.log("[DOWNLOAD] Actual disk size:", actualSize);

      if (item.mimeType) {
        res.setHeader('Content-Type', item.mimeType);
      }

      return res.download(item.localFilePath, rawFileName, (downloadErr) => {
        if (downloadErr) {
          if (!res.headersSent) {
            console.error('[DOWNLOAD] res.download error before headers sent:', downloadErr);
            return res.status(500).json({ error: 'Download failed', debug: String(downloadErr) });
          } else {
            console.warn('[DOWNLOAD] Stream aborted or socket closed by client:', downloadErr.message);
          }
        } else {
          console.log('[DOWNLOAD] File transferred successfully for code:', code);
        }
      });
    } else if (item.fileBuffer) {
      console.log('[DOWNLOAD] Serving from in-memory fileBuffer, length:', item.fileBuffer.length);
      res.setHeader('Content-Type', item.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${safeEncodedName}`);
      res.setHeader('Content-Length', String(item.fileBuffer.length));
      return res.send(item.fileBuffer);
    } else if (item.fileBase64) {
      console.log('[DOWNLOAD] Serving from fileBase64');
      const buf = Buffer.from(item.fileBase64, 'base64');
      res.setHeader('Content-Type', item.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${safeEncodedName}`);
      res.setHeader('Content-Length', String(buf.length));
      return res.send(buf);
    } else if (item.textContent) {
      console.log('[DOWNLOAD] Serving from textContent');
      const textBuf = Buffer.from(item.textContent, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiName}.txt"; filename*=UTF-8''${safeEncodedName}.txt`);
      res.setHeader('Content-Length', String(textBuf.length));
      return res.send(textBuf);
    } else {
      console.error('[DOWNLOAD] No localFilePath, buffer, base64, or text available for item:', item.id);
      return res.status(404).json({ error: 'File data not found on server', id: item.id });
    }
  } catch (error: any) {
    console.error("================================");
    console.error("[DOWNLOAD FATAL ERROR]");
    console.error(error);
    console.error(error?.stack);
    console.error("================================");

    if (!res.headersSent) {
      return res.status(500).json({
        error: "Download failed",
        debug: String(error?.stack || error?.message || error),
      });
    }

    return res.destroy(error);
  }
});

// 4. DELETE / BURN CLIPBOARD
router.delete('/clipboard/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code?.trim();
    if (!code || !/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Invalid code format' });
    }

    await storage.deleteItem(code);
    return res.json({ success: true, message: 'Clipboard destroyed successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete clipboard' });
  }
});

// 5. SUPABASE SCHEMA ENDPOINT
router.get('/supabase-schema', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  return res.send(SUPABASE_SQL_SCHEMA);
});

// 6. HEALTH & STATS
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'CloudClip',
    version: '1.0.0',
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    stats: storage.getStats(),
  });
});

export default router;
