import React, { useState, useRef } from 'react';
import { UploadCloud, File, Image as ImageIcon, FileText, Archive, X, Send, AlertCircle, Flame, Check, RefreshCw } from 'lucide-react';
import { formatBytes, getFileCategoryIcon } from '../lib/utils';
import { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from '../lib/constants';

interface FileSendFormProps {
  onSubmit: (file: File, expiryMinutes: number, burnOnRead: boolean) => Promise<void>;
  isLoading: boolean;
  uploadProgress?: number | null;
}

export const FileSendForm: React.FC<FileSendFormProps> = ({ onSubmit, isLoading, uploadProgress }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(10);
  const [burnOnRead, setBurnOnRead] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);

    // Validate size (single source of truth MAX_FILE_SIZE_MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (file.size === 0) {
      setErrorMessage('File cannot be empty.');
      return;
    }

    setSelectedFile(file);

    // Generate preview for small images (< 10MB)
    if (file.type.startsWith('image/') && file.size < 10 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select or drop a file to upload.');
      return;
    }

    try {
      await onSubmit(selectedFile, expiryMinutes, burnOnRead);
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed. Please try again.');
    }
  };

  const renderFileIcon = () => {
    if (!selectedFile) return null;
    const cat = getFileCategoryIcon(selectedFile.type, selectedFile.name);
    switch (cat) {
      case 'image':
        return <ImageIcon className="w-8 h-8 text-indigo-500" />;
      case 'pdf':
      case 'doc':
      case 'sheet':
        return <FileText className="w-8 h-8 text-rose-500" />;
      case 'archive':
        return <Archive className="w-8 h-8 text-amber-500" />;
      default:
        return <File className="w-8 h-8 text-blue-500" />;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        id="file-upload-input"
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
          }
        }}
        disabled={isLoading}
      />

      {/* Drag & Drop Zone or Selected File Preview */}
      {!selectedFile ? (
        <div
          id="dropzone-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
            isDragOver
              ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
              : 'border-slate-200 hover:border-indigo-400 bg-white hover:bg-slate-50/50 shadow-xs'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3.5 shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>
          <p className="text-base font-semibold text-slate-900 mb-1">
            Drop a file here or <span className="text-indigo-600 underline font-bold">click to browse</span>
          </p>
          <p className="text-xs text-slate-500 max-w-sm mb-3">
            Images (PNG, JPG, WEBP, GIF), Documents (PDF, TXT, DOCX, CSV, XLSX), Archives (ZIP).
          </p>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Max file size: {MAX_FILE_SIZE_MB} MB
          </span>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {previewUrl ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                  <img
                    src={previewUrl}
                    alt={selectedFile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                  {renderFileIcon()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm sm:text-base text-slate-900 truncate">
                  {selectedFile.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="font-mono">{formatBytes(selectedFile.size)}</span>
                  <span>•</span>
                  <span className="uppercase">{selectedFile.type.split('/')[1] || 'FILE'}</span>
                </div>
                <div className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 mt-1.5">
                  <Check className="w-3 h-3" />
                  Ready to upload ({formatBytes(selectedFile.size)})
                </div>
              </div>
            </div>

            <button
              type="button"
              id="btn-remove-selected-file"
              onClick={handleClearFile}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Upload Progress Bar */}
          {isLoading && typeof uploadProgress === 'number' && (
            <div className="pt-2 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5 text-indigo-600">
                  <UploadCloud className="w-3.5 h-3.5 animate-bounce" />
                  Uploading...
                </span>
                <span className="font-mono text-indigo-600 font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/60">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2.5 rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${Math.max(uploadProgress, 2)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expiration and Options Panel */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <span>Expires in:</span>
            <span className="font-normal text-slate-500">(Auto-purged after time)</span>
          </label>
          <div className="flex items-center gap-1.5">
            {[5, 10, 30, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                id={`file-expiry-btn-${mins}`}
                onClick={() => setExpiryMinutes(mins)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  expiryMinutes === mins
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {mins === 60 ? '1 hour' : `${mins} min`}
              </button>
            ))}
          </div>
        </div>

        {/* Burn on Read Option */}
        <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
          <label
            htmlFor="burn-toggle-file"
            className="text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Burn on download</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (Delete immediately after 1st retrieval)
            </span>
          </label>
          <input
            id="burn-toggle-file"
            type="checkbox"
            checked={burnOnRead}
            onChange={(e) => setBurnOnRead(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Error Message & Retry */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="break-words">{errorMessage}</span>
          </div>
          {selectedFile && !isLoading && (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        id="btn-create-file-clipboard"
        disabled={isLoading || !selectedFile}
        className="w-full py-3.5 px-6 rounded-xl font-bold text-base text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200/80 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>
              {typeof uploadProgress === 'number'
                ? `Uploading (${uploadProgress}%)...`
                : 'Uploading & Encrypting...'}
            </span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Create Clipboard</span>
          </>
        )}
      </button>
    </form>
  );
};
