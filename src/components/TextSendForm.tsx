import React, { useState } from 'react';
import { ClipboardPaste, Send, Trash2, Flame, AlertCircle, LockKeyhole } from 'lucide-react';

interface TextSendFormProps {
  onSubmit: (textContent: string, expiryMinutes: number, burnOnRead: boolean) => Promise<void>;
  isLoading: boolean;
}

export const TextSendForm: React.FC<TextSendFormProps> = ({ onSubmit, isLoading }) => {
  const [text, setText] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(10);
  const [burnOnRead, setBurnOnRead] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setText((prev) => (prev ? `${prev}\n${clipText}` : clipText));
          setErrorMessage(null);
        }
      } else {
        alert('Please press Ctrl+V or Cmd+V to paste directly into the textarea.');
      }
    } catch (err) {
      console.warn('Clipboard read permission denied or unavailable');
      alert('Could not access clipboard automatically. Please paste using keyboard shortcut (Ctrl+V / Cmd+V).');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmed = text.trim();
    if (!trimmed) {
      setErrorMessage('Please enter or paste some text before creating a clipboard.');
      return;
    }

    if (trimmed.length > 500000) {
      setErrorMessage('Text exceeds maximum limit of 500,000 characters.');
      return;
    }

    try {
      await onSubmit(trimmed, expiryMinutes, burnOnRead);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create clipboard. Please try again.');
    }
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lineCount = text ? text.split('\n').length : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-paste-clipboard"
            onClick={handlePasteClipboard}
            className="glass-button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-lg cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Paste from device
          </button>
        </div>

        {text && (
          <button
            type="button"
            id="btn-clear-text"
            onClick={() => {
              setText('');
              setErrorMessage(null);
            }}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 transition-colors px-2 py-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Main Textarea */}
      <div className="glass-subpanel relative rounded-2xl focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100/70 transition-all overflow-hidden">
        <textarea
          id="text-input-area"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="Paste or type something here (notes, links, code snippets, tokens, passwords)..."
          rows={8}
          disabled={isLoading}
          className="glass-input w-full p-4 text-slate-800 placeholder-slate-400 bg-transparent resize-y min-h-[180px] max-h-[480px] outline-none text-base font-normal leading-relaxed"
        />

        {/* Text stats footer */}
        <div className="bg-slate-50/80 px-4 py-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>{charCount.toLocaleString()} chars</span>
            <span>•</span>
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{lineCount} lines</span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">Max: 500,000 chars</span>
        </div>
      </div>

      {/* Expiration and Options Panel */}
      <div className="glass-subpanel rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <label htmlFor="expiry-select" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <span>Expires in:</span>
            <span className="font-normal text-slate-500">(Auto-purged after time)</span>
          </label>
          <div className="flex items-center gap-1.5">
            {[5, 10, 30, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                id={`expiry-btn-${mins}`}
                onClick={() => setExpiryMinutes(mins)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  expiryMinutes === mins
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'glass-button-secondary text-slate-600'
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
            htmlFor="burn-toggle"
            className="text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Burn on read</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (Delete immediately after 1st retrieval)
            </span>
          </label>
          <input
            id="burn-toggle"
            type="checkbox"
            checked={burnOnRead}
            onChange={(e) => setBurnOnRead(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <LockKeyhole className="h-3.5 w-3.5 text-emerald-600" />
        Expires automatically. No account is created.
      </div>

      <button
        type="submit"
        id="btn-create-text-clipboard"
        disabled={isLoading || !text.trim()}
        className="glass-button-primary w-full py-3.5 px-6 rounded-xl font-semibold text-base text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Creating Clipboard...</span>
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
