import React, { useState } from 'react';
import { PenTool, Hash, Download, Smartphone, Laptop, ShieldCheck, Zap, Lock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { ViewTab } from '../types';
import { MAX_FILE_SIZE_MB } from '../lib/constants';

interface HowItWorksSectionProps {
  onNavigate: (tab: ViewTab) => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const steps = [
    {
      step: '01',
      title: 'Create Clipboard',
      desc: `Paste text, code snippets, or upload images and files up to ${MAX_FILE_SIZE_MB} MB on your primary device.`,
      icon: PenTool,
      accent: 'from-blue-500 to-indigo-600',
    },
    {
      step: '02',
      title: 'Get Your Code',
      desc: 'Receive an instant, cryptographically generated 6-digit temporary access code (e.g. 482731).',
      icon: Hash,
      accent: 'from-indigo-600 to-violet-600',
    },
    {
      step: '03',
      title: 'Retrieve Anywhere',
      desc: 'Open CloudClip on your second phone, laptop, or tablet, enter the 6 digits, and grab your content.',
      icon: Download,
      accent: 'from-violet-600 to-purple-600',
    },
  ];

  const features = [
    {
      title: 'No Account Required',
      desc: 'Zero registration, no login forms, no passwords or emails required to transfer content instantly.',
      icon: Zap,
    },
    {
      title: 'Auto-Expiring & Ephemeral',
      desc: 'Clipboards automatically self-destruct after 10 minutes, leaving no digital footprint.',
      icon: RefreshCw,
    },
    {
      title: 'Burn-on-Read Security',
      desc: 'Optional one-time shredding destroys your clip immediately after the first successful retrieval.',
      icon: Lock,
    },
    {
      title: 'Universal File Transfer',
      desc: `Transfer PNG, JPG, PDF, DOCX, CSV, and ZIP archives up to ${MAX_FILE_SIZE_MB} MB with instant download links.`,
      icon: ShieldCheck,
    },
  ];

  const faqs = [
    {
      q: 'How long do clipboard items stay accessible?',
      a: 'By default, every clipboard item is set to automatically expire after 10 minutes. You can also customize the duration (5, 10, 30, or 60 minutes) or enable "Burn on Read" for immediate deletion after retrieval.',
    },
    {
      q: 'Do I need to create an account or sign in?',
      a: 'No! CloudClip is designed for friction-free speed. You never need an email, phone number, or account to create or retrieve clipboards.',
    },
    {
      q: 'What file formats and sizes are supported?',
      a: `You can upload files up to ${MAX_FILE_SIZE_MB} MB in size, including images (PNG, JPG, WEBP, GIF), documents (PDF, DOCX, TXT, CSV, XLSX), and archives (ZIP).`,
    },
    {
      q: 'Is my data secure?',
      a: 'Yes. Files and text are stored securely in temporary memory and encrypted storage, identified only by an internal random UUID with a short-lived 6-digit access code. Once expired, files and text are permanently wiped.',
    },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* 3 Steps Section */}
      <section className="text-center space-y-10">
        <div className="space-y-2 max-w-xl mx-auto">
          <span className="text-xs uppercase tracking-wider font-bold text-indigo-600">
            Simple 3-Step Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            How CloudClip Works
          </h2>
          <p className="text-sm text-slate-500">
            Effortlessly move text and files across operating systems, browsers, and devices in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="glass-panel rounded-2xl p-6 sm:p-7 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center text-white shadow-xs`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black text-slate-200 font-mono">
                      {s.step}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">
                    {s.title}
                  </h3>

                  <p className="text-sm text-slate-500 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-indigo-600">
                  {idx === 0 && 'Device A: Enter text or drop file'}
                  {idx === 1 && 'Instant 6-digit access pin'}
                  {idx === 2 && 'Device B: Paste or download'}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Visual Device Transfer Simulator Graphic */}
      <section className="max-w-4xl mx-auto bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 space-y-6 text-center max-w-xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
            Cross-Platform Bridge
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Mac, Windows, iOS, Android, Linux
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            No Bluetooth pairing, no shared Apple ID, no cables, no email self-sending. Just 6 digits.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('send')}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Send Something Now
            </button>
            <button
              onClick={() => onNavigate('retrieve')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl border border-indigo-400/30 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Retrieve Clipboard
            </button>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Engineered for Frictionless Utility
          </h2>
          <p className="text-sm text-slate-500">
            Built from the ground up to solve the daily frustration of cross-device transfer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="glass-panel rounded-2xl p-6 flex items-start gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-base">{f.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-1.5">
          <h3 className="text-xl font-extrabold text-slate-900">Frequently Asked Questions</h3>
          <p className="text-xs text-slate-500">Everything you need to know about CloudClip.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="glass-subpanel rounded-xl overflow-hidden transition-all shadow-xs"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-sm cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 border-t border-slate-100 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
