import React, { useState } from 'react';
import { Clipboard, Send, Download, HelpCircle, Menu, X } from 'lucide-react';
import { ViewTab } from '../types';

interface NavbarProps {
  currentTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: ViewTab) => {
    onNavigate(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full px-3 pt-3 sm:px-5">
      <div className="glass-panel max-w-7xl mx-auto h-[4.25rem] px-3 sm:px-5 rounded-2xl flex items-center justify-between">
        {/* Brand Logo */}
        <button
          id="nav-brand-logo"
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl p-1"
        >
          <img
            src="/logo.png"
            alt="CloudClip logo"
            className="h-10 w-10 object-contain transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3"
          />
          <span className="font-semibold text-xl leading-tight tracking-[-0.04em] text-slate-950">
            CloudClip
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center rounded-full glass-subpanel p-1 text-sm font-medium text-slate-600">
          <button
            id="nav-link-home"
            onClick={() => handleNavClick('home')}
            className={`rounded-full px-3 py-1.5 transition-colors cursor-pointer ${
              currentTab === 'home'
                ? 'bg-slate-950/90 text-white font-semibold shadow-sm'
                : 'hover:text-slate-950'
            }`}
          >
            Home
          </button>
          <button
            id="nav-link-send"
            onClick={() => handleNavClick('send')}
            className={`rounded-full px-3 py-1.5 transition-colors cursor-pointer ${
              currentTab === 'send'
                ? 'bg-slate-950/90 text-white font-semibold shadow-sm'
                : 'hover:text-slate-950'
            }`}
          >
            Send
          </button>
          <button
            id="nav-link-retrieve"
            onClick={() => handleNavClick('retrieve')}
            className={`rounded-full px-3 py-1.5 transition-colors cursor-pointer ${
              currentTab === 'retrieve'
                ? 'bg-slate-950/90 text-white font-semibold shadow-sm'
                : 'hover:text-slate-950'
            }`}
          >
            Retrieve
          </button>
          <button
            id="nav-link-how-it-works"
            onClick={() => handleNavClick('how-it-works')}
            className={`rounded-full px-3 py-1.5 transition-colors cursor-pointer ${
              currentTab === 'how-it-works'
                ? 'bg-slate-950/90 text-white font-semibold shadow-sm'
                : 'hover:text-slate-950'
            }`}
          >
            How It Works
          </button>
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center space-x-2">
          <button
            id="nav-btn-retrieve"
            onClick={() => handleNavClick('retrieve')}
            className="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Download className="w-4 h-4 text-slate-500" />
              <span>Retrieve</span>
            </span>
          </button>
          <button
            id="nav-btn-send"
            onClick={() => handleNavClick('send')}
            className="glass-button-primary px-4 py-2 text-sm font-semibold text-white rounded-xl cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Send className="w-4 h-4" />
              <span>Get Started</span>
            </span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex sm:hidden">
          <button
            id="nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="glass-panel sm:hidden mt-2 rounded-2xl px-4 pt-2 pb-4 space-y-1 shadow-lg animate-in slide-in-from-top duration-150">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-base font-medium rounded-lg ${
              currentTab === 'home' ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            Home
          </button>
          <button
            onClick={() => handleNavClick('send')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-base font-medium rounded-lg ${
              currentTab === 'send' ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Send className="w-4 h-4" />
            Send Content
          </button>
          <button
            onClick={() => handleNavClick('retrieve')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-base font-medium rounded-lg ${
              currentTab === 'retrieve' ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-4 h-4" />
            Retrieve with 6-Digit Code
          </button>
          <button
            onClick={() => handleNavClick('how-it-works')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-base font-medium rounded-lg ${
              currentTab === 'how-it-works' ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            How It Works
          </button>
          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => handleNavClick('send')}
              className="flex-1 py-2 text-center text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm"
            >
              Get Started
            </button>
            <button
              onClick={() => handleNavClick('retrieve')}
              className="flex-1 py-2 text-center text-sm font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg"
            >
              Enter Code
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
