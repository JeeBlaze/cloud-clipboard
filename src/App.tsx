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
import { apiUrl } from './lib/api';
import {
  ViewTab,
  ContentType,
  CreateClipboardResponse,
  RetrieveClipboardResponse,
} from './types';
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
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<ViewTab>('home');
  const [sendSubTab, setSendSubTab] = useState<'text' | 'file'>('text');
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

  // Send state
  const [isCreating, setIsCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [createdItem, setCreatedItem] =
    useState<CreateClipboardResponse['item'] | null>(null);

  // Retrieve state
  const [digits, setDigits] = useState<string[]>([
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrievedItem, setRetrievedItem] =
    useState<RetrieveClipboardResponse['item'] | null>(null);
  const [retrieveError, setRetrieveError] = useState<{
    title: string;
    message: string;
  } | null>(null);

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
  const handleSendText = async (
    textContent: string,
    expiryMinutes: number,
    burnOnRead: boolean
  ) => {
    setIsCreating(true);

    try {
      const res = await fetch(apiUrl('/api/clipboard/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

          throw new Error(
            errData.error ||
              errData.message ||
              'Failed to create text clipboard'
          );
        }

        throw new Error(
          `Failed to create text clipboard (Status ${res.status})`
        );
      }

      if (!contentType.includes('application/json')) {
        throw new Error(
          'Server returned an unexpected response. Please try again.'
        );
      }

      const data: CreateClipboardResponse = await res.json();

      if (!data.success || !data.item) {
        throw new Error(
          data.message ||
            (data as any).error ||
            'Failed to create clipboard'
        );
      }

      setCreatedItem(data.item);
    } finally {
      setIsCreating(false);
    }
  };

  // 2. SEND FILE HANDLER WITH CHUNKED STREAMING & ACCURATE PROGRESS
  const handleSendFile = async (
    file: File,
    expiryMinutes: number,
    burnOnRead: boolean
  ) => {
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

    // When all six digits are entered,
    // "Please enter all 6 digits." disappears automatically.
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      if (
        retrieveError &&
        retrieveError.message === 'Please enter all 6 digits.'
      ) {
        setRetrieveError(null);
      }
    }
  };

  // 4. RETRIEVE HANDLER
  const performRetrieve = async (codeToRetrieve?: string) => {
    const code = (
      typeof codeToRetrieve === 'string'
        ? codeToRetrieve
        : digits.join('')
    ).trim();

    console.log('Retrieve code:', code);

    // Validate code before retrieving
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
      const res = await fetch(
        apiUrl(`/api/clipboard/${encodeURIComponent(code)}`)
      );

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        if (contentType.includes('application/json')) {
          const errData = await res.json();

          if (
            res.status === 404 ||
            errData.errorCode === 'NOT_FOUND'
          ) {
            setRetrieveError({
              title: 'Clipboard not found',
              message:
                'The code may be incorrect or the clipboard may have expired.',
            });
          } else if (
            res.status === 410 ||
            errData.errorCode === 'EXPIRED'
          ) {
            setRetrieveError({
              title: 'Clipboard expired',
              message:
                'This clipboard has reached its expiration time and was automatically purged.',
            });
          } else if (
            res.status === 429 ||
            errData.errorCode === 'RATE_LIMITED'
          ) {
            setRetrieveError({
              title: 'Too many attempts',
              message: 'Please wait a minute and try again.',
            });
          } else {
            setRetrieveError({
              title: 'Clipboard not found',
              message:
                errData.error ||
                'The code may be incorrect or the clipboard may have expired.',
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
          message:
            data.error ||
            'The code may be incorrect or the clipboard may have expired.',
        });

        return;
      }

      setRetrievedItem(data.item);
    } catch (err: any) {
      console.error('Retrieve error:', err);

      setRetrieveError({
        title: 'Connection Error',
        message:
          'Network error. Please check your connection and try again.',
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
    <div className="relative min-h-screen flex flex-col bg-[#f7f8fc] font-sans text-slate-950 selection:bg-indigo-600 selection:text-white">

      {/* =========================================================
          CLOUDCLIPBOARD LOGO
          ========================================================= */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <img
          src="/logo.png"
          alt="CloudClipboard"
          className="h-10 w-10 sm:h-12 sm:w-12 object-contain drop-shadow-md"
        />
      </div>

      {/* =========================================================
          NAVIGATION
          ========================================================= */}
      <Navbar
        currentTab={currentTab}
        onNavigate={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        }}
      />

      {/* =========================================================
          MAIN CONTENT AREA
          ========================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* =======================================================
            VIEW 1: HOME
            ======================================================= */}
        {currentTab === 'home' && (
          <div className="space-y-20 animate-in fade-in duration-200">

            {/* Hero Section */}
            <div className="text-center max-w-4xl mx-auto space-y-5 pt-4 sm:pt-10">

              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm shadow-indigo-950/[0.03]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Private by default. No account required.
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-slate-950 tracking-[-0.055em] leading-[0.98]">
                Move what matters.

                <span className="block bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent pb-1">
                  Leave nothing behind.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Send text and files from any device with a private
                six-digit code. Your clip disappears on your schedule.
              </p>

              {/* Primary Call to Action buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">

                <button
                  id="hero-btn-send"
                  onClick={() => {
                    setCurrentTab('send');
                    window.scrollTo({
                      top: 0,
                      behavior: 'smooth',
                    });
                  }}
                  className="px-5 py-3 rounded-xl font-semibold text-sm text-white bg-slate-950 hover:bg-slate-800 shadow-xl shadow-slate-950/15 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Something</span>
                </button>

                <button
                  id="hero-btn-retrieve"
                  onClick={() => {
                    setCurrentTab('retrieve');
                    window.scrollTo({
                      top: 0,
                      behavior: 'smooth',
                    });
                  }}
                  className="px-5 py-3 rounded-xl font-semibold text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Retrieve Something</span>
                </button>

              </div>
            </div>

            {/* Quick Interactive Clipboard Hub */}
            <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.82fr_1.18fr] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl shadow-slate-950/[0.07]">

              <div className="relative overflow-hidden bg-slate-950 px-7 py-8 text-white sm:px-10 sm:py-12">

                <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-indigo-600/40 blur-3xl" />

                <div className="absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl" />

                <div className="relative flex h-full flex-col justify-between gap-12">

                  <div className="space-y-5">

                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
                      One private handoff
                    </span>

                    <h2 className="max-w-sm text-3xl font-semibold tracking-[-0.04em] leading-tight">
                      Your content, available exactly when you need it.
                    </h2>

                    <p className="max-w-sm text-sm leading-relaxed text-slate-300">
                      Create a temporary, single-purpose clipboard.
                      No sign-up, device pairing, or inbox clutter.
                    </p>

                  </div>

                  <div className="space-y-3 text-sm text-slate-200">

                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                        1
                      </span>
                      Add text or a file
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                        2
                      </span>
                      Share the six-digit code
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                        3
                      </span>
                      Retrieve from anywhere
                    </div>

                  </div>

                </div>
              </div>

              <div className="p-5 sm:p-8 lg:p-10">

                {/* Switchable Hub Tabs */}
                <div className="flex items-center justify-center p-1 bg-slate-100 rounded-xl mb-7 max-w-sm border border-slate-200/60">

                  <button
                    onClick={() => {
                      setCreatedItem(null);
                      setSendSubTab('text');
                    }}
                    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sendSubTab === 'text' && !createdItem
                        ? 'bg-white text-slate-950 shadow-sm'
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
                        ? 'bg-white text-slate-950 shadow-sm'
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
                      <TextSendForm
                        onSubmit={handleSendText}
                        isLoading={isCreating}
                      />
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
            <HowItWorksSection
              onNavigate={(tab) => setCurrentTab(tab)}
            />

          </div>
        )}

        {/* =======================================================
            VIEW 2: SEND PAGE
            ======================================================= */}
        {currentTab === 'send' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">

            {!createdItem ? (
              <div className="bg-white rounded-[1.75rem] border border-slate-200/80 shadow-xl shadow-slate-950/[0.05] p-6 sm:p-8 space-y-7">

                <div className="text-center space-y-1">

                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                    New transfer
                  </span>

                  <h1 className="text-3xl sm:text-4xl font-semibold text-slate-950 tracking-[-0.04em]">
                    Send securely
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    Create a private handoff that expires automatically.
                  </p>

                </div>

                <div className="flex items-center justify-center p-1 bg-slate-100 rounded-xl max-w-xs mx-auto border border-slate-200/60">

                  <button
                    id="tab-send-text"
                    onClick={() => setSendSubTab('text')}
                    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sendSubTab === 'text'
                        ? 'bg-white text-slate-950 shadow-sm'
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
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>File</span>
                  </button>

                </div>

                {sendSubTab === 'text' ? (
                  <TextSendForm
                    onSubmit={handleSendText}
                    isLoading={isCreating}
                  />
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

        {/* =======================================================
            VIEW 3: RETRIEVE PAGE
            ======================================================= */}
        {currentTab === 'retrieve' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">

            {!retrievedItem ? (
              <div className="bg-white rounded-[1.75rem] border border-slate-200/80 shadow-xl shadow-slate-950/[0.05] p-6 sm:p-8 space-y-7">

                <div className="text-center space-y-1">

                  <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-950/15">
                    <Download className="w-6 h-6" />
                  </div>

                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                    Secure pickup
                  </span>

                  <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-slate-950 tracking-[-0.04em]">
                    Retrieve your transfer
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    Enter the private code from your other device.
                  </p>

                </div>

                <div className="space-y-4">

                  <CodeInput
                    digits={digits}
                    onChange={handleDigitsChange}
                    onSubmit={(code) => performRetrieve(code)}
                    isLoading={isRetrieving}
                    autoFocus={true}
                  />

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

                  <button
                    id="btn-retrieve-submit"
                    onClick={() => performRetrieve(digits.join(''))}
                    disabled={
                      isRetrieving ||
                      digits.join('').length !== 6
                    }
                    className="w-full py-3.5 px-6 rounded-xl font-semibold text-base text-white bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-950/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
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

                <div className="border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
                  <p>
                    Codes are 6 numeric digits generated automatically
                    when content is sent.
                  </p>
                </div>

              </div>
            ) : (
              <div>
                {retrievedItem.contentType === 'text' &&
                retrievedItem.textContent ? (
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

        {/* =======================================================
            VIEW 4: HOW IT WORKS
            ======================================================= */}
        {currentTab === 'how-it-works' && (
          <div className="animate-in fade-in duration-200">
            <HowItWorksSection
              onNavigate={(tab) => setCurrentTab(tab)}
            />
          </div>
        )}

        {/* =======================================================
            VIEW 5: PRIVACY
            ======================================================= */}
        {currentTab === 'privacy' && (
          <PrivacyModal
            onBack={() => setCurrentTab('home')}
          />
        )}

        {/* =======================================================
            VIEW 6: TERMS
            ======================================================= */}
        {currentTab === 'terms' && (
          <TermsModal
            onBack={() => setCurrentTab('home')}
          />
        )}

      </main>

      {/* Supabase Schema Modal */}
      <SqlSchemaModal
        isOpen={schemaModalOpen}
        onClose={() => setSchemaModalOpen(false)}
      />

      {/* Footer */}
      <Footer
        onNavigate={(tab) => {
          setCurrentTab(tab);

          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        }}
        onOpenSchema={() => setSchemaModalOpen(true)}
      />

    </div>
  );
}
