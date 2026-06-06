import { supabase, snakeToCamel } from '../lib/supabase';

// Supplier-side API for incoming POs from brokers.
//
// Backed by the supplier_purchase_order view (migration 0034).
// Confidentiality enforced in the view's WHERE clause — supplier sees
// rows only where their profile is linked to the part's seller prospect.

export interface SupplierOrder {
  matchId: string;
  requestId: string;
  brokerId: string;
  brokerName: string;
  partId: string;
  partName: string;
  partPn: string | null;
  partCondition: string | null;
  myListedPrice: string | null;
  agreedPriceCents: string;
  quantity: number;
  requiredCondition: string;
  acceptedAt: string | null;
  matchedAt: string;
  supplierProspectId: string;
  supplierProfileId: string | null;
}

/** List all POs the current supplier is the seller on. */
export async function listMyOrders(): Promise<SupplierOrder[]> {
  const { data, error } = await supabase
    .from('supplier_purchase_order')
    .select('*')
    .order('accepted_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return snakeToCamel(data ?? []) as SupplierOrder[];
}
