import { supabase, snakeToCamel } from '../lib/supabase';

// API for buyer-driven RFQs and broker-side matchmaking.
//
// Two distinct surfaces share these helpers:
//   - Buyer page (/app/my-requests): create + read part_request,
//     read + accept buyer_quote view rows
//   - Broker page (/app/matchmaking): read part_request, read +
//     update broker_match rows, send quotes via RPC
//
// Confidentiality is enforced server-side via RLS (see migration
// 0033) — these helpers can't bypass that even if they wanted to.

export interface PartRequest {
  id: string;
  buyerId: string;
  partNumber: string;
  description: string | null;
  quantity: number;
  conditionMin: string;
  maxPriceZar: number | null;
  urgency: 'aog' | 'urgent' | 'standard';
  notes: string | null;
  status: 'open' | 'quoted' | 'accepted' | 'fulfilled' | 'expired' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface BuyerQuote {
  matchId: string;
  requestId: string;
  buyerId: string;
  brokerId: string;
  brokerName: string;
  totalPriceCents: string;
  markupPct: string;
  status: 'quoted' | 'accepted' | 'declined';
  quotedAt: string | null;
  acceptedAt: string | null;
}

export interface BrokerMatch {
  id: string;
  requestId: string;
  partId: string;
  brokerId: string;
  basePriceCents: string;
  markupPct: string;
  totalPriceCents: string;
  status:
    | 'auto_suggested' | 'broker_reviewed' | 'quoted'
    | 'accepted' | 'declined' | 'expired';
  notes: string | null;
  quotedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

// ── Buyer side ──────────────────────────────────────────────────

export async function createPartRequest(payload: {
  partNumber: string;
  description?: string | null;
  quantity?: number;
  conditionMin?: 'New' | 'Overhauled' | 'Serviceable' | 'As-removed';
  maxPriceZar?: number | null;
  urgency?: 'aog' | 'urgent' | 'standard';
  notes?: string | null;
}): Promise<{ id: string }> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('part_request')
    .insert({
      buyer_id:       u.user.id,
      part_number:    payload.partNumber.trim(),
      description:    payload.description?.trim() || null,
      quantity:       payload.quantity ?? 1,
      condition_min:  payload.conditionMin ?? 'Serviceable',
      max_price_zar:  payload.maxPriceZar ?? null,
      urgency:        payload.urgency ?? 'standard',
      notes:          payload.notes?.trim() || null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function listMyRequests(): Promise<PartRequest[]> {
  const { data, error } = await supabase
    .from('part_request')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data ?? []) as PartRequest[];
}

/** Quotes the buyer can see (broker name + total price + markup %,
 *  but NEVER the supplier identity or base price). */
export async function listQuotesForRequest(requestId: string): Promise<BuyerQuote[]> {
  const { data, error } = await supabase
    .from('buyer_quote')
    .select('*')
    .eq('request_id', requestId)
    .order('quoted_at', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data ?? []) as BuyerQuote[];
}

/** Accept a specific quote. Declines siblings automatically. */
export async function acceptQuote(matchId: string) {
  const { data, error } = await supabase.rpc('accept_buyer_quote', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data;
}

// ── Broker side ─────────────────────────────────────────────────

/** All open requests — broker view. RLS gates this to admin/broker. */
export async function listOpenRequests(): Promise<PartRequest[]> {
  const { data, error } = await supabase
    .from('part_request')
    .select('*')
    .in('status', ['open', 'quoted'])
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data ?? []) as PartRequest[];
}

/** All broker_match rows for a given request — broker sees full
 *  detail including base price and which supplier. */
export async function listMatchesForRequest(requestId: string): Promise<Array<BrokerMatch & {
  partName?: string;
  partPn?: string;
  partCondition?: string;
  partLocation?: string;
  supplierName?: string;
  supplierCountry?: string;
}>> {
  const { data, error } = await supabase
    .from('broker_match')
    .select(`
      *,
      part:part_id(name, pn, condition, location, seller_prospect_id),
      part_supplier:part_id(seller_prospect:seller_prospect_id(organization, country))
    `)
    .eq('request_id', requestId)
    .order('base_price_cents', { ascending: true });
  if (error) throw error;
  // Flatten nested joins for easier rendering
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const part = (r.part || {}) as { name?: string; pn?: string; condition?: string; location?: string };
    const partSupplier = (r.part_supplier as { seller_prospect?: { organization?: string; country?: string } } | null) || {};
    const seller = partSupplier.seller_prospect ?? {};
    return {
      ...(snakeToCamel(r) as BrokerMatch),
      partName: part.name,
      partPn: part.pn,
      partCondition: part.condition,
      partLocation: part.location,
      supplierName: seller.organization,
      supplierCountry: seller.country,
    };
  });
}

/** Update markup on a match without sending the quote (just save). */
export async function updateMatchMarkup(matchId: string, markupPct: number) {
  if (markupPct < 20 || markupPct > 200) {
    throw new Error('Markup must be between 20% and 200%.');
  }
  const { error } = await supabase
    .from('broker_match')
    .update({ markup_pct: markupPct })
    .eq('id', matchId);
  if (error) throw error;
}

/** Send the quote to the buyer. Optionally update markup atomically. */
export async function sendBrokerQuote(matchId: string, markupPct?: number) {
  const { data, error } = await supabase.rpc('send_broker_quote', {
    p_match_id:   matchId,
    p_markup_pct: markupPct ?? null,
  });
  if (error) throw error;
  return data;
}

/** Convert cents → display string. Treats null/0 as "—". */
export function formatPriceCents(cents: string | number | null | undefined, currency = 'ZAR'): string {
  if (cents == null) return '—';
  const n = typeof cents === 'string' ? Number(cents) : cents;
  if (!Number.isFinite(n) || n === 0) return '—';
  const major = n / 100;
  return `${currency} ${major.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
