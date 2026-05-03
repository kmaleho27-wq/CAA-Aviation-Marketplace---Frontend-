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
export async function listPersonnel(opts: { filter?: 'available' | 'verified' | 'all' } = {}) {
  const { filter = 'all' } = opts;
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
 * Hire a contractor. Creates a Personnel-type transaction in 'in-escrow'
 * status and signs a PayFast checkout payload. Same Edge Function path
 * as procurePart, just with kind='personnel'.
 */
export async function hireContractor(id: string) {
  const { data, error } = await supabase.functions.invoke('payfast-create-payment', {
    body: { kind: 'personnel', personnelId: id },
  });
  if (error) {
    if (error.message?.includes('Function not found') || (error as { context?: { status?: number } })?.context?.status === 404) {
      throw new Error('Payments not yet deployed. Run `supabase functions deploy payfast-create-payment`.');
    }
    throw error;
  }
  return snakeToCamel(data);
}
