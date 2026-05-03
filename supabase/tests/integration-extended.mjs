#!/usr/bin/env node
/**
 * Extended live integration test — read-only sweep of every API module
 * against the deployed Supabase project. Companion to integration-live.mjs;
 * that one validates auth + JWT hook + RLS basics, this one validates
 * actual data shapes returned by each src/api/*.js module's real query.
 *
 * Read-only by design — no state changes to the live project. Safe to
 * run repeatedly in CI.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node supabase/tests/integration-extended.mjs
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY required');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const test = (ok, name, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

console.log('▼ Extended live integration test against', url, '\n');

// ── Login as operator ──────────────────────────────────────
const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
  email: 'operator@naluka.aero',
  password: 'demo1234',
});
test(!authErr, 'Login operator@naluka.aero', authErr?.message);
if (authErr) process.exit(1);
const operatorId = authData.session.user.id;

// ── 1. dashboard.js — getKpis ──────────────────────────────
{
  const [aogCount, escrowSum] = await Promise.all([
    sb.from('aog_event').select('*', { count: 'exact', head: true }).eq('active', true),
    sb.from('transaction').select('amount, status').in('status', ['in-escrow', 'rts-pending']),
  ]);
  test(!aogCount.error && aogCount.count >= 0,
    `dashboard: AOG events count = ${aogCount.count}`, aogCount.error?.message);
  test(!escrowSum.error,
    `dashboard: escrow query (${escrowSum.data?.length ?? 0} in-flight txns)`, escrowSum.error?.message);
}

// ── 2. dashboard.js — getAogEvents ─────────────────────────
{
  const { data, error } = await sb.from('aog_event').select('*').eq('active', true)
    .order('created_at', { ascending: false });
  test(!error && (data?.length ?? 0) === 3,
    `dashboard: 3 AOG events seeded`, error?.message || `got ${data?.length}`);
}

// ── 3. parts.js — listParts ───────────────────────────────
{
  const { data, error } = await sb.from('part').select('*');
  test(!error && data?.length === 6, `parts: 6 rows`, error?.message || `got ${data?.length}`);
  // Spot-check a column we expect
  const aogParts = data?.filter((p) => p.aog) ?? [];
  test(aogParts.length === 2, `parts: 2 AOG parts`, `got ${aogParts.length}`);
}

// ── 4. personnel.js — listPersonnel via personnel_public ──
{
  const { data, error } = await sb.from('personnel_public').select('*');
  test(!error && data?.length === 6, `personnel_public: 6 rows`, error?.message || `got ${data?.length}`);
  // PII masking — license/rate/expires must NOT be present
  const cols = data?.[0] ? Object.keys(data[0]) : [];
  const leaks = cols.filter((c) => ['license', 'rate', 'expires'].includes(c));
  test(leaks.length === 0, `personnel_public: PII masked`, leaks.length ? `leaked ${leaks.join(',')}` : '');
}

// ── 5. documents.js — listDocuments ───────────────────────
{
  // Operator can read public-cert docs (Release Cert, Org Cert, RTS, Import Clearance) per RLS
  const { data, error } = await sb.from('document').select('*')
    .order('issued', { ascending: false });
  test(!error, `documents: list query succeeds`, error?.message);
  // Verify the public-cert filter logic — operator should see at least the 5 public-type docs
  const publicTypes = ['Release Certificate', 'Organisation Cert', 'Release to Service', 'Import Clearance'];
  const publicDocs = data?.filter((d) => publicTypes.includes(d.type)) ?? [];
  test(publicDocs.length >= 4, `documents: public-cert docs visible to operator`, `got ${publicDocs.length}`);
}

// ── 6. transactions.js — listTransactions ─────────────────
{
  // Operator has no buyer_id/seller_id on seeded txns (legacy seed pattern).
  // RLS denies by default unless user is admin or counterparty. Operator
  // should see 0 rows. This is the C1 fix — null-safe predicate.
  const { data, error } = await sb.from('transaction').select('*');
  test(!error, `transactions: query without RLS error`, error?.message);
  test(data?.length === 0,
    `transactions: operator sees 0 rows (RLS C1 fix — nullable buyer/seller)`,
    `got ${data?.length}`);
}

// ── 7. notifications.js — listNotifications ───────────────
{
  // Operator was seeded with 5 notifications targeting their user_id
  const { data, error } = await sb.from('notification').select('*')
    .order('created_at', { ascending: false });
  test(!error, `notifications: query succeeds`, error?.message);
  test(data?.length === 5, `notifications: operator has 5 rows`, `got ${data?.length}`);
  const unread = data?.filter((n) => n.unread) ?? [];
  test(unread.length === 2, `notifications: 2 unread`, `got ${unread.length}`);
}

// ── 8. contractor.js — listJobs (operator can also see jobs) ──
{
  const { data, error } = await sb.from('job').select('*');
  test(!error && data?.length === 3, `jobs: 3 rows visible`, error?.message || `got ${data?.length}`);
}

// ── 9. profile read (cross-user reads work for marketplace) ──
{
  const { data, error } = await sb.from('profile').select('id, email, name, role');
  test(!error && data?.length === 3, `profiles: 3 visible`, error?.message || `got ${data?.length}`);
  const names = (data ?? []).map((p) => p.name).sort();
  test(names.includes('Trust Admin'), `profiles: admin name visible`, `names: ${names.join(',')}`);
}

// ── 10. Switch to admin, validate cross-RLS visibility ─────
await sb.auth.signOut();
const { data: adminAuth, error: adminErr } = await sb.auth.signInWithPassword({
  email: 'admin@naluka.aero',
  password: 'demo1234',
});
test(!adminErr, 'Login admin@naluka.aero', adminErr?.message);
if (adminErr) process.exit(1);

// Admin sees ALL transactions (RLS allows is_admin)
{
  const { data, error } = await sb.from('transaction').select('id, status');
  test(!error, `admin: transaction query succeeds`, error?.message);
  test(data?.length === 7, `admin: all 7 transactions visible`, `got ${data?.length}`);
  const inEscrow = data?.filter((t) => t.status === 'in-escrow').length ?? 0;
  test(inEscrow === 2, `admin: 2 in-escrow txns`, `got ${inEscrow}`);
}

// Admin sees KYC + disputes
{
  const [kyc, disp] = await Promise.all([
    sb.from('kyc_application').select('*'),
    sb.from('dispute').select('*'),
  ]);
  test(!kyc.error && kyc.data?.length === 5, `admin: 5 KYC apps`, kyc.error?.message || `got ${kyc.data?.length}`);
  test(!disp.error && disp.data?.length === 2, `admin: 2 disputes`, disp.error?.message || `got ${disp.data?.length}`);
}

// Admin can call verify_chain (audit chain currently empty — that's expected)
{
  const { data, error } = await sb.rpc('verify_chain');
  test(!error, `admin: verify_chain RPC succeeds`, error?.message);
  // Empty chain → valid=true, total=0
  test(data?.[0]?.valid === true && data?.[0]?.total === 0,
    `audit chain valid (total=${data?.[0]?.total ?? '?'})`, JSON.stringify(data?.[0]));
}

await sb.auth.signOut();

console.log(`\n${pass}/${pass + fail} tests passed`);
process.exit(fail > 0 ? 1 : 0);
