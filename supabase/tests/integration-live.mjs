#!/usr/bin/env node
/**
 * Live integration smoke test against the deployed Supabase project.
 *
 * What it verifies (end-to-end, against real Supabase):
 *   1. Login with email+password works (Auth → JWT issued)
 *   2. JWT contains the `app_role` custom claim from the access token hook
 *      (proves Step B in the deploy was successful)
 *   3. RLS lets operator user read parts (public marketplace) — should succeed
 *   4. RLS blocks operator from reading audit_event (admin-only) — should fail
 *   5. personnel_public view returns rows but only safe columns
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node supabase/tests/integration-live.mjs
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY required');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch { return null; }
}

const log  = (ok, name, detail = '') => console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
let pass = 0, fail = 0;
const test = (ok, name, detail) => { ok ? pass++ : fail++; log(ok, name, detail); };

console.log('▼ Live integration test against', url, '\n');

// ── 1. Login ───────────────────────────────────────────────
const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
  email: 'operator@naluka.aero',
  password: 'demo1234',
});
test(!authErr && !!auth?.session, 'Login operator@naluka.aero', authErr?.message);
if (authErr) { process.exit(1); }

// ── 2. JWT app_role claim ─────────────────────────────────
const claims = decodeJwt(auth.session.access_token);
test(claims?.app_role === 'OPERATOR',
  'JWT contains app_role=OPERATOR (custom hook wired)',
  `got app_role=${claims?.app_role ?? 'missing'}`);

// ── 3. Read parts (public marketplace, RLS allows authenticated) ──
const { data: parts, error: partsErr } = await sb.from('part').select('id, name, pn').limit(3);
test(!partsErr && (parts?.length ?? 0) > 0,
  `RLS allows operator to read parts (${parts?.length ?? 0} rows)`,
  partsErr?.message);

// ── 4. audit_event admin-only — operator must see 0 rows (RLS denies) ──
const { data: audit, error: auditErr } = await sb.from('audit_event').select('id').limit(1);
// RLS on audit_event has only an "admin select" policy. Non-admins get 0 rows
// (PostgREST returns empty array when RLS filters everything out, not an error).
test(!auditErr && (audit?.length ?? 0) === 0,
  `RLS denies operator from audit_event (got ${audit?.length ?? 0} rows)`,
  auditErr?.message);

// ── 5. personnel_public view returns rows with safe columns only ──
const { data: ppl, error: pplErr } = await sb.from('personnel_public').select('*').limit(1);
const cols = ppl?.[0] ? Object.keys(ppl[0]) : [];
const leaked = cols.filter((c) => ['license', 'rate', 'expires'].includes(c));
test(!pplErr && cols.length > 0 && leaked.length === 0,
  `personnel_public view masks PII (${cols.length} cols, ${leaked.length} leaked)`,
  pplErr?.message || (leaked.length ? `leaked: ${leaked.join(',')}` : ''));

// ── 6. Login as admin, verify app_role=ADMIN ──────────────
await sb.auth.signOut();
const { data: adminAuth } = await sb.auth.signInWithPassword({
  email: 'admin@naluka.aero',
  password: 'demo1234',
});
const adminClaims = decodeJwt(adminAuth?.session?.access_token);
test(adminClaims?.app_role === 'ADMIN',
  'Admin user JWT has app_role=ADMIN',
  `got ${adminClaims?.app_role ?? 'missing'}`);

// ── 7. Admin can read audit_event (chain currently empty but query succeeds) ──
const { error: adminAuditErr } = await sb.from('audit_event').select('id').limit(1);
test(!adminAuditErr,
  'Admin can query audit_event without RLS error',
  adminAuditErr?.message);

await sb.auth.signOut();

console.log(`\n${pass}/${pass + fail} tests passed`);
process.exit(fail > 0 ? 1 : 0);
