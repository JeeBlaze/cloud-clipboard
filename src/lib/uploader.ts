import { CreateClipboardResponse } from '../types';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from './constants';

export interface UploadProgressCallback {
  (progressPercent: number, uploadedBytes: number, totalBytes: number): void;
}

export interface UploadOptions {
  file: File;
  expiryMinutes: number;
  burnOnRead: boolean;
  onProgress?: UploadProgressCallback;
}

/**
 * Safely parses server response, handling JSON, HTML error pages, and network failures.
 */
async function parseServerResponse<T = any>(res: Response, fallbackMessage: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      try {
        const json = await res.json();
        throw new Error(json.error || json.message || `Upload failed (${res.status})`);
      } catch (e: any) {
        if (e.message && !e.message.includes('JSON')) throw e;
      }
    }

    const text = await res.text().catch(() => '');
    if (res.status === 413) {
      throw new Error(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
    }
    if (res.status === 429) {
      throw new Error('Too many requests. Please wait a few moments and try again.');
    }
    if (res.status >= 500) {
      throw new Error('Server error during upload. Please try again in a moment.');
    }

    // Try extracting simple error if html
    if (text.includes('Request Entity Too Large')) {
      throw new Error(`File exceeds the ${MAX_FILE_SIZE_MB} MB limit.`);
    }

    throw new Error(fallbackMessage || `Upload failed with status ${res.status}`);
  }

  if (!isJson) {
    const text = await res.text().catch(() => '');
    console.warn('[Uploader] Non-JSON server response:', text);
    throw new Error('Unexpected response format from server. Please try again.');
  }

  try {
    return await res.json();
  } catch (err) {
    console.error('[Uploader] JSON parse error on ok response:', err);
    throw new Error('Failed to process server confirmation. Please try again.');
  }
}

/**
 * Uploads a file using chunked streaming (5MB chunks) to support files up to 300MB
 * without proxy payload limitations or server memory bloat.
 */
export async function uploadFileToClipboard(options: UploadOptions): Promise<CreateClipboardResponse['item']> {
  const { file, expiryMinutes, burnOnRead, onProgress } = options;

  // 1. Client-side strict size validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File is too large (${sizeMb} MB). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
  }

  if (file.size === 0) {
    throw new Error('Cannot upload an empty file.');
  }

  const isImage = file.type.startsWith('image/');
  const contentType = isImage ? 'image' : 'file';

  // 2. Initialize upload session
  let initRes: Response;
  try {
    initRes = await fetch('/api/upload/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        contentType,
        expiryMinutes,
        burnOnRead,
      }),
    });
  } catch (netErr) {
    console.error('[Uploader] Network error on init:', netErr);
    throw new Error('Network connection interrupted. Please check your connection and try again.');
  }

  const initData = await parseServerResponse<{
    success: boolean;
    uploadId: string;
    chunkSize: number;
    totalChunks: number;
  }>(initRes, 'Failed to initialize upload session.');

  const { uploadId, chunkSize = 5 * 1024 * 1024, totalChunks = 1 } = initData;

  // 3. Upload chunks in sequence with progress reporting and automatic retries
  let totalUploadedBytes = 0;
  onProgress?.(0, 0, file.size);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunkBlob = file.slice(start, end);
    const chunkBytes = end - start;

    // Retry loop for each chunk (up to 3 attempts)
    let chunkSuccess = false;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('chunk', chunkBlob, `chunk-${chunkIndex}.bin`);

        const chunkRes = await fetch('/api/upload/chunk', {
          method: 'POST',
          body: formData,
        });

        await parseServerResponse<{ success: boolean }>(chunkRes, `Failed to upload chunk ${chunkIndex + 1}/${totalChunks}`);

        chunkSuccess = true;
        totalUploadedBytes += chunkBytes;
        const percent = Math.min(Math.round((totalUploadedBytes / file.size) * 100), 99);
        onProgress?.(percent, totalUploadedBytes, file.size);
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Uploader] Chunk ${chunkIndex} attempt ${attempt} failed:`, err);
        // Wait 500ms before retrying
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }

    if (!chunkSuccess) {
      throw lastError || new Error(`Upload failed at chunk ${chunkIndex + 1} of ${totalChunks}. Please try again.`);
    }
  }

  // 4. Finalize upload
  let finalizeRes: Response;
  try {
    finalizeRes = await fetch('/api/upload/finalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uploadId }),
    });
  } catch (finalizeNetErr) {
    console.error('[Uploader] Network error on finalize:', finalizeNetErr);
    throw new Error('Network interrupted while finalizing clipboard. Please try again.');
  }

  const finalizeData = await parseServerResponse<CreateClipboardResponse>(
    finalizeRes,
    'Failed to finalize clipboard creation.'
  );

  onProgress?.(100, file.size, file.size);
  return finalizeData.item;
}
