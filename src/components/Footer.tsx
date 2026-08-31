import React from 'react';
import { Clipboard, Shield, FileText, HelpCircle } from 'lucide-react';
import { ViewTab } from '../types';

interface FooterProps {
  onNavigate: (tab: ViewTab) => void;
  onOpenSchema?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand and Tagline */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Clipboard className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 text-base">CloudClip</span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              "Copy on one device. Paste anywhere." — Secure, ephemeral cross-device clipboard transfer.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-slate-600">
            <button
              id="footer-link-how-it-works"
              onClick={() => onNavigate('how-it-works')}
              className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How It Works
            </button>
            <button
              id="footer-link-privacy"
              onClick={() => onNavigate('privacy')}
              className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              Privacy Policy
            </button>
            <button
              id="footer-link-terms"
              onClick={() => onNavigate('terms')}
              className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Terms of Service
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-6 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-medium tracking-wider uppercase">
          <span>© 2026 CloudClip Secure Transfer</span>
          <div className="flex items-center gap-4 lowercase tracking-normal">
            <span>Default expiry: 10 mins</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
