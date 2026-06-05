import { supabase, snakeToCamel } from '../lib/supabase';

// Broker inventory API — drives the /app/inventory page.
//
// Reads from the broker_inventory view (migration 0032) which unions
// part + mro_service rows attributed to prospects the current user
// referred. Writes go to the underlying table the row came from.
//
// RLS gates everything to "rows whose seller_prospect's referrer_id
// matches auth.uid()". Calling as a non-broker returns nothing.

export interface InventoryItem {
  kind: 'part' | 'service';
  id: string;
  name: string;
  sku: string | null;
  basePrice: string | null;
  markupPct: number;
  sellerProspectId: string;
  supplierName: string;
  supplierCountry: string | null;
  createdAt: string;
}

/** All inventory rows attributable to suppliers the current user referred. */
export async function listBrokerInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('broker_inventory')
    .select('*')
    .order('supplier_name', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return snakeToCamel(data ?? []) as InventoryItem[];
}

/** Update the markup_pct on a single inventory item. The row's source
 *  table (part vs mro_service) is inferred from `kind`. RLS gates the
 *  write to broker-of-the-supplier. */
export async function updateInventoryMarkup(
  item: Pick<InventoryItem, 'kind' | 'id'>,
  markupPct: number,
): Promise<void> {
  if (markupPct < 20 || markupPct > 200) {
    throw new Error('Markup must be between 20% and 200%.');
  }
  const table = item.kind === 'part' ? 'part' : 'mro_service';
  const { error } = await supabase
    .from(table)
    .update({ markup_pct: markupPct })
    .eq('id', item.id);
  if (error) throw error;
}

/** Apply markup_pct to a base-price string. Mirrors logic used on
 *  marketplace cards so the inventory page's "buyer sees" matches
 *  what the buyer actually sees. */
export function applyMarkupToString(priceStr: string | null, markupPct: number): string {
  if (!priceStr) return '—';
  const match = String(priceStr).match(/^([A-Za-z]+)?\s*([\d,.]+)/);
  if (!match) return priceStr;
  const prefix = (match[1] || 'ZAR').toUpperCase();
  const num = parseFloat(match[2].replace(/,/g, ''));
  if (!Number.isFinite(num)) return priceStr;
  const marked = Math.round(num * (1 + markupPct / 100));
  return `${prefix} ${marked.toLocaleString('en-US')}`;
}
