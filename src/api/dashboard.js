import { supabase, snakeToCamel } from '../lib/supabase';

/**
 * Dashboard KPIs are computed client-side from a couple of cheap counts/sums.
 * Mirrors what server/src/services/dashboard.ts produced. Returns the same
 * shape the existing UI consumes:
 *   [{ label, value, delta, tone }]
 */
export async function getKpis() {
  const [aogCount, escrowSum] = await Promise.all([
    supabase.from('aog_event').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('transaction').select('amount, status').in('status', ['in-escrow', 'rts-pending']),
  ]);

  if (aogCount.error)  throw aogCount.error;
  if (escrowSum.error) throw escrowSum.error;

  const escrowZar = (escrowSum.data ?? []).reduce((sum, t) => sum + parseAmount(t.amount), 0);

  return [
    { label: 'Active AOG Events', value: String(aogCount.count ?? 0), sub: 'live across the fleet',    tone: 'aog'     },
    { label: 'Escrow Balance',    value: formatZar(escrowZar),         sub: 'in-flight transactions',  tone: 'mustard' },
  ];
}

export async function getAogEvents() {
  const { data, error } = await supabase
    .from('aog_event')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data);
}

// ── Helpers
function parseAmount(amount) {
  const n = Number(String(amount ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatZar(n) {
  return `ZAR ${n.toLocaleString('en-ZA')}`;
}
