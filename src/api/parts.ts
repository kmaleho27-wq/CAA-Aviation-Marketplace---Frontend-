import { supabase, snakeToCamel } from '../lib/supabase';

/**
 * Marketplace parts list. RLS allows all authenticated users to read.
 *
 * Filters:
 *   - search: substring match against name and pn
 *   - category: not currently a schema column; ignored for now (was used in
 *     the legacy Express handler for hardcoded categories). When the schema
 *     adds a `category` column, plug it in.
 */
export async function listParts(opts: { search?: string; category?: string } = {}) {
  const { search, category } = opts;
  let q = supabase.from('part').select('*').order('created_at', { ascending: false });

  if (search) {
    const term = `%${search.replace(/[%_]/g, '\\$&')}%`;
    q = q.or(`name.ilike.${term},pn.ilike.${term}`);
  }
  // category param accepted for backwards-compat; no-op until the schema grows it.
  void category;

  const { data, error } = await q;
  if (error) throw error;
  return snakeToCamel(data);
}

/**
 * Procure a part. Calls the payfast-create-payment Edge Function which:
 *   - creates a transaction row in 'in-escrow' status (buyer = current user)
 *   - signs a PayFast checkout payload
 *   - returns { checkoutUrl, params, transactionId, mode }
 *
 * The frontend then redirects the user to checkoutUrl. After they pay,
 * PayFast notifies our payfast-itn function server-side to flip the
 * transaction → completed and chain audit.
 *
 * In scaffold mode (PAYFAST_MERCHANT_ID unset on the Edge Function),
 * `checkoutUrl` is null and `mode === 'scaffold'` — the transaction
 * exists but no real payment was captured. Useful for demo flows.
 */
export async function procurePart(id: string) {
  const { data, error } = await supabase.functions.invoke('payfast-create-payment', {
    body: { kind: 'parts', partId: id },
  });
  if (error) {
    if (error.message?.includes('Function not found') || (error as { context?: { status?: number } })?.context?.status === 404) {
      throw new Error('Payments not yet deployed. Run `supabase functions deploy payfast-create-payment`.');
    }
    throw error;
  }
  return snakeToCamel(data);
}
