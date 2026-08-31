import React from 'react';
import { FileText, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

interface TermsModalProps {
  onBack: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ onBack }) => {
  return (
    <div className="w-full max-w-3xl mx-auto bg-white/95 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-10 space-y-8 animate-in fade-in backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Terms of Service</h1>
            <p className="text-xs text-slate-500">Updated: 2026 • Acceptable Use & Guidelines</p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            1. Purpose and Acceptable Use
          </h2>
          <p>
            CloudClip is provided for personal and professional cross-device productivity to facilitate temporary text, code, document, and image transfers between your authorized devices.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            2. Prohibited Content & Abuse
          </h2>
          <p>
            You agree not to upload, store, or transmit illegal materials, malware, viruses, unconsented copyrighted media, or content intended to disrupt service infrastructure. Violations result in immediate rate-limiting and IP banning.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            3. Temporary Storage & Service Availability
          </h2>
          <p>
            CloudClip is an ephemeral transfer pipeline, not a permanent backup service. All files and text are deleted upon expiration. CloudClip provides the service "as is" and assumes no liability for expired or unretrieved transfers.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-slate-100 text-center">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-200/80 active:scale-95 transition-all cursor-pointer"
        >
          Return to CloudClip
        </button>
      </div>
    </div>
  );
};
