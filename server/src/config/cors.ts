import { config } from './index.js';

// Origins allowed to make credentialed cross-origin requests to this API.
// FRONTEND_URL is the deployed client origin. ALLOWED_ORIGINS adds any known
// extra origins (for example specific Vercel preview deployments), comma-separated.
export const allowedOrigins: readonly string[] = [
  config.frontendUrl,
  ...config.allowedOrigins,
];

// Only the configured origins are trusted. Requests without an Origin header
// (same-origin navigations and non-browser clients) are allowed through.
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}
