import React, { useState, useEffect } from 'react';
import { Copy, Check, Plus, Clock, ShieldAlert, Share2, ArrowRight, Laptop, Smartphone, Trash2 } from 'lucide-react';
import { copyToClipboard, formatTimeRemaining } from '../lib/utils';
import { apiUrl } from '../lib/api';
import { ContentType } from '../types';

interface CodeDisplayProps {
  code: string;
  contentType: ContentType;
  expiresInSeconds: number;
  fileName?: string;
  fileSize?: number;
  onCreateAnother: () => void;
  onBurnNow?: () => void;
}

export const CodeDisplay: React.FC<CodeDisplayProps> = ({
  code,
  contentType,
  expiresInSeconds,
  fileName,
  fileSize,
  onCreateAnother,
  onBurnNow,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expiresInSeconds);
  const [burning, setBurning] = useState(false);

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

  const handleCopyCode = async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/?code=${code}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleBurn = async () => {
    if (confirm('Are you sure you want to permanently delete this clipboard right now?')) {
      setBurning(true);
      try {
        await fetch(apiUrl(`/api/clipboard/${code}`), { method: 'DELETE' });
        onBurnNow ? onBurnNow() : onCreateAnother();
      } catch (err) {
        onCreateAnother();
      } finally {
        setBurning(false);
      }
    }
  };

  const isExpired = timeLeft <= 0;
  const totalDuration = expiresInSeconds || 600;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100));

  return (
    <div className="glass-panel modal-enter w-full max-w-xl mx-auto rounded-2xl p-6 sm:p-8">
      {/* Header */}
      <div className="text-center space-y-1.5 pb-5 border-b border-slate-100">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Ready to Transfer
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Your clipboard is ready
        </h2>
        <p className="text-sm text-slate-500">
          Open CloudClip on your other device and enter this code.
        </p>
      </div>

      {/* Code Box Display */}
      <div className="my-6">
        <div className="glass-subpanel rounded-2xl p-5 sm:p-6 text-center relative overflow-hidden">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
            6-Digit Access Code
          </p>

          <div className="flex items-center justify-center gap-2 sm:gap-3 my-3 select-all">
            {code.split('').map((digit, i) => (
              <span
                key={i}
                className="w-10 h-14 sm:w-14 sm:h-16 flex items-center justify-center text-3xl sm:text-4xl font-mono font-extrabold text-slate-900 bg-white rounded-xl border-2 border-slate-200 shadow-xs"
              >
                {digit}
              </span>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
            <button
              id="btn-copy-code"
              onClick={handleCopyCode}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'glass-button-primary text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Code Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              id="btn-copy-link"
              onClick={handleCopyLink}
              className="glass-button-secondary inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-700 cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-slate-500" />
                  <span>Copy Direct Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Countdown and Expiration notice */}
      <div className="glass-subpanel rounded-xl p-4 mb-6 space-y-2">
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
          <span className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-4 h-4 text-indigo-600" />
            {isExpired ? 'Clipboard has expired' : 'Automatic Expiration'}
          </span>
          <span
            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
              isExpired
                ? 'bg-rose-100 text-rose-700'
                : timeLeft < 120
                ? 'bg-amber-100 text-amber-800 animate-pulse'
                : 'bg-indigo-50 text-indigo-700'
            }`}
          >
            {isExpired ? 'Expired' : `Expires in ${formatTimeRemaining(timeLeft)}`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              timeLeft < 120 ? 'bg-amber-500' : 'bg-indigo-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        <p className="text-xs text-slate-400 pt-0.5">
          Once expired, all data is automatically purged from memory and storage.
        </p>
      </div>

      {/* Cross-device mini guide */}
      <div className="border border-slate-200/80 rounded-xl p-3.5 bg-slate-50/60 flex items-center justify-between gap-3 text-xs text-slate-600 mb-6">
        <div className="flex items-center gap-2">
          <Laptop className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-800">Device A</span>
          <span className="text-slate-400">Created</span>
        </div>
        <ArrowRight className="w-4 h-4 text-indigo-400" />
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-800">Device B</span>
          <span className="text-slate-400">Enter code {code}</span>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <button
          id="btn-create-another"
          onClick={onCreateAnother}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 py-2 px-3 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Another
        </button>

        <button
          id="btn-burn-now"
          onClick={handleBurn}
          disabled={burning}
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 py-2 px-2.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
          title="Shred this clipboard immediately"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {burning ? 'Deleting...' : 'Delete Now'}
        </button>
      </div>
    </div>
  );
};
