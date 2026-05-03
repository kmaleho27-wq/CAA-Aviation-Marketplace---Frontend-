import { supabase, snakeToCamel } from '../lib/supabase';

/**
 * Marketplace personnel listing.
 *
 * Privacy split (D2 → B): the `personnel_public` view masks the licence
 * number, daily rate, and exact expiry date. Operators only see those
 * fields once a transaction links the two parties (which RLS allows on
 * the underlying `personnel` table).
 *
 * Filters:
 *   - filter: 'available' | 'verified' | 'all' (legacy semantics)
 */
export async function listPersonnel({ filter = 'all' } = {}) {
  let q = supabase
    .from('personnel_public')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter === 'available') q = q.eq('available', true);
  if (filter === 'verified')  q = q.eq('status', 'verified');

  const { data, error } = await q;
  if (error) throw error;
  return snakeToCamel(data);
}

/**
 * Hire a contractor: creates a Personnel-type transaction in 'in-escrow'
 * with a Stripe payment intent. Goes through the same Edge Function as
 * procurePart. Phase 4 wires it.
 */
export async function hireContractor(id) {
  const { data, error } = await supabase.functions.invoke('payments-create-intent', {
    body: { kind: 'personnel', personnelId: id },
  });
  if (error) {
    if (error.message?.includes('Function not found') || error.context?.status === 404) {
      throw new Error('Payments are not yet wired (Phase 4 — Edge Functions). The schema and audit chain are ready.');
    }
    throw error;
  }
  return snakeToCamel(data);
}
