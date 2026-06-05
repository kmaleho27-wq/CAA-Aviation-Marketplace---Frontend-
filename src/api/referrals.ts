import { supabase, snakeToCamel } from '../lib/supabase';

// Referral API — what Aeropreserve sees on /app/referrals.
//
// Two data sources back the dashboard:
//   - prospective_account: the broker's contact list (organisations
//     they introduced, whether signed up or not)
//   - broker_referral_summary view: rolled-up money owed across all
//     attributed transactions
//
// Both are RLS-gated by migration 0030 / 0029 — a non-referrer
// caller sees nothing.

export interface ProspectiveAccount {
  id: string;
  organization: string;
  accountType: 'supplier' | 'mro_customer' | 'airline_customer';
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  country: string | null;
  suggestedMarkupPct: number | null;
  notes: string | null;
  status: 'invited' | 'contacted' | 'signed_up' | 'declined';
  linkedProfileId: string | null;
  signedUpAt: string | null;
  createdAt: string;
}

export interface ReferralSummary {
  referrerId: string;
  totalDeals: number;
  pendingDeals: number;
  confirmedDeals: number;
  paidDeals: number;
  totalMarkupCents: string;          // bigints come back as strings from PostgREST
  totalCutConfirmedCents: string;
  pendingCutCents: string;
  paidOutCents: string;
  owedCents: string;
  lastDealAt: string | null;
}

/** List the current user's prospective accounts (their introductions).
 *  Empty array if the user isn't a referrer. */
export async function listMyProspects(): Promise<ProspectiveAccount[]> {
  const { data, error } = await supabase
    .from('prospective_account')
    .select('*')
    .order('account_type', { ascending: true })
    .order('organization', { ascending: true });
  if (error) throw error;
  return snakeToCamel(data ?? []) as ProspectiveAccount[];
}

/** Rolled-up referral money for the current user. Returns null when
 *  the user has no ledger activity yet (the view returns no row for
 *  brokers with zero deals). */
export async function getMyReferralSummary(): Promise<ReferralSummary | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('broker_referral_summary')
    .select('*')
    .eq('referrer_id', u.user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? (snakeToCamel(data) as ReferralSummary) : null;
}

/** Format a bigint cents value as a currency string. Returns "—" for
 *  zero/null so empty states read clean. Defaults to ZAR. */
export function formatCents(cents: string | number | null | undefined, currency = 'ZAR'): string {
  if (cents == null || cents === '0' || cents === 0) return '—';
  const n = typeof cents === 'string' ? Number(cents) : cents;
  if (!Number.isFinite(n)) return '—';
  const major = n / 100;
  return `${currency} ${major.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Update the status / contact details of one prospect. Used by the
 *  inline edit row on the dashboard. RLS / admin policy gates writes. */
export async function updateProspect(
  id: string,
  patch: Partial<Pick<ProspectiveAccount, 'status' | 'contactEmail' | 'contactPhone' | 'notes' | 'suggestedMarkupPct'>>,
) {
  const dbPatch: Record<string, unknown> = {};
  if (patch.status != null)              dbPatch.status               = patch.status;
  if (patch.contactEmail !== undefined)  dbPatch.contact_email        = patch.contactEmail;
  if (patch.contactPhone !== undefined)  dbPatch.contact_phone        = patch.contactPhone;
  if (patch.notes !== undefined)         dbPatch.notes                = patch.notes;
  if (patch.suggestedMarkupPct != null)  dbPatch.suggested_markup_pct = patch.suggestedMarkupPct;

  const { error } = await supabase.from('prospective_account').update(dbPatch).eq('id', id);
  if (error) throw error;
}
