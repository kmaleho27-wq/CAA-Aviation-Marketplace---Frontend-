import { supabase, snakeToCamel } from '../lib/supabase';

/**
 * List transactions visible to the current user. RLS handles the access
 * boundary — only buyer/seller (per row) or admin can see each row.
 * Nullable buyer_id/seller_id rows from legacy seed data only appear to
 * admins, by design (see review finding C1).
 */
export async function listTransactions() {
  const { data, error } = await supabase
    .from('transaction')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data);
}

/**
 * Sign Release-to-Service. Calls the sign_rts plpgsql RPC which:
 *   - validates auth.uid() is buyer/seller (or admin)
 *   - flips status to 'completed'
 *   - chains an audit_event of type 'rts.signed'
 * All atomic. Returns { transactionId, status, auditSeq, auditHash }.
 */
export async function signRTS(id) {
  const { data, error } = await supabase.rpc('sign_rts', { p_transaction_id: id });
  if (error) throw error;
  return snakeToCamel(data);
}
