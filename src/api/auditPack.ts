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
      .select('id, name, license, discipline, status, expires, created_by_operator, medical_class, licence_subtype')
      .order('created_at', { ascending: false }),
  ]);

  // Audit pack v2 — fold secondary credentials onto each personnel row
  // so an inspector sees the full credential picture for each multi-
  // licensed crew member, not just their primary discipline. RLS gates
  // visibility per row exactly like the personnel select above.
  const personnelRows = personnelRes.data ?? [];
  const personnelIds = personnelRows.map((p: { id: string }) => p.id);
  let credentialsRes: { data: Array<Record<string, unknown>> | null; error: { message: string } | null } =
    { data: [], error: null };
  if (personnelIds.length > 0) {
    credentialsRes = await supabase
      .from('personnel_credential')
      .select('id, personnel_id, discipline, sacaa_part, licence_subtype, license, medical_class, status, expires, endorsements')
      .in('personnel_id', personnelIds)
      .order('discipline');
  }

  const credsByPerson = new Map<string, Array<Record<string, unknown>>>();
  (credentialsRes.data ?? []).forEach((c) => {
    const pid = c.personnel_id as string;
    const arr = credsByPerson.get(pid) ?? [];
    arr.push(c);
    credsByPerson.set(pid, arr);
  });
  const personnelWithCreds = personnelRows.map((p: { id: string }) => ({
    ...p,
    credentials: credsByPerson.get(p.id) ?? [],
  }));

  // Surface RLS-induced empty results without failing the whole pack —
  // operators legitimately can't see audit_event in some cases.
  const errors = [transactionsRes, documentsRes, auditEventsRes, verifyChainRes, personnelRes, credentialsRes]
    .filter((r) => r.error)
    .map((r) => r.error!.message);

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: snakeToCamel(profile),
    range: { from, to },
    transactions: snakeToCamel(transactionsRes.data ?? []),
    documents: snakeToCamel(documentsRes.data ?? []),
    auditEvents: snakeToCamel(auditEventsRes.data ?? []),
    verifyChainProof: snakeToCamel(verifyChainRes.data ?? [])[0] ?? null,
    personnel: snakeToCamel(personnelWithCreds),
    accessNotes: errors.length ? errors : undefined,
  };
}
