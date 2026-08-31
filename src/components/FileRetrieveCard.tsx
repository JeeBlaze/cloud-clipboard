import React, { useState, useEffect } from 'react';
import { Download, ArrowLeft, Clock, File, Image as ImageIcon, FileText, Archive, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { formatBytes, formatTimeRemaining, getFileCategoryIcon } from '../lib/utils';
import { ContentType } from '../types';

interface FileRetrieveCardProps {
  code: string;
  contentType: ContentType;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  downloadUrl: string;
  fileData?: string; // Data URL for direct image preview
  expiresInSeconds: number;
  onReset: () => void;
}

export const FileRetrieveCard: React.FC<FileRetrieveCardProps> = ({
  code,
  contentType,
  fileName = 'downloaded-file',
  fileSize,
  mimeType,
  downloadUrl,
  fileData,
  expiresInSeconds,
  onReset,
}) => {
  const [timeLeft, setTimeLeft] = useState(expiresInSeconds);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    setTimeLeft(expiresInSeconds);
  }, [expiresInSeconds]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const isImage = contentType === 'image' || mimeType?.startsWith('image/');
  const fileCategory = getFileCategoryIcon(mimeType, fileName);

  const handleDownload = async () => {
    console.count("[DOWNLOAD BUTTON CLICK]");
    if (downloading) return;
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadSuccess(false);
    setDownloadError(null);

    try {
      // 1. Direct preview Data URI check for small inline images
      if (fileData && fileData.startsWith('data:')) {
        console.log('[REAL DOWNLOAD] Serving from inline data URI');
        const link = document.createElement('a');
        link.href = fileData;
        link.download = fileName || 'downloaded-file';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadSuccess(true);
        setDownloading(false);
        setTimeout(() => setDownloadSuccess(false), 3000);
        return;
      }

      // 2. Fetch the binary stream from server
      const targetUrl = downloadUrl || `/api/clipboard/${code}/download`;
      console.count("[DOWNLOAD FETCH REQUEST]");
      console.log("[REAL DOWNLOAD URL]", targetUrl);
      console.log("[REAL DOWNLOAD METHOD]", "GET");
      console.log("[REAL DOWNLOAD CODE]", code);
      console.log("[REAL DOWNLOAD FILE NAME]", fileName);
      console.log("[REAL DOWNLOAD FILE SIZE]", fileSize);
      console.log("[REAL DOWNLOAD MIME]", mimeType);

      const response = await fetch(targetUrl, {
        method: 'GET',
      });

      console.log(
        "[DOWNLOAD RESPONSE]",
        response.status,
        response.headers.get("content-type"),
        response.headers.get("content-length")
      );

      if (!response.ok) {
        let serverErrorText = '';
        try {
          serverErrorText = await response.text();
        } catch {
          // ignore
        }
        console.error("[DOWNLOAD ERROR BODY]", response.status, serverErrorText);

        let parsedError = '';
        try {
          const jsonErr = JSON.parse(serverErrorText);
          parsedError = jsonErr.error || jsonErr.debug || '';
        } catch {
          parsedError = serverErrorText;
        }

        throw new Error(parsedError || `Download failed with status ${response.status}`);
      }

      const contentLengthHeader = response.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : fileSize || 0;

      let blob: Blob;
      if (response.body && totalBytes > 0) {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            receivedBytes += value.length;
            if (totalBytes > 0) {
              const percent = Math.min(Math.round((receivedBytes / totalBytes) * 100), 99);
              setDownloadProgress(percent);
            }
          }
        }

        const effectiveMime = mimeType || response.headers.get('content-type') || 'application/octet-stream';
        blob = new Blob(chunks, { type: effectiveMime });
      } else {
        blob = await response.blob();
      }

      console.log("[DOWNLOAD BLOB SIZE]", blob.size);

      if (blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      setDownloadProgress(100);

      // 3. Initiate browser download via temporary anchor element (no page navigation)
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "downloaded-file";
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);

      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
        setDownloadProgress(null);
      }, 3500);
    } catch (err: any) {
      console.error('[CloudClip Download Error]', err);
      setDownloadError(err.message || 'Download failed. Please check your connection and try again.');
    } finally {
      setDownloading(false);
    }
  };

  const renderFileIcon = () => {
    switch (fileCategory) {
      case 'image':
        return <ImageIcon className="w-10 h-10 text-indigo-500" />;
      case 'pdf':
      case 'doc':
      case 'sheet':
        return <FileText className="w-10 h-10 text-rose-500" />;
      case 'archive':
        return <Archive className="w-10 h-10 text-amber-500" />;
      default:
        return <File className="w-10 h-10 text-blue-500" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/95 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            {renderFileIcon()}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {isImage ? 'Image Retrieved' : 'File Retrieved'}
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Code: <span className="font-bold text-indigo-600">{code}</span>
            </p>
          </div>
        </div>

        {/* Expiry badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{timeLeft > 0 ? `Expires in ${formatTimeRemaining(timeLeft)}` : 'Expired'}</span>
        </div>
      </div>

      {/* Main File / Image Preview Container */}
      <div className="my-6">
        {isImage && fileData ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-900/5 overflow-hidden flex items-center justify-center max-h-[360px] p-2">
              <img
                src={fileData}
                alt={fileName}
                className="max-h-[340px] w-auto max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              <span className="font-medium text-slate-800 truncate max-w-[240px] sm:max-w-md">
                {fileName}
              </span>
              <span className="font-mono font-semibold">{formatBytes(fileSize)}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col sm:flex-row items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
              {renderFileIcon()}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left space-y-1">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 break-all leading-snug">
                {fileName}
              </h3>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                  {formatBytes(fileSize)}
                </span>
                <span>•</span>
                <span className="uppercase font-medium text-slate-600">
                  {mimeType || fileName.split('.').pop() || 'FILE'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-2 space-y-3">
        {/* Error Notification */}
        {downloadError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start justify-between gap-2.5 animate-in fade-in">
            <div className="flex items-start gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="break-words">{downloadError}</span>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Progress bar during download */}
        {downloading && downloadProgress !== null && (
          <div className="space-y-1.5 animate-in fade-in">
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Downloading {fileName}...</span>
              <span className="font-mono font-bold text-indigo-600">{downloadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-150 rounded-full"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          id="btn-download-retrieved-file"
          onClick={handleDownload}
          disabled={downloading}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-base text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            downloadSuccess
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/80'
              : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 shadow-indigo-200/80'
          }`}
        >
          {downloading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>
                {downloadProgress !== null ? `Downloading (${downloadProgress}%)...` : 'Downloading...'}
              </span>
            </>
          ) : downloadSuccess ? (
            <>
              <Check className="w-5 h-5" />
              <span>Download Complete</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>{isImage ? 'Download Image' : 'Download File'}</span>
            </>
          )}
        </button>
      </div>

      {/* Footer Back action */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <button
          id="btn-retrieve-another-file"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 py-1.5 px-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retrieve Another Code
        </button>

        <div className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
          <CheckCircle2 className="w-3 h-3" />
          Safe & Virus Scanned
        </div>
      </div>
    </div>
  );
};
