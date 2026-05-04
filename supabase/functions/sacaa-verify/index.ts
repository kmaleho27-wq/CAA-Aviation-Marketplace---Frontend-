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
//
// Discipline-aware response: in addition to the legacy fields
// (licence, valid, holderName, rating, expires, source, reason) we now
// also return the structured taxonomy columns from migration 0006
// (discipline, sacaa_part, licence_subtype, aircraft_category,
// medical_class, endorsements, type_ratings) when available.
//
// non_licensed personnel (firemen, marshallers, etc.) carry no SACAA
// licence, so the lookup key is the platform's free-form `license`
// column (e.g. 'NL-FIRE-2024-0023'). We still return valid=true if the
// row's `status` is verified — the value lives in the platform DB only,
// SACAA's API has no opinion on these.
async function verifyLicence(sb: ReturnType<typeof adminClient>, licence: string) {
  // Look up the platform row first — we need the discipline to decide
  // whether to call SACAA at all. SACAA only knows about Parts 61-71;
  // non_licensed personnel are platform-only.
  const { data: ppl } = await sb
    .from('personnel').select('*').eq('license', licence).maybeSingle();

  const shouldCallSacaa =
    SACAA_ENABLED && (!ppl || ppl.discipline !== 'non_licensed');

  if (shouldCallSacaa) {
    try {
      const remote = await callSacaa<Record<string, unknown>>(`/licences/${encodeURIComponent(licence)}`);
      return {
        licence,
        valid: Boolean(remote.valid),
        holderName: remote.holderName,
        rating: remote.rating,
        expires: remote.expires,
        // Structured fields from SACAA, fall back to platform row if absent.
        discipline:        remote.discipline        ?? ppl?.discipline ?? null,
        sacaa_part:        remote.sacaa_part        ?? ppl?.sacaa_part ?? null,
        licence_subtype:   remote.licence_subtype   ?? ppl?.licence_subtype ?? null,
        aircraft_category: remote.aircraft_category ?? ppl?.aircraft_category ?? null,
        medical_class:     remote.medical_class     ?? ppl?.medical_class ?? null,
        endorsements:      remote.endorsements      ?? ppl?.endorsements ?? [],
        type_ratings:      remote.type_ratings      ?? ppl?.types ?? [],
        source: 'sacaa-api',
        reason: remote.reason,
      };
    } catch (e) {
      console.warn('[sacaa-verify] remote licence failed, falling back:', (e as Error).message);
    }
  }

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
    discipline:        ppl.discipline,
    sacaa_part:        ppl.sacaa_part,
    licence_subtype:   ppl.licence_subtype,
    aircraft_category: ppl.aircraft_category,
    medical_class:     ppl.medical_class,
    endorsements:      ppl.endorsements ?? [],
    type_ratings:      ppl.types ?? [],
    non_licensed_role: ppl.non_licensed_role ?? null,
    source: 'platform-db',
    reason: valid ? undefined : `Licence status: ${ppl.status}`,
  };
}

async function verifyMedical(sb: ReturnType<typeof adminClient>, licence: string) {
  // Look up the row first so we know the expected medical_class.
  const { data: ppl } = await sb
    .from('personnel').select('id, discipline, medical_class').eq('license', licence).maybeSingle();

  // AMEs, DAMEs and non-licensed roles (firemen, marshallers, etc.)
  // categorically don't carry SACAA medicals — sign-off question 4.
  // Return n/a so callers don't render a misleading "no medical" warning.
  if (ppl && ppl.medical_class === 'none') {
    return {
      licence,
      classOne: false,
      medical_class: 'none',
      not_applicable: true,
      source: 'platform-db',
      reason: `Discipline ${ppl.discipline} does not require a SACAA medical.`,
    };
  }

  if (SACAA_ENABLED) {
    try {
      const remote = await callSacaa<Record<string, unknown>>(`/medicals/${encodeURIComponent(licence)}`);
      return {
        licence,
        classOne: Boolean(remote.classOne),
        medical_class: remote.medical_class ?? ppl?.medical_class ?? null,
        expires: remote.expires,
        source: 'sacaa-api',
      };
    } catch { /* fall through */ }
  }

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
    medical_class: ppl.medical_class,
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
