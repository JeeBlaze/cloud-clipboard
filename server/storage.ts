import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface StoredClipboard {
  id: string;
  code: string;
  contentType: 'text' | 'image' | 'file';
  textContent?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  localFilePath?: string;
  fileBuffer?: Buffer;
  fileBase64?: string;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
  burnOnRead?: boolean;
}

export interface UploadSession {
  uploadId: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  contentType: 'text' | 'image' | 'file';
  expiryMinutes: number;
  burnOnRead: boolean;
  tempFilePath: string;
  totalChunks: number;
  receivedChunks: Set<number>;
  totalBytesReceived: number;
  createdAt: number;
}

class ClipboardStorage {
  private inMemoryStore: Map<string, StoredClipboard> = new Map();
  private codeIndex: Map<string, string> = new Map(); // code -> id
  private uploadSessions: Map<string, UploadSession> = new Map();
  private supabase: SupabaseClient | null = null;
  private rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map();
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(os.tmpdir(), 'cloudclip_files');
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[Storage] Notice creating upload directory:', err);
    }

    // Rehydrate any active metadata from disk
    this.rehydrateFromDisk();

    this.initSupabase();
    // Run cleanup every 20 seconds
    setInterval(() => this.cleanupExpired(), 20000);
  }

  private rehydrateFromDisk(): void {
    try {
      if (!fs.existsSync(this.uploadDir)) return;
      const files = fs.readdirSync(this.uploadDir);
      const now = Date.now();
      let restored = 0;

      for (const file of files) {
        if (file.startsWith('meta-') && file.endsWith('.json')) {
          try {
            const metaPath = path.join(this.uploadDir, file);
            const content = fs.readFileSync(metaPath, 'utf8');
            const item: StoredClipboard = JSON.parse(content);

            if (item && item.code && item.id && now <= item.expiresAt) {
              this.inMemoryStore.set(item.id, item);
              this.codeIndex.set(item.code, item.id);
              restored++;
            } else if (item && now > item.expiresAt) {
              // Expired on disk, cleanup
              try { fs.unlinkSync(metaPath); } catch {}
              if (item.localFilePath) {
                try { if (fs.existsSync(item.localFilePath)) fs.unlinkSync(item.localFilePath); } catch {}
              }
            }
          } catch (e) {
            // Ignore malformed meta file
          }
        }
      }
      if (restored > 0) {
        console.log(`[Storage] Rehydrated ${restored} active clipboards from persistent temp storage.`);
      }
    } catch (err) {
      console.warn('[Storage] Rehydration notice:', err);
    }
  }

  private persistMetaToDisk(item: StoredClipboard): void {
    try {
      const metaPath = path.join(this.getUploadDir(), `meta-${item.code}.json`);
      // Exclude large buffers from the JSON descriptor
      const jsonItem = { ...item, fileBuffer: undefined };
      fs.writeFileSync(metaPath, JSON.stringify(jsonItem, null, 2), 'utf8');
    } catch (e) {
      console.warn('[Storage] Error persisting metadata to disk:', e);
    }
  }

  public getUploadDir(): string {
    if (!fs.existsSync(this.uploadDir)) {
      try {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      } catch (e) {
        // ignore
      }
    }
    return this.uploadDir;
  }

  public getSupabase(): SupabaseClient | null {
    return this.supabase;
  }

  private initSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        this.supabase = createClient(url, key);
        console.log('[Storage] Supabase client initialized for direct cloud storage');
      } catch (err) {
        console.error('[Storage] Failed to initialize Supabase client:', err);
      }
    } else {
      console.log('[Storage] Using built-in high-performance ephemeral disk & chunked storage');
    }
  }

  // Rate Limiting helper
  public checkRateLimit(ip: string, limit: number = 30, windowMs: number = 10 * 60 * 1000): boolean {
    const now = Date.now();
    const record = this.rateLimitMap.get(ip);

    if (!record || now > record.resetAt) {
      this.rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (record.count >= limit) {
      return false;
    }

    record.count += 1;
    return true;
  }

  // Generate a random unique 6-digit numeric code
  public generateUniqueCode(): string {
    let attempts = 0;
    while (attempts < 100) {
      // 100000 - 999999
      const num = Math.floor(100000 + Math.random() * 900000);
      const code = num.toString();
      
      // Check if code is currently active in memory
      if (!this.codeIndex.has(code)) {
        return code;
      }
      attempts++;
    }
    // Fallback if dense
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ==========================================
  // CHUNKED UPLOAD PIPELINE (Up to 300 MB)
  // ==========================================

  public createUploadSession(data: {
    fileName: string;
    fileSize: number;
    mimeType?: string;
    contentType?: 'text' | 'image' | 'file';
    expiryMinutes?: number;
    burnOnRead?: boolean;
    chunkSize?: number;
  }): { uploadId: string; chunkSize: number; totalChunks: number } {
    const uploadId = randomUUID();
    const chunkSize = data.chunkSize || 5 * 1024 * 1024; // 5 MB per chunk
    const totalChunks = Math.max(1, Math.ceil(data.fileSize / chunkSize));
    const tempFilePath = path.join(this.getUploadDir(), `upload-${uploadId}.tmp`);

    // Ensure empty file created
    try {
      fs.writeFileSync(tempFilePath, Buffer.alloc(0));
    } catch (e) {
      console.error('[Storage] Error initializing temp upload file:', e);
    }

    const session: UploadSession = {
      uploadId,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType || 'application/octet-stream',
      contentType: data.contentType || (data.mimeType?.startsWith('image/') ? 'image' : 'file'),
      expiryMinutes: Math.min(Math.max(data.expiryMinutes || 10, 1), 60),
      burnOnRead: Boolean(data.burnOnRead),
      tempFilePath,
      totalChunks,
      receivedChunks: new Set(),
      totalBytesReceived: 0,
      createdAt: Date.now(),
    };

    this.uploadSessions.set(uploadId, session);
    return { uploadId, chunkSize, totalChunks };
  }

  public async appendChunk(
    uploadId: string,
    chunkIndex: number,
    chunkBuffer: Buffer
  ): Promise<{ success: boolean; bytesReceived: number; totalBytes: number }> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session expired or invalid. Please start a new upload.');
    }

    // Write chunk at specific position: chunkIndex * 5MB
    const chunkSize = 5 * 1024 * 1024;
    const offset = chunkIndex * chunkSize;

    await new Promise<void>((resolve, reject) => {
      fs.open(session.tempFilePath, 'r+', (openErr, fd) => {
        if (openErr) {
          // If file doesn't exist for r+, open with w+
          fs.open(session.tempFilePath, 'w+', (wErr, wFd) => {
            if (wErr) return reject(wErr);
            fs.write(wFd, chunkBuffer, 0, chunkBuffer.length, offset, (writeErr) => {
              fs.close(wFd, () => {});
              if (writeErr) return reject(writeErr);
              resolve();
            });
          });
          return;
        }

        fs.write(fd, chunkBuffer, 0, chunkBuffer.length, offset, (writeErr) => {
          fs.close(fd, () => {});
          if (writeErr) return reject(writeErr);
          resolve();
        });
      });
    });

    session.receivedChunks.add(chunkIndex);
    session.totalBytesReceived += chunkBuffer.length;

    return {
      success: true,
      bytesReceived: session.totalBytesReceived,
      totalBytes: session.fileSize,
    };
  }

  public async finalizeUploadSession(uploadId: string): Promise<StoredClipboard> {
    const session = this.uploadSessions.get(uploadId);
    if (!session) {
      throw new Error('Upload session not found or expired');
    }

    if (!fs.existsSync(session.tempFilePath)) {
      throw new Error('Uploaded file data is missing on server');
    }

    const stats = fs.statSync(session.tempFilePath);
    const finalSize = stats.size;

    const safeExt = path.extname(session.fileName);
    const uniqueName = `clip-${Date.now()}-${randomUUID().slice(0, 8)}${safeExt}`;
    const finalizedPath = path.join(this.getUploadDir(), uniqueName);

    // Rename temp file to finalized path
    fs.renameSync(session.tempFilePath, finalizedPath);

    // Clean session
    this.uploadSessions.delete(uploadId);

    // Create item
    const item = await this.createItem({
      contentType: session.contentType,
      fileName: session.fileName,
      fileSize: finalSize,
      mimeType: session.mimeType,
      localFilePath: finalizedPath,
      expiryMinutes: session.expiryMinutes,
      burnOnRead: session.burnOnRead,
    });

    return item;
  }

  // Create a clipboard item
  public async createItem(data: {
    contentType: 'text' | 'image' | 'file';
    textContent?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    localFilePath?: string;
    fileBuffer?: Buffer;
    expiryMinutes?: number;
    burnOnRead?: boolean;
  }): Promise<StoredClipboard> {
    const id = randomUUID();
    const code = this.generateUniqueCode();
    const now = Date.now();
    const expiryMinutes = Math.min(Math.max(data.expiryMinutes || 10, 1), 60); // 1 to 60 minutes
    const expiresAt = now + expiryMinutes * 60 * 1000;

    let fileBase64: string | undefined;
    // Only generate base64 inline preview for small images (< 5MB) to keep memory lightweight
    if (data.contentType === 'image' && data.fileSize && data.fileSize <= 5 * 1024 * 1024) {
      if (data.fileBuffer) {
        fileBase64 = data.fileBuffer.toString('base64');
      } else if (data.localFilePath && fs.existsSync(data.localFilePath)) {
        try {
          const buf = fs.readFileSync(data.localFilePath);
          fileBase64 = buf.toString('base64');
        } catch (e) {
          // ignore
        }
      }
    }

    const item: StoredClipboard = {
      id,
      code,
      contentType: data.contentType,
      textContent: data.textContent,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      localFilePath: data.localFilePath,
      fileBuffer: data.fileBuffer,
      fileBase64,
      createdAt: now,
      expiresAt,
      burnOnRead: data.burnOnRead || false,
    };

    // Store in local memory map
    this.inMemoryStore.set(id, item);
    this.codeIndex.set(code, id);

    // Persist metadata to disk for resilience across restarts
    this.persistMetaToDisk(item);

    // If Supabase is configured, sync metadata to Supabase in background
    if (this.supabase) {
      (async () => {
        try {
          let filePath = '';
          if (data.fileName && (data.localFilePath || data.fileBuffer)) {
            filePath = `${code}_${data.fileName}`;
            if (data.fileBuffer) {
              await this.supabase?.storage.from('clipboard-files').upload(filePath, data.fileBuffer, {
                contentType: data.mimeType || 'application/octet-stream',
                upsert: true,
              });
            } else if (data.localFilePath && fs.existsSync(data.localFilePath)) {
              const stream = fs.createReadStream(data.localFilePath);
              stream.on('error', (e) => console.warn('[Storage] Supabase sync stream error (ignored):', e));
              await this.supabase?.storage.from('clipboard-files').upload(filePath, stream, {
                contentType: data.mimeType || 'application/octet-stream',
                upsert: true,
              });
            }
          }

          await this.supabase?.from('clipboard_items').insert({
            id,
            code,
            content_type: data.contentType,
            text_content: data.textContent,
            file_path: filePath || null,
            file_name: data.fileName || null,
            file_size: data.fileSize || null,
            mime_type: data.mimeType || null,
            burn_on_read: data.burnOnRead || false,
            created_at: new Date(now).toISOString(),
            expires_at: new Date(expiresAt).toISOString(),
          });
        } catch (err) {
          console.warn('[Storage] Supabase sync notice (app continues normally):', err);
        }
      })().catch(() => {});
    }

    return item;
  }

  // Retrieve a clipboard item by 6-digit code
  public async getItemByCode(code: string): Promise<StoredClipboard | null> {
    const cleanCode = code.trim();
    const now = Date.now();

    // 1. Check local memory first
    const id = this.codeIndex.get(cleanCode);
    if (id) {
      const item = this.inMemoryStore.get(id);
      if (item) {
        if (now > item.expiresAt) {
          // Expired
          await this.deleteItem(cleanCode);
          return null;
        }

        // Only burn text immediately on retrieve. Files/images must burn after download completion.
        if (item.burnOnRead && item.contentType === 'text') {
          await this.deleteItem(cleanCode);
        }

        return item;
      }
    }

    // 2. Check disk persistent cache
    try {
      const metaPath = path.join(this.getUploadDir(), `meta-${cleanCode}.json`);
      if (fs.existsSync(metaPath)) {
        const content = fs.readFileSync(metaPath, 'utf8');
        const diskItem: StoredClipboard = JSON.parse(content);
        if (diskItem && now <= diskItem.expiresAt) {
          this.inMemoryStore.set(diskItem.id, diskItem);
          this.codeIndex.set(diskItem.code, diskItem.id);

          if (diskItem.burnOnRead && diskItem.contentType === 'text') {
            await this.deleteItem(cleanCode);
          }
          return diskItem;
        } else if (diskItem && now > diskItem.expiresAt) {
          await this.deleteItem(cleanCode);
          return null;
        }
      }
    } catch (e) {
      console.warn('[Storage] Disk meta read notice:', e);
    }

    // 3. If not in local memory or on disk, check Supabase if available
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('clipboard_items')
          .select('*')
          .eq('code', cleanCode)
          .single();

        if (data && !error) {
          const expiresAt = new Date(data.expires_at).getTime();
          if (now > expiresAt) {
            return null;
          }

          let localFilePath: string | undefined;
          if (data.file_path) {
            const { data: fileData } = await this.supabase.storage
              .from('clipboard-files')
              .download(data.file_path);
            if (fileData) {
              const arrayBuffer = await fileData.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              localFilePath = path.join(this.getUploadDir(), `supa-${cleanCode}-${data.file_name || 'file'}`);
              fs.writeFileSync(localFilePath, buffer);
            }
          }

          const item: StoredClipboard = {
            id: data.id,
            code: data.code,
            contentType: data.content_type,
            textContent: data.text_content,
            fileName: data.file_name,
            fileSize: data.file_size,
            mimeType: data.mime_type,
            localFilePath,
            createdAt: new Date(data.created_at).getTime(),
            expiresAt,
            burnOnRead: data.burn_on_read,
          };

          // Cache in memory and disk for quick subsequent downloads
          this.inMemoryStore.set(item.id, item);
          this.codeIndex.set(item.code, item.id);
          this.persistMetaToDisk(item);

          return item;
        }
      } catch (err) {
        console.warn('[Storage] Supabase fetch notice:', err);
      }
    }

    return null;
  }

  // Delete/burn a clipboard item
  public async deleteItem(code: string): Promise<boolean> {
    const cleanCode = code.trim();
    const id = this.codeIndex.get(cleanCode);
    if (id) {
      const item = this.inMemoryStore.get(id);
      if (item && item.localFilePath) {
        try {
          if (fs.existsSync(item.localFilePath)) {
            fs.unlinkSync(item.localFilePath);
          }
        } catch (e) {
          // ignore
        }
      }
      this.inMemoryStore.delete(id);
      this.codeIndex.delete(cleanCode);
    }

    // Always delete meta from disk
    try {
      const metaPath = path.join(this.getUploadDir(), `meta-${cleanCode}.json`);
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
      }
    } catch (e) {
      // ignore
    }

    if (this.supabase) {
      try {
        await this.supabase.from('clipboard_items').delete().eq('code', cleanCode);
      } catch (err) {
        // silent
      }
    }
    return true;
  }

  // Periodic cleanup
  public cleanupExpired(): void {
    const now = Date.now();
    for (const [id, item] of this.inMemoryStore.entries()) {
      if (now > item.expiresAt) {
        if (item.localFilePath) {
          try {
            if (fs.existsSync(item.localFilePath)) {
              fs.unlinkSync(item.localFilePath);
            }
          } catch (e) {
            // ignore
          }
        }
        this.inMemoryStore.delete(id);
        this.codeIndex.delete(item.code);
        try {
          const metaPath = path.join(this.getUploadDir(), `meta-${item.code}.json`);
          if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
        } catch (e) {}
      }
    }

    // Clean expired upload sessions (> 30 minutes old)
    for (const [uploadId, session] of this.uploadSessions.entries()) {
      if (now - session.createdAt > 30 * 60 * 1000) {
        if (session.tempFilePath && fs.existsSync(session.tempFilePath)) {
          try {
            fs.unlinkSync(session.tempFilePath);
          } catch (e) {
            // ignore
          }
        }
        this.uploadSessions.delete(uploadId);
      }
    }

    // Clean old rate limit entries
    for (const [ip, record] of this.rateLimitMap.entries()) {
      if (now > record.resetAt) {
        this.rateLimitMap.delete(ip);
      }
    }
  }

  public getStats() {
    return {
      activeClipboards: this.inMemoryStore.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

export const storage = new ClipboardStorage();
