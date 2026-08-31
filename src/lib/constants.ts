/**
 * Shared Application Constants
 * MAX_FILE_SIZE_MB is configured via environment variables with 300 MB default.
 */

export const MAX_FILE_SIZE_MB: number = (() => {
  const envVal = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MAX_FILE_SIZE_MB) || 
    (typeof process !== 'undefined' && process.env?.MAX_FILE_SIZE_MB);
  const parsed = parseInt(envVal as string, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : 300;
})();

export const MAX_FILE_SIZE_BYTES: number = MAX_FILE_SIZE_MB * 1024 * 1024;
