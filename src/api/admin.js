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
 * Heavier dashboard. Returns the shape src/pages/admin/Analytics.jsx
 * consumes:
 *   kpis:         [{ label, value, sub, tone }]
 *   gmv:          [{ label: 'Jun', gmv: <ZAR millions> }]   — 6 monthly buckets
 *   expiryWatch:  [{ doc, name, days }]                      — top 10 expiring docs
 */
export async function getAnalytics() {
  const [allTxns, completedCount, escrowSum, expiringDocs] = await Promise.all([
    supabase.from('transaction').select('amount, created_at, status'),
    supabase.from('transaction').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('transaction').select('amount, status').in('status', ['in-escrow', 'rts-pending']),
    supabase.from('document').select('name, type, expires').eq('status', 'expiring').not('expires', 'is', null).order('expires', { ascending: true }).limit(10),
  ]);

  for (const r of [allTxns, completedCount, escrowSum, expiringDocs]) if (r.error) throw r.error;

  const escrowZar = (escrowSum.data ?? []).reduce((s, t) => s + parseAmount(t.amount), 0);
  const gmv = bucketByMonth(allTxns.data ?? []);
  const gmvTotal = gmv.reduce((s, b) => s + b.gmv, 0);

  return {
    kpis: [
      { label: 'Completed all-time', value: String(completedCount.count ?? 0), sub: 'transactions',      tone: 'success' },
      { label: 'Escrow (live)',      value: formatZar(escrowZar),               sub: 'awaiting RTS',      tone: 'warning' },
      { label: 'GMV (6 months)',     value: `ZAR ${gmvTotal}M`,                  sub: 'gross merchandise', tone: 'primary' },
    ],
    gmv,
    expiryWatch: (expiringDocs.data ?? []).map((d) => ({
      doc:  d.type ?? 'Document',
      name: d.name,
      days: d.expires
        ? Math.max(0, Math.floor((new Date(d.expires).getTime() - Date.now()) / 86_400_000))
        : 0,
    })),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────
function parseAmount(amount) {
  const n = Number(String(amount ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function formatZar(n) { return `ZAR ${n.toLocaleString('en-ZA')}`; }

/**
 * Bucket transactions into 6 monthly buckets — current month and the 5
 * preceding ones. Returns at minimum 6 entries (zero-filled) so the
 * bar chart in Analytics.jsx has something to render even when the
 * project has no transactions yet.
 */
function bucketByMonth(rows) {
  const now = new Date();
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('en', { month: 'short' });
    const totalCents = rows
      .filter((r) => {
        const rd = new Date(r.created_at);
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
      })
      .reduce((s, t) => s + parseAmount(t.amount), 0);
    buckets.push({ label, gmv: Math.max(0, Math.round(totalCents / 1_000_000)) });
  }
  return buckets;
}
