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
export async function listParts({ search, category } = {}) {
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
 * Procure a part: creates a Stripe payment intent and a transaction in
 * 'in-escrow' status. Stripe Connect lives in an Edge Function — wired in
 * Phase 4. Until then this throws explicitly so the UI shows a proper error
 * instead of a half-finished transaction.
 */
export async function procurePart(id) {
  const { data, error } = await supabase.functions.invoke('payments-create-intent', {
    body: { kind: 'parts', partId: id },
  });
  if (error) {
    // Function not deployed yet (Phase 4) → surface a clear message.
    if (error.message?.includes('Function not found') || error.context?.status === 404) {
      throw new Error('Payments are not yet wired (Phase 4 — Edge Functions). The schema and audit chain are ready.');
    }
    throw error;
  }
  return snakeToCamel(data);
}
