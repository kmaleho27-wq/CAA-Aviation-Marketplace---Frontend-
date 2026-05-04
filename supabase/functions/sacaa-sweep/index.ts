// sacaa-sweep
//
// Scheduled by pg_cron (see 0003_pg_cron.sql). Re-verifies the licence
// status of every personnel row whose `expires` is within 60 days, and
// flips status verified → expiring as needed. Skips rows that are already
// `expired` or `pending`.
//
// Auth: pg_cron passes the CRON_SECRET via x-cron-secret header.
// config.toml: verify_jwt = false.

import { adminClient, isCronAuthorized } from '../_shared/supabase.ts';

const SACAA_BASE = (Deno.env.get('SACAA_API_BASE') ?? '').replace(/\/+$/, '');
const SACAA_KEY = Deno.env.get('SACAA_API_KEY') ?? '';
const SACAA_ENABLED = Boolean(SACAA_BASE && SACAA_KEY);

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (!isCronAuthorized(req)) {
    return new Response('Forbidden', { status: 403 });
  }

  const sb = adminClient();
  const horizon = new Date(Date.now() + SIXTY_DAYS_MS).toISOString();

  let scanned = 0;
  let touched = 0;
  let errMessage: string | null = null;

  try {
    const { data: rows, error: queryErr } = await sb
      .from('personnel')
      .select('id, license, status, expires')
      .in('status', ['verified', 'expiring'])
      .not('expires', 'is', null)
      .lte('expires', horizon);
    if (queryErr) throw queryErr;

    scanned = rows?.length ?? 0;

    for (const r of rows ?? []) {
      const fresh = await reverify(r.license);
      let nextStatus: 'verified' | 'expiring' | 'expired' | null = null;

      if (!fresh.valid) {
        nextStatus = 'expired';
      } else if (r.expires && new Date(r.expires).getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000) {
        nextStatus = 'expiring';
      } else {
        nextStatus = 'verified';
      }

      if (nextStatus && nextStatus !== r.status) {
        await sb.from('personnel').update({ status: nextStatus }).eq('id', r.id);
        touched++;
      }
    }
  } catch (e) {
    errMessage = (e as Error).message ?? 'unknown error';
  }

  // ── Heartbeat (migration 0013) ────────────────────────────────────
  await sb.rpc('record_cron_run', {
    p_job: 'sacaa-sweep',
    p_ok: errMessage === null,
    p_rows_affected: touched,
    p_error_msg: errMessage,
  });

  if (errMessage) {
    return new Response(`DB error: ${errMessage}`, { status: 500 });
  }

  return new Response(JSON.stringify({ scanned, touched }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function reverify(licence: string): Promise<{ valid: boolean }> {
  if (!SACAA_ENABLED) return { valid: true };  // platform-db trust by default
  try {
    const res = await fetch(`${SACAA_BASE}/licences/${encodeURIComponent(licence)}`, {
      headers: { Authorization: `Bearer ${SACAA_KEY}`, Accept: 'application/json' },
    });
    if (!res.ok) return { valid: true };  // soft-fail on transient SACAA errors
    const j = await res.json();
    return { valid: Boolean(j.valid) };
  } catch {
    return { valid: true };
  }
}
