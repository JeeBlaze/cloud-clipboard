export type ContentType = 'text' | 'image' | 'file';

export interface ClipboardItem {
  id: string;
  code: string;
  contentType: ContentType;
  textContent?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  filePath?: string;
  fileData?: string; // Base64 representation for direct storage/preview
  createdAt: string;
  expiresAt: string;
  burnOnRead?: boolean;
}

export interface CreateClipboardRequest {
  contentType: ContentType;
  textContent?: string;
  fileData?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  expiryMinutes?: number;
  burnOnRead?: boolean;
}

export interface CreateClipboardResponse {
  success: boolean;
  item: {
    id: string;
    code: string;
    contentType: ContentType;
    createdAt: string;
    expiresAt: string;
    expiresInSeconds: number;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };
  message?: string;
}

export interface RetrieveClipboardResponse {
  success: boolean;
  item?: {
    id: string;
    code: string;
    contentType: ContentType;
    textContent?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    downloadUrl: string;
    fileData?: string;
    createdAt: string;
    expiresAt: string;
    expiresInSeconds: number;
  };
  error?: string;
  errorCode?: 'NOT_FOUND' | 'EXPIRED' | 'RATE_LIMITED' | 'INVALID_CODE' | 'SERVER_ERROR';
}

export type ViewTab = 'home' | 'send' | 'retrieve' | 'how-it-works' | 'privacy' | 'terms';
