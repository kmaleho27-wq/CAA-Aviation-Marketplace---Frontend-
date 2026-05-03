import { supabase, snakeToCamel } from '../lib/supabase';

/**
 * Contractor wallet (mobile screen). Returns the shape src/pages/mobile/
 * Wallet.jsx consumes:
 *   user:     { name, role, rating, license }
 *   docs:     [{ ref, name, status, expires }]
 *   earnings: [{ label, value, tone }]
 */
export async function getWallet() {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error('Not signed in.');

  // Personnel row linked to this auth user (full row, RLS allows self).
  const { data: personnel } = await supabase
    .from('personnel')
    .select('id, name, role, rating, license, location')
    .eq('user_id', u.user.id)
    .maybeSingle();

  // Linked compliance docs (licence, medical, etc.) for this contractor.
  const { data: docs } = personnel
    ? await supabase
        .from('document')
        .select('ref_number, name, status, expires')
        .eq('personnel_id', personnel.id)
        .order('expires', { ascending: true })
    : { data: [] };

  // Earnings: completed Personnel transactions where the contractor was
  // the seller. RLS lets sellers see their own.
  const { data: completedTxns } = await supabase
    .from('transaction')
    .select('amount, created_at')
    .eq('type', 'Personnel')
    .eq('status', 'completed')
    .eq('seller_id', u.user.id);

  const txns = completedTxns ?? [];
  const totalCents = txns.reduce((s, t) => s + parseAmount(t.amount), 0);
  const now = new Date();
  const thisMonthCents = txns
    .filter((t) => {
      const d = new Date(t.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, t) => s + parseAmount(t.amount), 0);

  return {
    user: {
      name:    personnel?.name    ?? u.user.email,
      role:    personnel?.role    ?? 'AME',
      rating:  personnel?.rating  ?? '—',
      license: personnel?.license ?? '—',
    },
    docs: (docs ?? []).map((d) => ({
      ref:     d.ref_number,
      name:    d.name,
      status:  d.status,
      expires: d.expires ? new Date(d.expires).toISOString().slice(0, 10) : '—',
    })),
    earnings: [
      { label: 'This Month',   value: formatZar(thisMonthCents), tone: 'success' },
      { label: 'Year-to-date', value: formatZar(totalCents),     tone: 'primary' },
    ],
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

  // JobDetail.jsx reads `job.rating` (the required licence rating) — alias
  // ratingReq → rating so the UI doesn't have to learn the schema name.
  return snakeToCamel(sorted).map((j) => ({ ...j, rating: j.ratingReq ?? j.rating }));
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
