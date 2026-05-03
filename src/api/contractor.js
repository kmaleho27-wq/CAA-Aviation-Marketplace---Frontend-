import { supabase, snakeToCamel } from '../lib/supabase';

/**
 * Contractor wallet. Aggregates earnings + recent payouts for the mobile
 * app screen. Computed from completed Personnel-type transactions where
 * the seller_id matches the current user (RLS already gates this).
 */
export async function getWallet() {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error('Not signed in.');

  // Find the personnel row (if any) linked to this user — earnings sum
  // works either via transaction.seller_id or transaction.personnel_id.
  const { data: personnel } = await supabase
    .from('personnel')
    .select('id, name, license, rate, available')
    .eq('user_id', user.user.id)
    .maybeSingle();

  const { data: txns, error } = await supabase
    .from('transaction')
    .select('id, type, item, party, amount, status, created_at')
    .eq('type', 'Personnel')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;

  const completed = (txns ?? []).filter((t) => t.status === 'completed');
  const totalEarned = completed.reduce((s, t) => s + parseAmount(t.amount), 0);

  return {
    contractor: snakeToCamel(personnel ?? {}),
    earnings: {
      total:    formatZar(totalEarned),
      completed: completed.length,
    },
    recent: snakeToCamel(txns ?? []),
  };
}

// ── Jobs ─────────────────────────────────────────────────────────────
export async function listJobs() {
  const { data, error } = await supabase
    .from('job')
    .select('*')
    .order('urgency', { ascending: false })       // 'aog' before 'normal' alphabetically — fix below
    .order('created_at', { ascending: false });
  if (error) throw error;

  // The enum sorts alphabetically (aog < normal — happens to be the order
  // we want), but be explicit: AOG always first.
  const sorted = [...(data ?? [])].sort((a, b) => {
    if (a.urgency === b.urgency) return new Date(b.created_at) - new Date(a.created_at);
    return a.urgency === 'aog' ? -1 : 1;
  });

  return snakeToCamel(sorted);
}

export async function acceptJob(id) {
  const { data, error } = await supabase.rpc('accept_job', { p_id: id });
  if (error) throw error;
  return snakeToCamel(data);
}

// ── Work order ───────────────────────────────────────────────────────
export async function getWorkOrder() {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error('Not signed in.');

  // Find the personnel row linked to this user, then their newest unsigned WO.
  const { data: personnel } = await supabase
    .from('personnel')
    .select('id')
    .eq('user_id', user.user.id)
    .maybeSingle();

  if (!personnel?.id) return null;

  const { data, error } = await supabase
    .from('work_order')
    .select('*')
    .eq('contractor_id', personnel.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? snakeToCamel(data) : null;
}

export async function signWorkOrder(reference) {
  // Caller may not pass a reference — fall back to the contractor's active WO.
  let ref = reference;
  if (!ref) {
    const wo = await getWorkOrder();
    if (!wo) throw new Error('No active work order to sign.');
    ref = wo.reference;
  }
  const { data, error } = await supabase.rpc('sign_work_order', { p_reference: ref });
  if (error) throw error;
  return snakeToCamel(data);
}

// ── Helpers
function parseAmount(amount) {
  const n = Number(String(amount ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function formatZar(n) { return `ZAR ${n.toLocaleString('en-ZA')}`; }
