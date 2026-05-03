import { supabase, snakeToCamel } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────
// Admin module. Every read here is RLS-gated to ADMIN by the underlying
// table policies (see 0001_init.sql). Every write goes through one of the
// SECURITY DEFINER RPCs in 0002_user_rpcs.sql which check is_admin() inside.
// ─────────────────────────────────────────────────────────────────────

/**
 * Top-of-page KPIs + recent KYC + open dispute count for the admin
 * overview screen. Shape matches what src/pages/admin/Overview.jsx expects.
 *
 * Returns:
 *   {
 *     kpis: [{ label, value, sub, tone }],
 *     recentKyc: [{ id, name, type, license, risk, submitted, ... }],
 *     openDisputes: number,
 *     expiryWatch: [...],
 *   }
 */
export async function getAdminOverview() {
  const [pendingKyc, openDisputes, expiringDocs, activeAog, recentKycRows] = await Promise.all([
    supabase.from('kyc_application').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('dispute').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('document').select('id, name, expires, status').eq('status', 'expiring').order('expires', { ascending: true }).limit(5),
    supabase.from('aog_event').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('kyc_application').select('*').eq('status', 'pending').order('submitted_at', { ascending: false }).limit(5),
  ]);

  for (const r of [pendingKyc, openDisputes, expiringDocs, activeAog, recentKycRows]) {
    if (r.error) throw r.error;
  }

  return {
    kpis: [
      { label: 'KYC pending',   value: String(pendingKyc.count ?? 0),           sub: 'awaiting review', tone: 'primary' },
      { label: 'Open disputes', value: String(openDisputes.count ?? 0),         sub: 'funds locked',    tone: 'warning' },
      { label: 'Active AOG',    value: String(activeAog.count ?? 0),            sub: 'live events',     tone: 'aog'     },
      { label: 'Expiring docs', value: String(expiringDocs.data?.length ?? 0), sub: 'next 30 days',    tone: 'warning' },
    ],
    openDisputes: openDisputes.count ?? 0,
    recentKyc: snakeToCamel(recentKycRows.data ?? []).map((k) => ({
      ...k,
      submitted: timeAgo(k.submittedAt),
    })),
    expiryWatch: snakeToCamel(expiringDocs.data ?? []),
  };
}

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── KYC ──────────────────────────────────────────────────────────────
export async function listKyc() {
  const { data, error } = await supabase
    .from('kyc_application')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data);
}

export async function approveKyc(id) {
  const { data, error } = await supabase.rpc('approve_kyc', { p_id: id });
  if (error) throw error;
  return snakeToCamel(data);
}

export async function rejectKyc(id) {
  const { data, error } = await supabase.rpc('reject_kyc', { p_id: id });
  if (error) throw error;
  return snakeToCamel(data);
}

// ── Disputes ─────────────────────────────────────────────────────────
export async function listDisputes() {
  const { data, error } = await supabase
    .from('dispute')
    .select('*')
    .order('opened_at', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data);
}

export async function resolveDispute(id, outcome) {
  const { data, error } = await supabase.rpc('resolve_dispute', { p_id: id, p_outcome: outcome });
  if (error) throw error;
  return snakeToCamel(data);
}

// ── Analytics ────────────────────────────────────────────────────────
/**
 * Heavier dashboard: GMV by day for the last 30 days, KPI bar, etc.
 * Computed from the transaction table. Real-time enough for v1; if it
 * becomes hot, materialize into a `daily_gmv` summary.
 */
export async function getAnalytics() {
  // Last 30 days of completed transactions, summed by day.
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [txns, completedCount, escrowSum] = await Promise.all([
    supabase.from('transaction').select('amount, created_at, status').gte('created_at', since.toISOString()),
    supabase.from('transaction').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('transaction').select('amount, status').in('status', ['in-escrow', 'rts-pending']),
  ]);

  for (const r of [txns, completedCount, escrowSum]) if (r.error) throw r.error;

  const gmvByDay = bucketByDay(txns.data ?? []);
  const escrowZar = (escrowSum.data ?? []).reduce((s, t) => s + parseAmount(t.amount), 0);

  return {
    kpis: [
      { label: 'Completed (30d)', value: String(completedCount.count ?? 0), tone: 'positive' },
      { label: 'Escrow (live)',   value: formatZar(escrowZar),                tone: 'neutral'  },
      { label: 'GMV (30d)',       value: formatZar(gmvByDay.reduce((s, b) => s + b.value, 0)), tone: 'positive' },
    ],
    gmvBars: gmvByDay,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────
function parseAmount(amount) {
  const n = Number(String(amount ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function formatZar(n) { return `ZAR ${n.toLocaleString('en-ZA')}`; }

function bucketByDay(rows) {
  const buckets = new Map();
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    buckets.set(day, (buckets.get(day) ?? 0) + parseAmount(r.amount));
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, value]) => ({ day, value }));
}
