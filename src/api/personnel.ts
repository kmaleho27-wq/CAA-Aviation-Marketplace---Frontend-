import { supabase, snakeToCamel } from '../lib/supabase';
import type { Database } from '../types/database';

type Discipline = Database['public']['Enums']['sacaa_discipline'];
type AircraftCategory = Database['public']['Enums']['aircraft_category'];

/**
 * Marketplace personnel listing.
 *
 * Privacy split (D2 → B): the `personnel_public` view masks the licence
 * number, daily rate, and exact expiry date. Operators only see those
 * fields once a transaction links the two parties (which RLS allows on
 * the underlying `personnel` table).
 *
 * Filters (all optional, AND-combined):
 *   - discipline:        Part 61/62/.../non_licensed bucket
 *   - sacaaPart:         numeric Part (61, 62, 63, 64, 65, 66, 67, 68, 69, 71)
 *   - aircraftCategory:  aeroplane / helicopter / glider / ... / none
 *   - location:          substring match on city
 *   - availableOnly:     true → only currently available crew
 *   - verifiedOnly:      true → only verified status
 *
 * Legacy single-string filter still supported for older callers:
 *   listPersonnel({ filter: 'available' | 'verified' | 'all' })
 */
export interface PersonnelFilter {
  discipline?: Discipline;
  sacaaPart?: number;
  aircraftCategory?: AircraftCategory;
  location?: string;
  availableOnly?: boolean;
  verifiedOnly?: boolean;
  /** Operator's user_id — surfaces "My crew" added via createPersonnelByOperator. */
  createdByOperator?: string;
  /** @deprecated use availableOnly / verifiedOnly */
  filter?: 'available' | 'verified' | 'all';
}

export async function listPersonnel(opts: PersonnelFilter = {}) {
  let q = supabase
    .from('personnel_public')
    .select('*')
    .order('created_at', { ascending: false });

  // Legacy
  if (opts.filter === 'available') q = q.eq('available', true);
  if (opts.filter === 'verified')  q = q.eq('status', 'verified');

  if (opts.discipline)         q = q.eq('discipline', opts.discipline);
  if (opts.sacaaPart != null)  q = q.eq('sacaa_part', opts.sacaaPart);
  if (opts.aircraftCategory)   q = q.eq('aircraft_category', opts.aircraftCategory);
  if (opts.location)           q = q.ilike('location', `%${opts.location}%`);
  if (opts.availableOnly)      q = q.eq('available', true);
  if (opts.verifiedOnly)       q = q.eq('status', 'verified');
  if (opts.createdByOperator)  q = q.eq('created_by_operator', opts.createdByOperator);

  const { data, error } = await q;
  if (error) throw error;
  return snakeToCamel(data);
}

/**
 * Operator creates a personnel row on behalf of their crew (P2 #6).
 * Row lands at status='pending' with user_id=null (no auth account)
 * and created_by_operator=auth.uid(). Admins verify it like any other
 * pending personnel via /admin/kyc (P1 #4).
 */
export async function createPersonnelByOperator(payload: {
  name: string;
  initials?: string;
  discipline: Database['public']['Enums']['sacaa_discipline'];
  sacaaPart?: number | null;
  licenceSubtype?: string | null;
  license?: string | null;
  location?: string | null;
  aircraftCategory?: Database['public']['Enums']['aircraft_category'];
  medicalClass?: Database['public']['Enums']['medical_class'];
  nonLicensedRole?: string | null;
  rate?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) throw new Error('Not signed in.');

  const initials = payload.initials
    || payload.name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const { data, error } = await supabase
    .from('personnel')
    .insert({
      name: payload.name,
      initials,
      discipline: payload.discipline,
      sacaa_part: payload.sacaaPart ?? null,
      licence_subtype: payload.licenceSubtype ?? null,
      license: payload.license || null,
      location: payload.location || null,
      aircraft_category: payload.aircraftCategory ?? 'aeroplane',
      medical_class: payload.medicalClass ?? 'none',
      non_licensed_role: payload.nonLicensedRole || null,
      rate: payload.rate || null,
      role: null,
      rating: null,
      status: 'pending',
      available: false,
      types: [],
      endorsements: [],
      user_id: null,
      created_by_operator: auth.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return snakeToCamel(data);
}

/**
 * Hire a contractor. Creates a Personnel-type transaction in 'in-escrow'
 * status and signs a PayFast checkout payload. Same Edge Function path
 * as procurePart, just with kind='personnel'.
 */
export async function hireContractor(id: string) {
  const { data, error } = await supabase.functions.invoke('payfast-create-payment', {
    body: { kind: 'personnel', personnelId: id },
  });
  if (error) {
    if (error.message?.includes('Function not found') || (error as { context?: { status?: number } })?.context?.status === 404) {
      throw new Error('Payments not yet deployed. Run `supabase functions deploy payfast-create-payment`.');
    }
    throw error;
  }
  return snakeToCamel(data);
}
