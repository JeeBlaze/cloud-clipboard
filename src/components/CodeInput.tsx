import React, { useRef, useEffect } from 'react';

interface CodeInputProps {
  digits?: string[];
  code?: string[];
  onChange: (newDigits: string[]) => void;
  onSubmit: (code?: string) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const CodeInput: React.FC<CodeInputProps> = ({
  digits,
  code,
  onChange,
  onSubmit,
  isLoading = false,
  autoFocus = true,
  disabled = false,
}) => {
  // Support either `digits` or `code` prop seamlessly
  const currentDigits = digits || code || ['', '', '', '', '', ''];
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleInputChange = (index: number, rawValue: string) => {
    // Only accept numeric digits 0-9; reject all letters and other characters
    const cleanDigits = rawValue.replace(/[^0-9]/g, '');

    if (!cleanDigits) {
      const newDigits = [...currentDigits];
      newDigits[index] = '';
      onChange(newDigits);
      return;
    }

    // If multiple digits were somehow inputted (e.g. autofill or rapid input)
    if (cleanDigits.length > 1) {
      const newDigits = [...currentDigits];
      for (let i = 0; i < cleanDigits.length && index + i < 6; i++) {
        newDigits[index + i] = cleanDigits[i];
      }
      onChange(newDigits);
      const nextIdx = Math.min(index + cleanDigits.length, 5);
      inputRefs.current[nextIdx]?.focus();

      const fullCode = newDigits.join('');
      if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) {
        onSubmit(fullCode);
      }
      return;
    }

    // Single digit entry (0-9)
    const char = cleanDigits[0];
    const newDigits = [...currentDigits];
    newDigits[index] = char;
    onChange(newDigits);

    // Automatically focus the next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits are entered, submit immediately with the exact 6-digit code string
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && /^\d{6}$/.test(fullCode)) {
      onSubmit(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!currentDigits[index] && index > 0) {
        // Current box is empty, clear previous box and focus it
        const newDigits = [...currentDigits];
        newDigits[index - 1] = '';
        onChange(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...currentDigits];
        newDigits[index] = '';
        onChange(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const fullCode = currentDigits.join('');
      onSubmit(fullCode);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();
    // Extract only digits 0-9
    const digitsOnly = pastedText.replace(/[^0-9]/g, '').slice(0, 6);
    if (!digitsOnly) return;

    const newDigits = [...currentDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = digitsOnly[i] || '';
    }
    onChange(newDigits);

    // Focus appropriate input
    const targetIndex = Math.min(digitsOnly.length, 5);
    inputRefs.current[targetIndex]?.focus();

    // If a complete 6-digit code was pasted, trigger retrieval with the full code string
    if (digitsOnly.length === 6 && /^\d{6}$/.test(digitsOnly)) {
      onSubmit(digitsOnly);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 my-4">
      {Array.from({ length: 6 }).map((_, idx) => {
        const isFilled = Boolean(currentDigits[idx]);
        return (
          <input
            key={idx}
            id={`otp-input-${idx}`}
            ref={(el) => (inputRefs.current[idx] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={currentDigits[idx] || ''}
            disabled={disabled || isLoading}
            onChange={(e) => handleInputChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${idx + 1}`}
            className={`glass-input w-11 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-mono font-bold rounded-xl border-2 transition-all duration-150 outline-none select-none ${
              isFilled
                ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-xs'
                : 'border-white/80 bg-white/60 text-slate-900 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
          />
        );
      })}
    </div>
  );
};
