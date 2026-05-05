import { supabase } from '../lib/supabase';

// Operator compliance dashboard data layer.
//
// Aggregates an operator's crew across personnel + personnel_credential
// + document so they get the single screenshotable view a SACAA
// audit asks for. v1 is client-side aggregation — keep it simple,
// promote to a server-side RPC once we hit performance issues with
// operators carrying 100+ crew.
//
// "Their crew" = (a) personnel rows where created_by_operator = current
// user (their own added crew), UNION (b) personnel linked to an active
// transaction where the operator is the buyer (hired contractors).
// Hired contractors are flagged with source='hired' so the UI can show
// they're temporary — operator wants visibility for the duration of
// the engagement but the contractor's primary employer is somewhere
// else.

export interface CrewDocument {
  id: string;
  type: string;
  expires: string | null;
  status: string;
}

export interface CrewMember {
  id: string;
  name: string;
  initials: string;
  primaryDiscipline: string;
  primaryStatus: 'verified' | 'expiring' | 'expired' | 'pending' | 'rejected';
  primaryExpires: string | null;
  primaryLicense: string | null;
  credentials: Array<{
    id: string;
    discipline: string;
    status: string;
    expires: string | null;
    license: string | null;
  }>;
  documents: CrewDocument[];
  /** 'crew' = added by this operator. 'hired' = active engagement via transaction. */
  source: 'crew' | 'hired';
  /** Earliest expiry across primary + all credentials + all documents. Used for sorting. */
  earliestExpiry: string | null;
  /** "verified" if primary AND all credentials AND all documents are verified. */
  overallStatus: 'verified' | 'expiring' | 'expired' | 'pending' | 'mixed';
  /** True if anything in primary, secondaries, or documents expires in the next 30 days. */
  atRisk30: boolean;
}

export interface ComplianceSummary {
  total: number;
  verified: number;
  expiring: number;       // ≤30 days OR status='expiring'
  expired: number;
  pending: number;
  atRisk30: number;
  verifiedPct: number;
  hiredCount: number;
  crew: CrewMember[];
}

/**
 * Fetch the operator's full crew with rolled-up compliance status.
 * Run as the OPERATOR — RLS on personnel + personnel_credential +
 * document ensures we only see rows the user is allowed to see.
 */
export async function getComplianceSummary(): Promise<ComplianceSummary> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error('Not signed in.');
  const operatorId = u.user.id;

  // 1) Operator's own crew
  const { data: ownCrew, error: pplErr } = await supabase
    .from('personnel')
    .select('id, name, initials, discipline, status, expires, license')
    .eq('created_by_operator', operatorId)
    .order('name');
  if (pplErr) throw pplErr;
  const ownIds = new Set((ownCrew ?? []).map((p) => p.id));

  // 2) Hired contractors — personnel linked to an active transaction
  //    where the operator is the buyer. RLS already gates this so we
  //    can query the personnel table directly.
  const { data: activeTx, error: txErr } = await supabase
    .from('transaction')
    .select('personnel_id')
    .eq('buyer_id', operatorId)
    .in('status', ['in-escrow', 'rts-pending'])
    .not('personnel_id', 'is', null);
  if (txErr) throw txErr;
  const hiredIds = Array.from(new Set(
    (activeTx ?? [])
      .map((t) => t.personnel_id)
      .filter((id): id is string => !!id && !ownIds.has(id))
  ));

  let hiredCrew: typeof ownCrew = [];
  if (hiredIds.length > 0) {
    const { data: hired, error: hErr } = await supabase
      .from('personnel')
      .select('id, name, initials, discipline, status, expires, license')
      .in('id', hiredIds);
    if (hErr) throw hErr;
    hiredCrew = hired ?? [];
  }

  const allPersonnel = [
    ...(ownCrew ?? []).map((p) => ({ ...p, _source: 'crew' as const })),
    ...hiredCrew.map((p) => ({ ...p, _source: 'hired' as const })),
  ];

  if (allPersonnel.length === 0) {
    return {
      total: 0, verified: 0, expiring: 0, expired: 0, pending: 0,
      atRisk30: 0, verifiedPct: 0, hiredCount: 0, crew: [],
    };
  }

  const allIds = allPersonnel.map((p) => p.id);

  // 3) All credentials for everyone in one round-trip
  const { data: creds, error: credErr } = await supabase
    .from('personnel_credential')
    .select('id, personnel_id, discipline, status, expires, license')
    .in('personnel_id', allIds);
  if (credErr) throw credErr;
  const credsByPerson = new Map<string, NonNullable<typeof creds>>();
  (creds ?? []).forEach((c) => {
    const arr = credsByPerson.get(c.personnel_id) ?? [];
    arr.push(c);
    credsByPerson.set(c.personnel_id, arr);
  });

  // 4) All documents (medicals, Form 21, AME logbook, etc.) for everyone
  const { data: docs, error: docErr } = await supabase
    .from('document')
    .select('id, type, status, expires, personnel_id')
    .in('personnel_id', allIds);
  if (docErr) throw docErr;
  const docsByPerson = new Map<string, NonNullable<typeof docs>>();
  (docs ?? []).forEach((d) => {
    if (!d.personnel_id) return;
    const arr = docsByPerson.get(d.personnel_id) ?? [];
    arr.push(d);
    docsByPerson.set(d.personnel_id, arr);
  });

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  const crew: CrewMember[] = allPersonnel.map((p) => {
    const personCreds = credsByPerson.get(p.id) ?? [];
    const personDocs  = docsByPerson.get(p.id) ?? [];

    const allExpiries = [
      p.expires,
      ...personCreds.map((c) => c.expires),
      ...personDocs.map((d) => d.expires),
    ].filter((e): e is string => !!e).sort();
    const earliestExpiry = allExpiries[0] ?? null;

    const allStatuses = [
      p.status,
      ...personCreds.map((c) => c.status),
      ...personDocs.map((d) => d.status),
    ];
    const overallStatus: CrewMember['overallStatus'] =
      allStatuses.every((s) => s === 'verified') ? 'verified'
      : allStatuses.some((s) => s === 'expired') ? 'expired'
      : allStatuses.some((s) => s === 'expiring') ? 'expiring'
      : allStatuses.some((s) => s === 'pending') ? 'pending'
      : 'mixed';

    const atRisk30 = allExpiries.some((e) => {
      const t = new Date(e).getTime();
      return t > now && t <= now + thirtyDays;
    }) || allStatuses.some((s) => s === 'expiring' || s === 'expired');

    return {
      id: p.id,
      name: p.name,
      initials: p.initials,
      primaryDiscipline: p.discipline,
      primaryStatus: p.status,
      primaryExpires: p.expires,
      primaryLicense: p.license,
      credentials: personCreds.map((c) => ({
        id: c.id,
        discipline: c.discipline,
        status: c.status,
        expires: c.expires,
        license: c.license,
      })),
      documents: personDocs.map((d) => ({
        id: d.id,
        type: d.type,
        expires: d.expires,
        status: d.status,
      })),
      source: p._source,
      earliestExpiry,
      overallStatus,
      atRisk30,
    };
  });

  // Sort: at-risk first, then by earliest expiry (urgent at top)
  crew.sort((a, b) => {
    if (a.atRisk30 !== b.atRisk30) return a.atRisk30 ? -1 : 1;
    if (a.earliestExpiry && b.earliestExpiry) return a.earliestExpiry.localeCompare(b.earliestExpiry);
    if (a.earliestExpiry) return -1;
    if (b.earliestExpiry) return 1;
    return a.name.localeCompare(b.name);
  });

  const total = crew.length;
  const verified = crew.filter((c) => c.overallStatus === 'verified').length;
  const expiring = crew.filter((c) => c.overallStatus === 'expiring' || c.atRisk30).length;
  const expired = crew.filter((c) => c.overallStatus === 'expired').length;
  const pending = crew.filter((c) => c.overallStatus === 'pending').length;
  const atRisk30 = crew.filter((c) => c.atRisk30).length;
  const hiredCount = crew.filter((c) => c.source === 'hired').length;
  const verifiedPct = total > 0 ? Math.round((verified / total) * 100) : 0;

  return { total, verified, expiring, expired, pending, atRisk30, verifiedPct, hiredCount, crew };
}
