import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, ArrowLeft, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { copyToClipboard, downloadTextAsFile, formatTimeRemaining } from '../lib/utils';

interface TextRetrieveCardProps {
  textContent: string;
  code: string;
  expiresInSeconds: number;
  onReset: () => void;
}

export const TextRetrieveCard: React.FC<TextRetrieveCardProps> = ({
  textContent,
  code,
  expiresInSeconds,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expiresInSeconds);

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

  const handleCopy = async () => {
    const ok = await copyToClipboard(textContent);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    downloadTextAsFile(textContent, `cloudclip-${code}.txt`);
  };

  const charCount = textContent.length;
  const lineCount = textContent.split('\n').length;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white/95 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              Clipboard Content
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Code: <span className="font-bold text-indigo-600">{code}</span>
            </p>
          </div>
        </div>

        {/* Expiry pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{timeLeft > 0 ? `Expires in ${formatTimeRemaining(timeLeft)}` : 'Expired'}</span>
        </div>
      </div>

      {/* Main Text Content Box */}
      <div className="my-5 relative group">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 max-h-[380px] overflow-y-auto font-mono text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-words select-text">
          {textContent}
        </div>

        {/* Quick stats */}
        <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
          <span>{charCount.toLocaleString()} characters • {lineCount} lines</span>
          <span>Text Transfer</span>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          id="btn-copy-retrieved-text"
          onClick={handleCopy}
          className={`py-3.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/80 active:scale-95 transition-all duration-150 cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Text</span>
            </>
          )}
        </button>

        <button
          id="btn-download-txt"
          onClick={handleDownload}
          className="py-3.5 px-5 rounded-xl font-semibold text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm active:scale-95 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Download as TXT</span>
        </button>
      </div>

      {/* Footer Back action */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <button
          id="btn-retrieve-another"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 py-1.5 px-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retrieve Another Code
        </button>

        <div className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
          <CheckCircle2 className="w-3 h-3" />
          Verified Integrity
        </div>
      </div>
    </div>
  );
};
