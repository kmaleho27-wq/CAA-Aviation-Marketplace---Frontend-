import { supabase } from '../lib/supabase';

// Operator compliance dashboard data layer.
//
// Aggregates an operator's crew across personnel + personnel_credential
// + document so they get the single screenshotable view a SACAA
// audit asks for. v1 is client-side aggregation — keep it simple,
// promote to a server-side RPC once we hit performance issues with
// operators carrying 100+ crew.
//
// "Their crew" = any personnel row created_by_operator = current user.
// Hired-via-transaction crew are temporary and not the operator's
// compliance responsibility.

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
  /** Earliest expiry across primary + all credentials. Used for sorting. */
  earliestExpiry: string | null;
  /** "verified" if primary AND all credentials are verified. */
  overallStatus: 'verified' | 'expiring' | 'expired' | 'pending' | 'mixed';
  /** True if anything in primary or secondaries expires in the next 30 days. */
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
  crew: CrewMember[];
}

/**
 * Fetch the operator's full crew with rolled-up compliance status.
 * Run as the OPERATOR — RLS on personnel + personnel_credential ensures
 * we only see rows the user is allowed to see.
 */
export async function getComplianceSummary(): Promise<ComplianceSummary> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error('Not signed in.');

  const { data: people, error: pplErr } = await supabase
    .from('personnel')
    .select('id, name, initials, discipline, status, expires, license')
    .eq('created_by_operator', u.user.id)
    .order('name');
  if (pplErr) throw pplErr;

  const personnel = people ?? [];
  if (personnel.length === 0) {
    return { total: 0, verified: 0, expiring: 0, expired: 0, pending: 0, atRisk30: 0, verifiedPct: 0, crew: [] };
  }

  const ids = personnel.map((p) => p.id);
  const { data: creds, error: credErr } = await supabase
    .from('personnel_credential')
    .select('id, personnel_id, discipline, status, expires, license');
  if (credErr) throw credErr;
  const credsByPerson = new Map<string, typeof creds>();
  (creds ?? [])
    .filter((c) => ids.includes(c.personnel_id))
    .forEach((c) => {
      const arr = credsByPerson.get(c.personnel_id) ?? [];
      arr.push(c);
      credsByPerson.set(c.personnel_id, arr);
    });

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  const crew: CrewMember[] = personnel.map((p) => {
    const personCreds = credsByPerson.get(p.id) ?? [];
    const allExpiries = [p.expires, ...personCreds.map((c) => c.expires)]
      .filter((e): e is string => !!e)
      .sort();
    const earliestExpiry = allExpiries[0] ?? null;

    const allStatuses = [p.status, ...personCreds.map((c) => c.status)];
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
  const verifiedPct = total > 0 ? Math.round((verified / total) * 100) : 0;

  return { total, verified, expiring, expired, pending, atRisk30, verifiedPct, crew };
}
