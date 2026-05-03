import { createClient, type Session } from '@supabase/supabase-js';
import type { Database } from '../types/database';

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
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
      'Real-mode auth and data calls will fail. Mock mode unaffected.',
  );
}

export const supabase = createClient<Database>(
  url ?? 'http://localhost:54321',
  key ?? 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'naluka-auth',
    },
  },
);

/**
 * The flat user object the rest of the SPA consumes. Composed from the
 * Supabase auth.user + the custom JWT claim app_role (set by the
 * custom_access_token_hook plpgsql function in 0001_init.sql).
 */
export interface AppUser {
  id: string;
  email: string | null | undefined;
  role: Database['public']['Enums']['role'];
  name: string;
  avatarUrl?: string | null;
}

interface JwtClaims {
  sub?: string;
  email?: string;
  app_role?: Database['public']['Enums']['role'];
  role?: Database['public']['Enums']['role'];
  name?: string;
  exp?: number;
  [k: string]: unknown;
}

/**
 * Map a Supabase Session → AppUser. Reads role from the JWT app_role
 * custom claim; falls back to user_metadata.role if the access token
 * hook isn't wired (e.g. local dev before deploying).
 */
export function userFromSession(session: Session | null | undefined): AppUser | null {
  if (!session?.user) return null;
  const u = session.user;
  const claims = decodeJwtClaims(session.access_token);
  return {
    id: u.id,
    email: u.email,
    role:
      claims.app_role ??
      (u.user_metadata?.role as Database['public']['Enums']['role'] | undefined) ??
      'AME',
    name:
      (u.user_metadata?.name as string | undefined) ??
      (u.email ? u.email.split('@')[0] : 'Naluka User'),
  };
}

/**
 * Lightweight base64url decode of a JWT payload. No signature verification
 * here — the gateway already verifies; we just want to read claims
 * client-side. Returns {} on any failure.
 */
export function decodeJwtClaims(token: string | null | undefined): JwtClaims {
  if (!token) return {};
  try {
    const payload = token.split('.')[1];
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(padded)) as JwtClaims;
  } catch {
    return {};
  }
}

/**
 * Recursive snake_case → camelCase converter for Supabase rows.
 *
 * The Postgres schema is snake_case (standard); the existing UI consumes
 * camelCase. Apply to every supabase.from(...).select() result before
 * returning to the SPA.
 *
 * Generic over input/output so callers can keep their type narrowing.
 * Skips Date/Buffer/etc. — only walks plain objects and arrays.
 */
export function snakeToCamel<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map((x) => snakeToCamel(x)) as unknown as T;
  if (obj instanceof Date) return obj as unknown as T;
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      out[camel] = snakeToCamel(v);
    }
    return out as T;
  }
  return obj as T;
}
