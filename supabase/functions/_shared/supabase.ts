import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Service-role client. Bypasses RLS — only call this from inside an
 * Edge Function after you've validated the request (Stripe signature,
 * cron secret, or end-user JWT via userClient first).
 */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Anon client scoped to the calling user's JWT. Use to read the auth
 * context (`auth.getUser()`) without bypassing RLS.
 */
export function userClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    },
  );
}

/**
 * Read the calling user from the request. Returns { userId, email } or
 * null when unauthenticated. Throws never.
 */
export async function getCallingUser(req: Request): Promise<{ userId: string; email: string } | null> {
  const auth = req.headers.get('Authorization');
  if (!auth) return null;
  const sb = userClient(auth);
  const { data } = await sb.auth.getUser();
  if (!data?.user) return null;
  return { userId: data.user.id, email: data.user.email ?? '' };
}

/**
 * For scheduled functions (pg_cron, Postgres → net.http_post). The cron
 * job sends an Authorization header carrying our shared secret.
 */
export function isCronAuthorized(req: Request): boolean {
  const expected = Deno.env.get('CRON_SECRET');
  if (!expected) return false;
  const got = req.headers.get('x-cron-secret');
  return got === expected;
}
