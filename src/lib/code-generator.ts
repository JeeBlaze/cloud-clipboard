/**
 * Cryptographically random 6-digit numeric access code generator
 * Generates an integer in the range [100000, 999999]
 */
export function generateSixDigitCode(): string {
  // Uses crypto if available in runtime
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    // Scale to range 100000 - 999999
    const code = 100000 + (array[0] % 900000);
    return code.toString();
  }
  // Fallback
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isValidSixDigitCode(code: string): boolean {
  return /^[0-9]{6}$/.test(code.trim());
}
