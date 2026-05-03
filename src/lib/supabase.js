import { createClient } from '@supabase/supabase-js';

// Single Supabase client for the whole app.
//
// Auth options:
//  - persistSession: localStorage-backed (default in browser).
//  - autoRefreshToken: refresh ~60s before expiry.
//  - detectSessionInUrl: handles email-confirm / OAuth redirects.
//
// In mock mode (VITE_USE_MOCK_API=true) the client is still constructed
// (cheap) but never called — src/api/auth.js branches on isMockApi before
// hitting it. That means a missing VITE_SUPABASE_URL only breaks real-mode.

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // Don't throw — mock mode should still boot. Warn loudly so real-mode
  // misconfiguration is obvious in devtools.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
      'Real-mode auth and data calls will fail. Mock mode unaffected.',
  );
}

export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'naluka-auth',
  },
});

/**
 * Map a Supabase Session → the app's flat user object the rest of the SPA
 * already consumes. Reads role from the JWT custom claim (`app_role`) set
 * by the Postgres custom_access_token_hook; falls back to user_metadata.role
 * if the hook isn't wired (e.g. local dev before config.toml deploys).
 */
export function userFromSession(session) {
  if (!session?.user) return null;
  const u = session.user;
  const claims = decodeJwtClaims(session.access_token);
  return {
    id: u.id,
    email: u.email,
    role: claims.app_role || u.user_metadata?.role || 'AME',
    name: u.user_metadata?.name || (u.email ? u.email.split('@')[0] : 'Naluka User'),
  };
}

/**
 * Lightweight base64url decode of a JWT payload. No signature verification —
 * the gateway already verifies; we just need to read claims client-side.
 * Returns {} on any failure.
 */
export function decodeJwtClaims(token) {
  if (!token) return {};
  try {
    const payload = token.split('.')[1];
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

/**
 * Recursive snake_case → camelCase converter for Supabase rows. The Postgres
 * schema is snake_case (standard); the existing UI consumes camelCase. Apply
 * to every supabase.from(...).select() result before returning to the SPA.
 *
 * Skips Date/Buffer/etc. — only walks plain objects and arrays.
 */
export function snakeToCamel(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj instanceof Date) return obj;
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      out[camel] = snakeToCamel(v);
    }
    return out;
  }
  return obj;
}
