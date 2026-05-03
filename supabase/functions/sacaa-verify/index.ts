// sacaa-verify
//
// Port of server/src/lib/sacaa.ts. Calls the SACAA e-Services API if
// SACAA_API_BASE/SACAA_API_KEY are configured, otherwise falls back to
// the platform DB (so demo flows still resolve).
//
// Body:   { kind: 'licence' | 'medical' | 'csd', value: string }
// Returns: { source, valid|active, ...kind-specific fields }
//
// Rate limited: 30 requests / minute / user (review fix M3).
//
// config.toml: verify_jwt = true.

import { adminClient, getCallingUser } from '../_shared/supabase.ts';
import { json, error, preflight } from '../_shared/cors.ts';

const SACAA_BASE = (Deno.env.get('SACAA_API_BASE') ?? '').replace(/\/+$/, '');
const SACAA_KEY = Deno.env.get('SACAA_API_KEY') ?? '';
const SACAA_ENABLED = Boolean(SACAA_BASE && SACAA_KEY);

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const user = await getCallingUser(req);
  if (!user) return error('Unauthorized', 401);

  // Rate limit per user
  const sb = adminClient();
  if (!(await consumeRateBudget(sb, `sacaa:${user.userId}`))) {
    return error('Rate limit exceeded — try again in a minute', 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return error('Invalid JSON body');
  const { kind, value } = body as { kind?: string; value?: string };
  if (!kind || !value) return error('kind and value are required');

  switch (kind) {
    case 'licence': return json(await verifyLicence(sb, value));
    case 'medical': return json(await verifyMedical(sb, value));
    case 'csd':     return json(await verifyCsd(value));
    default: return error(`Unsupported kind: ${kind}`);
  }
});

// ─── Verification logic ────────────────────────────────────────────
async function verifyLicence(sb: ReturnType<typeof adminClient>, licence: string) {
  if (SACAA_ENABLED) {
    try {
      const remote = await callSacaa<Record<string, unknown>>(`/licences/${encodeURIComponent(licence)}`);
      return {
        licence,
        valid: Boolean(remote.valid),
        holderName: remote.holderName,
        rating: remote.rating,
        expires: remote.expires,
        source: 'sacaa-api',
        reason: remote.reason,
      };
    } catch (e) {
      console.warn('[sacaa-verify] remote licence failed, falling back:', (e as Error).message);
    }
  }

  const { data: ppl } = await sb
    .from('personnel').select('*').eq('license', licence).maybeSingle();
  if (!ppl) {
    return { licence, valid: false, source: 'platform-db', reason: 'Licence not found' };
  }
  const valid = ppl.status === 'verified' || ppl.status === 'expiring';
  return {
    licence,
    valid,
    holderName: ppl.name,
    rating: ppl.rating,
    expires: ppl.expires ? new Date(ppl.expires).toISOString().slice(0, 10) : null,
    source: 'platform-db',
    reason: valid ? undefined : `Licence status: ${ppl.status}`,
  };
}

async function verifyMedical(sb: ReturnType<typeof adminClient>, licence: string) {
  if (SACAA_ENABLED) {
    try {
      const remote = await callSacaa<Record<string, unknown>>(`/medicals/${encodeURIComponent(licence)}`);
      return {
        licence,
        classOne: Boolean(remote.classOne),
        expires: remote.expires,
        source: 'sacaa-api',
      };
    } catch { /* fall through */ }
  }

  const { data: ppl } = await sb
    .from('personnel').select('id').eq('license', licence).maybeSingle();
  if (!ppl) return { licence, classOne: false, source: 'platform-db' };

  const { data: medical } = await sb
    .from('document')
    .select('status, expires')
    .eq('personnel_id', ppl.id)
    .eq('type', 'Medical Certificate')
    .maybeSingle();
  return {
    licence,
    classOne: medical?.status === 'verified',
    expires: medical?.expires ? new Date(medical.expires).toISOString().slice(0, 10) : null,
    source: 'platform-db',
  };
}

async function verifyCsd(csdNumber: string) {
  if (SACAA_ENABLED) {
    try {
      const remote = await callSacaa<Record<string, unknown>>(`/csd/${encodeURIComponent(csdNumber)}`);
      return {
        csdNumber,
        active: Boolean(remote.active),
        taxCompliant: Boolean(remote.taxCompliant),
        source: 'csd-api',
      };
    } catch { /* fall through */ }
  }
  const looksValid = /^ZA-\d{4}-\d{4}$/.test(csdNumber);
  return { csdNumber, active: looksValid, taxCompliant: looksValid, source: 'platform-db' };
}

async function callSacaa<T>(path: string): Promise<T> {
  const res = await fetch(SACAA_BASE + path, {
    headers: { Authorization: `Bearer ${SACAA_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`SACAA ${res.status}: ${(await res.text().catch(() => '')) || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Rate limit ────────────────────────────────────────────────────
async function consumeRateBudget(sb: ReturnType<typeof adminClient>, key: string): Promise<boolean> {
  const now = Date.now();
  const windowStart = new Date(now - (now % RATE_WINDOW_MS)).toISOString();

  const { data: row } = await sb
    .from('rate_limit')
    .select('count')
    .eq('key', key)
    .eq('window_start', windowStart)
    .maybeSingle();

  if (row && row.count >= RATE_LIMIT) return false;

  if (row) {
    await sb.from('rate_limit').update({ count: row.count + 1 }).eq('key', key).eq('window_start', windowStart);
  } else {
    await sb.from('rate_limit').insert({ key, window_start: windowStart, count: 1 });
  }
  return true;
}
