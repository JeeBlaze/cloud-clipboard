import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CodeInput } from './components/CodeInput';
import { CodeDisplay } from './components/CodeDisplay';
import { TextSendForm } from './components/TextSendForm';
import { FileSendForm } from './components/FileSendForm';
import { TextRetrieveCard } from './components/TextRetrieveCard';
import { FileRetrieveCard } from './components/FileRetrieveCard';
import { HowItWorksSection } from './components/HowItWorksSection';
import { PrivacyModal } from './components/PrivacyModal';
import { TermsModal } from './components/TermsModal';
import { SqlSchemaModal } from './components/SqlSchemaModal';
import { uploadFileToClipboard } from './lib/uploader';
import { ViewTab, ContentType, CreateClipboardResponse, RetrieveClipboardResponse } from './types';
import { 
  Send, 
  Download, 
  FileText, 
  UploadCloud, 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<ViewTab>('home');
  const [sendSubTab, setSendSubTab] = useState<'text' | 'file'>('text');
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

  // Send state
  const [isCreating, setIsCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [createdItem, setCreatedItem] = useState<CreateClipboardResponse['item'] | null>(null);

  // Retrieve state
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrievedItem, setRetrievedItem] = useState<RetrieveClipboardResponse['item'] | null>(null);
  const [retrieveError, setRetrieveError] = useState<{ title: string; message: string } | null>(null);

  // Check URL query parameters for ?code=XXXXXX on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam && /^[0-9]{6}$/.test(codeParam.trim())) {
      const codeDigits = codeParam.trim().split('');
      setDigits(codeDigits);
      setCurrentTab('retrieve');
      // Auto-trigger retrieval
      performRetrieve(codeParam.trim());
    }
  }, []);

  // 1. SEND TEXT HANDLER
  const handleSendText = async (textContent: string, expiryMinutes: number, burnOnRead: boolean) => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/clipboard/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'text',
          textContent,
          expiryMinutes,
          burnOnRead,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        if (contentType.includes('application/json')) {
          const errData = await res.json();
          throw new Error(errData.error || errData.message || 'Failed to create text clipboard');
        }
        throw new Error(`Failed to create text clipboard (Status ${res.status})`);
      }

      if (!contentType.includes('application/json')) {
        throw new Error('Server returned an unexpected response. Please try again.');
      }

      const data: CreateClipboardResponse = await res.json();
      if (!data.success || !data.item) {
        throw new Error(data.message || (data as any).error || 'Failed to create clipboard');
      }

      setCreatedItem(data.item);
    } finally {
      setIsCreating(false);
    }
  };

  // 2. SEND FILE HANDLER WITH CHUNKED STREAMING & ACCURATE PROGRESS
  const handleSendFile = async (file: File, expiryMinutes: number, burnOnRead: boolean) => {
    setIsCreating(true);
    setUploadProgress(0);

    try {
      const item = await uploadFileToClipboard({
        file,
        expiryMinutes,
        burnOnRead,
        onProgress: (percent) => {
          setUploadProgress(percent);
        },
      });

      setCreatedItem(item);
    } finally {
      setIsCreating(false);
      setUploadProgress(null);
    }
  };

  // 3. DIGITS CHANGE HANDLER
  const handleDigitsChange = (newDigits: string[]) => {
    setDigits(newDigits);
    const code = newDigits.join('');
    // Requirement 7: When all six digits are entered, the error: "Please enter all 6 digits." MUST disappear automatically.
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      if (retrieveError && retrieveError.message === 'Please enter all 6 digits.') {
        setRetrieveError(null);
      }
    }
  };

  // 4. RETRIEVE HANDLER
  const performRetrieve = async (codeToRetrieve?: string) => {
    const code = (typeof codeToRetrieve === 'string' ? codeToRetrieve : digits.join('')).trim();
    console.log("Retrieve code:", code);

    // Requirement 5: Before retrieving, validate
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setRetrieveError({
        title: 'Incomplete Code',
        message: 'Please enter all 6 digits.',
      });
      return;
    }

    setRetrieveError(null);
    setIsRetrieving(true);
    setRetrievedItem(null);

    try {
      const res = await fetch(`/api/clipboard/${encodeURIComponent(code)}`);
      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        if (contentType.includes('application/json')) {
          const errData = await res.json();
          if (res.status === 404 || errData.errorCode === 'NOT_FOUND') {
            setRetrieveError({
              title: 'Clipboard not found',
              message: 'The code may be incorrect or the clipboard may have expired.',
            });
          } else if (res.status === 410 || errData.errorCode === 'EXPIRED') {
            setRetrieveError({
              title: 'Clipboard expired',
              message: 'This clipboard has reached its expiration time and was automatically purged.',
            });
          } else if (res.status === 429 || errData.errorCode === 'RATE_LIMITED') {
            setRetrieveError({
              title: 'Too many attempts',
              message: 'Please wait a minute and try again.',
            });
          } else {
            setRetrieveError({
              title: 'Clipboard not found',
              message: errData.error || 'The code may be incorrect or the clipboard may have expired.',
            });
          }
        } else {
          setRetrieveError({
            title: 'Retrieval Error',
            message: `Unable to retrieve clipboard (Status ${res.status}).`,
          });
        }
        return;
      }

      if (!contentType.includes('application/json')) {
        setRetrieveError({
          title: 'Server Error',
          message: 'Received unexpected response from server.',
        });
        return;
      }

      const data: RetrieveClipboardResponse = await res.json();
      if (!data.success || !data.item) {
        setRetrieveError({
          title: 'Clipboard not found',
          message: data.error || 'The code may be incorrect or the clipboard may have expired.',
        });
        return;
      }

      setRetrievedItem(data.item);
    } catch (err: any) {
      console.error('Retrieve error:', err);
      setRetrieveError({
        title: 'Connection Error',
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setIsRetrieving(false);
    }
  };

  const handleResetRetrieve = () => {
    setDigits(['', '', '', '', '', '']);
    setRetrievedItem(null);
    setRetrieveError(null);
  };

  const handleResetSend = () => {
    setCreatedItem(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-indigo-600 selection:text-white">
      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        onNavigate={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* VIEW 1: HOME */}
        {currentTab === 'home' && (
          <div className="space-y-16 animate-in fade-in duration-200">
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto space-y-4 pt-2 sm:pt-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                Copy on one device. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600">
                  Paste anywhere.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed pt-1">
                Transfer text, images, and files between your devices instantly using a simple 6-digit access code.
              </p>

              {/* Primary Call to Action buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
                <button
                  id="hero-btn-send"
                  onClick={() => {
                    setCurrentTab('send');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-3.5 rounded-xl font-bold text-base text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200/80 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Something</span>
                </button>

                <button
                  id="hero-btn-retrieve"
                  onClick={() => {
                    setCurrentTab('retrieve');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-3.5 rounded-xl font-bold text-base text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Retrieve Something</span>
                </button>
              </div>
            </div>

            {/* Quick Interactive Clipboard Hub on Homepage */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-white/95 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8 backdrop-blur-sm">
                {/* Switchable Hub Tabs */}
                <div className="flex items-center justify-center p-1 bg-slate-100 rounded-xl mb-6 max-w-sm mx-auto border border-slate-200/60">
                  <button
                    onClick={() => {
                      setCreatedItem(null);
                      setSendSubTab('text');
                    }}
                    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sendSubTab === 'text' && !createdItem
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Send Text</span>
                  </button>
                  <button
                    onClick={() => {
                      setCreatedItem(null);
                      setSendSubTab('file');
                    }}
                    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sendSubTab === 'file' && !createdItem
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Send File</span>
                  </button>
                </div>

                {/* Send Content / Result */}
                {createdItem ? (
                  <CodeDisplay
                    code={createdItem.code}
                    contentType={createdItem.contentType}
                    expiresInSeconds={createdItem.expiresInSeconds}
                    fileName={createdItem.fileName}
                    fileSize={createdItem.fileSize}
                    onCreateAnother={handleResetSend}
                  />
                ) : (
                  <div>
                    {sendSubTab === 'text' ? (
                      <TextSendForm onSubmit={handleSendText} isLoading={isCreating} />
                    ) : (
                      <FileSendForm
                        onSubmit={handleSendFile}
                        isLoading={isCreating}
                        uploadProgress={uploadProgress}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* How It Works Section */}
            <HowItWorksSection onNavigate={(tab) => setCurrentTab(tab)} />
          </div>
        )}

        {/* VIEW 2: SEND PAGE */}
        {currentTab === 'send' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
            {!createdItem ? (
              <div className="bg-white/95 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6 backdrop-blur-sm">
                {/* Header */}
                <div className="text-center space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Send something
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    Create a temporary clipboard that you can access from another device.
                  </p>
                </div>

                {/* Sub-tabs: Text vs File */}
                <div className="flex items-center justify-center p-1 bg-slate-100 rounded-xl max-w-xs mx-auto border border-slate-200/60">
                  <button
                    id="tab-send-text"
                    onClick={() => setSendSubTab('text')}
                    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sendSubTab === 'text'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Text</span>
                  </button>
                  <button
                    id="tab-send-file"
                    onClick={() => setSendSubTab('file')}
                    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sendSubTab === 'file'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>File</span>
                  </button>
                </div>

                {/* Form based on sub-tab */}
                {sendSubTab === 'text' ? (
                  <TextSendForm onSubmit={handleSendText} isLoading={isCreating} />
                ) : (
                  <FileSendForm
                    onSubmit={handleSendFile}
                    isLoading={isCreating}
                    uploadProgress={uploadProgress}
                  />
                )}
              </div>
            ) : (
              <CodeDisplay
                code={createdItem.code}
                contentType={createdItem.contentType}
                expiresInSeconds={createdItem.expiresInSeconds}
                fileName={createdItem.fileName}
                fileSize={createdItem.fileSize}
                onCreateAnother={handleResetSend}
              />
            )}
          </div>
        )}

        {/* VIEW 3: RETRIEVE PAGE */}
        {currentTab === 'retrieve' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
            {!retrievedItem ? (
              <div className="bg-white/95 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6 backdrop-blur-sm">
                {/* Heading & Subtitle */}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <Download className="w-6 h-6" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Retrieve your clipboard
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    Enter the 6-digit code from your other device.
                  </p>
                </div>

                {/* 6-Digit OTP Box */}
                <div className="space-y-4">
                  <CodeInput
                    digits={digits}
                    onChange={handleDigitsChange}
                    onSubmit={(code) => performRetrieve(code)}
                    isLoading={isRetrieving}
                    autoFocus={true}
                  />

                  {/* Error State */}
                  {retrieveError && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{retrieveError.title}</span>
                      </div>
                      <p className="text-xs text-rose-600 leading-relaxed">
                        {retrieveError.message}
                      </p>
                      <button
                        id="btn-retry-retrieve"
                        onClick={handleResetRetrieve}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-800 underline hover:text-rose-900 pt-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Retrieve Button */}
                  <button
                    id="btn-retrieve-submit"
                    onClick={() => performRetrieve(digits.join(''))}
                    disabled={isRetrieving || digits.join('').length !== 6}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-base text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200/80 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isRetrieving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Retrieving clipboard...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Retrieve Clipboard</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Helpful tips */}
                <div className="border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
                  <p>Codes are 6 numeric digits generated automatically when content is sent.</p>
                </div>
              </div>
            ) : (
              <div>
                {retrievedItem.contentType === 'text' && retrievedItem.textContent ? (
                  <TextRetrieveCard
                    textContent={retrievedItem.textContent}
                    code={retrievedItem.code}
                    expiresInSeconds={retrievedItem.expiresInSeconds}
                    onReset={handleResetRetrieve}
                  />
                ) : (
                  <FileRetrieveCard
                    code={retrievedItem.code}
                    contentType={retrievedItem.contentType}
                    fileName={retrievedItem.fileName}
                    fileSize={retrievedItem.fileSize}
                    mimeType={retrievedItem.mimeType}
                    downloadUrl={retrievedItem.downloadUrl}
                    fileData={retrievedItem.fileData}
                    expiresInSeconds={retrievedItem.expiresInSeconds}
                    onReset={handleResetRetrieve}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: HOW IT WORKS */}
        {currentTab === 'how-it-works' && (
          <div className="animate-in fade-in duration-200">
            <HowItWorksSection onNavigate={(tab) => setCurrentTab(tab)} />
          </div>
        )}

        {/* VIEW 5: PRIVACY */}
        {currentTab === 'privacy' && (
          <PrivacyModal onBack={() => setCurrentTab('home')} />
        )}

        {/* VIEW 6: TERMS */}
        {currentTab === 'terms' && (
          <TermsModal onBack={() => setCurrentTab('home')} />
        )}
      </main>

      {/* Supabase Schema Modal for Developer & Architecture Inspection */}
      <SqlSchemaModal
        isOpen={schemaModalOpen}
        onClose={() => setSchemaModalOpen(false)}
      />

      {/* Footer */}
      <Footer
        onNavigate={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSchema={() => setSchemaModalOpen(true)}
      />
    </div>
  );
}
