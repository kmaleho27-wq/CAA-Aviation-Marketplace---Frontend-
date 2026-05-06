import { supabase, snakeToCamel } from '../lib/supabase';
import type { Database } from '../types/database';

type Category = Database['public']['Enums']['mro_service_category'];

export interface MroFilter {
  category?: Category;
  aircraft?: string;     // matches against aircraft_types[] via ANY
  location?: string;
  myServices?: boolean;  // AMO viewing their own listings (incl. inactive)
}

export async function listMroServices(opts: MroFilter = {}) {
  let q = supabase
    .from('mro_service')
    .select('*, mro:mro_id(name, email)')
    .order('created_at', { ascending: false });

  if (opts.category)  q = q.eq('category', opts.category);
  if (opts.location)  q = q.ilike('location', `%${opts.location}%`);
  if (opts.aircraft)  q = q.contains('aircraft_types', [opts.aircraft]);
  if (opts.myServices) {
    const { data: u } = await supabase.auth.getUser();
    if (u?.user) q = q.eq('mro_id', u.user.id);
  }

  const { data, error } = await q;
  if (error) throw error;
  const services = snakeToCamel(data) as Array<Record<string, unknown> & { mroId: string }>;

  // Enrich each service with the AMO's verified crew disciplines
  // (primary + secondary). An operator hiring an AMO for a B1 task
  // wants to see "this shop has 3 verified B1 engineers" — visibility
  // is the V1 win, filtering is V2.
  const mroIds = Array.from(new Set(services.map((s) => s.mroId).filter(Boolean)));
  if (mroIds.length === 0) return services;

  const [pplRes, credRes] = await Promise.all([
    supabase.from('personnel')
      .select('id, discipline, status, created_by_operator')
      .in('created_by_operator', mroIds)
      .eq('status', 'verified'),
    supabase.from('personnel_credential')
      .select('discipline, status, personnel_id, personnel:personnel_id(created_by_operator)')
      .eq('status', 'verified'),
  ]);

  const disciplineCounts = new Map<string, Map<string, number>>();
  const bump = (mroId: string, discipline: string) => {
    if (!mroId || !discipline) return;
    const inner = disciplineCounts.get(mroId) ?? new Map<string, number>();
    inner.set(discipline, (inner.get(discipline) ?? 0) + 1);
    disciplineCounts.set(mroId, inner);
  };

  (pplRes.data ?? []).forEach((p) => bump(p.created_by_operator, p.discipline));
  (credRes.data ?? []).forEach((c) => {
    // personnel join only present when the personnel itself was visible
    // via RLS. RLS scopes personnel to operator/admin/counterparty only —
    // we may legitimately get rows without the join populated; skip.
    const pp = c.personnel as { created_by_operator?: string } | null;
    if (!pp?.created_by_operator) return;
    if (!mroIds.includes(pp.created_by_operator)) return;
    bump(pp.created_by_operator, c.discipline);
  });

  return services.map((s) => ({
    ...s,
    crewDisciplines: Array.from(disciplineCounts.get(s.mroId)?.entries() ?? [])
      .sort((a, b) => b[1] - a[1])  // most-staffed disciplines first
      .map(([discipline, count]) => ({ discipline, count })),
  }));
}

export async function createMroService(payload: {
  name: string;
  category: Category;
  description?: string | null;
  aircraftTypes?: string[];
  location: string;
  leadTimeDays?: number | null;
  priceFrom?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('mro_service')
    .insert({
      mro_id: u.user.id,
      name: payload.name,
      category: payload.category,
      description: payload.description || null,
      aircraft_types: payload.aircraftTypes ?? [],
      location: payload.location,
      lead_time_days: payload.leadTimeDays ?? null,
      price_from: payload.priceFrom || null,
      status: 'pending',                    // admin verifies AMO before listing goes live
      active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return snakeToCamel(data);
}

export async function requestMroQuote(serviceId: string, message?: string) {
  // Uses the v2 RPC which creates a proper mro_quote row (and notif)
  // instead of the v1 RPC which only fired a notification. Backward
  // compatible — same caller signature.
  const { data, error } = await supabase.rpc('request_mro_quote_v2', {
    p_service_id: serviceId,
    p_message: message || null,
  });
  if (error) throw error;
  return { quoteId: data as string };
}

// ── MRO escrow flow (migration 0019) ────────────────────────────

export interface MroQuote {
  id: string;
  serviceId: string;
  operatorId: string;
  amoId: string;
  message: string | null;
  amountQuoted: string | null;
  amoNotes: string | null;
  status: 'requested' | 'quoted' | 'accepted' | 'escrowed' | 'work_complete' | 'released' | 'declined' | 'cancelled';
  transactionId: string | null;
  createdAt: string;
  service?: { name: string; category: string; location: string };
  operator?: { name: string; email: string };
  amo?: { name: string; email: string };
}

/** Lists quotes visible to the caller — operators see their own
 *  outgoing requests, AMOs see incoming. RLS gates by user role. */
export async function listMroQuotes() {
  const { data, error } = await supabase
    .from('mro_quote')
    .select('*, service:service_id(name, category, location), operator:operator_id(name, email), amo:amo_id(name, email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return snakeToCamel(data) as MroQuote[];
}

/** AMO responds to a quote with a price. */
export async function respondMroQuote(quoteId: string, amount: string, notes?: string) {
  const { data, error } = await supabase.rpc('respond_mro_quote', {
    p_quote_id: quoteId, p_amount: amount, p_notes: notes || null,
  });
  if (error) throw error;
  return snakeToCamel(data);
}

/** Operator declines a quote. */
export async function declineMroQuote(quoteId: string, reason?: string) {
  const { data, error } = await supabase.rpc('decline_mro_quote', {
    p_quote_id: quoteId, p_reason: reason || null,
  });
  if (error) throw error;
  return snakeToCamel(data);
}

/** Operator clicked "Accept & pay" but never finished checkout. The
 *  quote is stuck at 'accepted' with a transaction in 'in-escrow'.
 *  Returns the same idempotency key, so payfast-create-payment hands
 *  back the existing checkoutUrl — operator picks up where they left
 *  off. */
export async function resumeMroPayment(quoteId: string) {
  const { data: hydrated, error: hydErr } = await supabase.rpc('resume_mro_payment', { p_quote_id: quoteId });
  if (hydErr) throw hydErr;

  const h = snakeToCamel(hydrated);
  // Re-call the Edge Function with the existing idempotency_key — the
  // existing-transaction branch returns the original checkoutUrl.
  const { data, error } = await supabase.functions.invoke('payfast-create-payment', {
    body: {
      kind: 'mro',
      mroQuoteId: quoteId,
      idempotencyKey: h.idempotencyKey,
      amount: h.amount,
      item: h.item,
    },
  });
  if (error) throw error;
  return snakeToCamel(data);
}

/** Operator accepts a quote → triggers PayFast escrow checkout.
 *  Returns the PayFast checkoutUrl which the caller redirects to. */
export async function acceptMroQuote(quoteId: string) {
  // Fetch the quote to get its quoted amount + service for the txn description.
  const { data: q, error: qErr } = await supabase
    .from('mro_quote')
    .select('id, amount_quoted, status, service:service_id(name, location), amo:amo_id(name)')
    .eq('id', quoteId)
    .single();
  if (qErr) throw qErr;
  if (q.status !== 'quoted') throw new Error(`Quote not in "quoted" status (was ${q.status})`);
  if (!q.amount_quoted) throw new Error('Quote has no amount yet');

  // Reach into payfast-create-payment with kind:'mro'. The Edge
  // Function uses the quote_id as both the m_payment_id link and to
  // fire mark_mro_quote_accepted on success.
  const { data, error } = await supabase.functions.invoke('payfast-create-payment', {
    body: {
      kind: 'mro',
      mroQuoteId: quoteId,
      amount: q.amount_quoted,
      item: q.service.name,
      party: q.amo.name,
      location: q.service.location,
    },
  });
  if (error) throw error;
  return snakeToCamel(data);
}

/** AMO marks the work complete; optionally attaches an 8130/RTS doc path
 *  (already uploaded to the personnel-docs bucket). */
export async function markMroWorkComplete(quoteId: string, docPath?: string) {
  const { data, error } = await supabase.rpc('mark_mro_work_complete', {
    p_quote_id: quoteId,
    p_8130_doc_path: docPath || null,
  });
  if (error) throw error;
  return snakeToCamel(data);
}

/** Either party (or admin) cancels before release. If escrow was already
 *  funded, this opens a dispute for admin-driven PayFast refund. */
export async function cancelMroQuote(quoteId: string, reason?: string) {
  const { data, error } = await supabase.rpc('cancel_mro_quote', {
    p_quote_id: quoteId, p_reason: reason || null,
  });
  if (error) throw error;
  return snakeToCamel(data);
}

/** Operator opens a dispute on a work_complete or released quote. */
export async function disputeMroQuote(quoteId: string, reason: string) {
  const { data, error } = await supabase.rpc('dispute_mro_quote', {
    p_quote_id: quoteId, p_reason: reason,
  });
  if (error) throw error;
  return snakeToCamel(data);
}

/** AMO uploads an 8130/RTS doc into the personnel-docs bucket using
 *  the same conventions as personnel KYC. Returns the storage path
 *  for use with markMroWorkComplete. */
export async function uploadMroCompletionDoc(quoteId: string, file: File) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error('Not signed in.');

  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
  const path = `${auth.user.id}/mro-${quoteId}-${Date.now()}-${safeName}`;

  const upload = await supabase.storage
    .from('personnel-docs')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) throw upload.error;
  return path;
}

/** Operator confirms the work and releases the escrow. */
export async function releaseMroEscrow(quoteId: string) {
  const { data, error } = await supabase.rpc('release_mro_escrow', { p_quote_id: quoteId });
  if (error) throw error;
  return snakeToCamel(data);
}
