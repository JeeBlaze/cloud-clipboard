import React from 'react';
import { ShieldCheck, Lock, Trash2, UserX, Clock, ArrowLeft } from 'lucide-react';
import { ViewTab } from '../types';

interface PrivacyModalProps {
  onBack: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onBack }) => {
  return (
    <div className="glass-panel modal-enter w-full max-w-3xl mx-auto rounded-2xl p-6 sm:p-10 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Privacy Policy</h1>
            <p className="text-xs text-slate-500">Effective Date: 2026 • Transparent & Ephemeral</p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="glass-button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            1. Automatic Expiration & Ephemeral Storage
          </h2>
          <p>
            All clipboards created on CloudClip are strictly temporary. By default, every clip is programmed to automatically self-destruct and be permanently wiped from server memory and storage after <strong>10 minutes</strong>. Once expired, the content is permanently inaccessible.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserX className="w-4 h-4 text-indigo-600" />
            2. No Account or Personal Identification Required
          </h2>
          <p>
            CloudClip does not require an account, email address, phone number, or name. We do not build user profiles, nor do we track clipboard history across sessions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            3. Transmission and Security
          </h2>
          <p>
            All data in transit is encrypted using standard HTTPS/TLS protocols. Access is granted solely through a randomly generated 6-digit PIN linked to an internal unique identifier. We do not sell or share uploaded content with third parties or advertisers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-indigo-600" />
            4. Sensible Usage Advice
          </h2>
          <p>
            While CloudClip uses strong encryption and automatic shredding, short 6-digit codes are designed for convenience during immediate transfers. We advise users to avoid transferring sensitive credentials such as master passwords or unencrypted private keys.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-slate-100 text-center">
        <button
          onClick={onBack}
          className="glass-button-primary px-6 py-2.5 text-white font-semibold text-sm rounded-xl cursor-pointer"
        >
          Return to CloudClip
        </button>
      </div>
    </div>
  );
};
