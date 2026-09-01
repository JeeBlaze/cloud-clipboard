/**
 * Resolves API paths against the optional public backend URL.
 *
 * Leave VITE_API_URL unset for local development: the Vite/Express server then
 * handles the existing relative /api requests. Production can point the static
 * Vercel frontend at the Render service without hard-coding that deployment.
 */
const apiBaseUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

export function apiUrl(path: string): string {
  if (!apiBaseUrl) return path;

  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
