import { supabase, snakeToCamel } from '../lib/supabase';

// Audit pack — all the data an operator/admin needs to walk into a
// SACAA inspection with. RLS on each table gates what the caller can
// see; admins get everything, operators get rows they're a counterparty
// on. The hash-chained verify_chain proof is the integrity backbone.

export interface AuditPackOptions {
  /** Inclusive ISO date (YYYY-MM-DD) — defaults to 12 months ago. */
  from?: string;
  /** Inclusive ISO date — defaults to today. */
  to?: string;
  /** Operator user_id to scope the pack to (admin only). Default: caller. */
  forUserId?: string;
}

export async function generateAuditPack(opts: AuditPackOptions = {}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error('Not signed in.');

  const to = opts.to ?? new Date().toISOString().slice(0, 10);
  const fromDate = new Date(to);
  fromDate.setMonth(fromDate.getMonth() - 12);
  const from = opts.from ?? fromDate.toISOString().slice(0, 10);

  // Profile of the caller for the pack header.
  const { data: profile } = await supabase
    .from('profile')
    .select('id, email, name, role')
    .eq('id', auth.user.id)
    .maybeSingle();

  const [
    transactionsRes,
    documentsRes,
    auditEventsRes,
    verifyChainRes,
    personnelRes,
  ] = await Promise.all([
    supabase.from('transaction')
      .select('*')
      .gte('created_at', `${from}T00:00:00Z`)
      .lte('created_at', `${to}T23:59:59Z`)
      .order('created_at', { ascending: false }),

    supabase.from('document')
      .select('*')
      .gte('issued', from)
      .lte('issued', to)
      .order('issued', { ascending: false }),

    supabase.from('audit_event')
      .select('*')
      .gte('created_at', `${from}T00:00:00Z`)
      .lte('created_at', `${to}T23:59:59Z`)
      .order('seq', { ascending: true }),

    supabase.rpc('verify_chain'),

    supabase.from('personnel')
      .select('id, name, license, discipline, status, expires, created_by_operator')
      .order('created_at', { ascending: false }),
  ]);

  // Surface RLS-induced empty results without failing the whole pack —
  // operators legitimately can't see audit_event in some cases.
  const errors = [transactionsRes, documentsRes, auditEventsRes, verifyChainRes, personnelRes]
    .filter((r) => r.error)
    .map((r) => r.error.message);

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: snakeToCamel(profile),
    range: { from, to },
    transactions: snakeToCamel(transactionsRes.data ?? []),
    documents: snakeToCamel(documentsRes.data ?? []),
    auditEvents: snakeToCamel(auditEventsRes.data ?? []),
    verifyChainProof: snakeToCamel(verifyChainRes.data ?? [])[0] ?? null,
    personnel: snakeToCamel(personnelRes.data ?? []),
    accessNotes: errors.length ? errors : undefined,
  };
}
