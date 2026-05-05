import { supabase, snakeToCamel } from '../lib/supabase';
import type { Database } from '../types/database';

type Discipline = Database['public']['Enums']['sacaa_discipline'];
type AircraftCategory = Database['public']['Enums']['aircraft_category'];
type MedicalClass = Database['public']['Enums']['medical_class'];

// personnel_credential — secondary credentials beyond the primary
// discipline on personnel.discipline. Many SACAA pros are multi-
// licensed: ATPL pilot + Cat B1 engineer + DAME, etc. Each
// credential carries its own licence number, subtype, medical class,
// expiry, and endorsements.

export interface PersonnelCredential {
  id: string;
  personnelId: string;
  discipline: Discipline;
  sacaaPart: number | null;
  licenceSubtype: string | null;
  license: string | null;
  aircraftCategory: AircraftCategory;
  medicalClass: MedicalClass;
  endorsements: string[];
  expires: string | null;
  status: 'verified' | 'expiring' | 'expired' | 'pending';
  nonLicensedRole: string | null;
  createdAt: string;
}

/** All secondary credentials for the current user's personnel record. */
export async function listMyCredentials(): Promise<PersonnelCredential[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return [];

  const { data: ppl } = await supabase
    .from('personnel')
    .select('id')
    .eq('user_id', u.user.id)
    .maybeSingle();
  if (!ppl?.id) return [];

  const { data, error } = await supabase
    .from('personnel_credential')
    .select('*')
    .eq('personnel_id', ppl.id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return snakeToCamel(data) as PersonnelCredential[];
}

/** Admin: list all credentials for a given personnel id. Used in the
 *  verification queue card so the admin sees every license they're
 *  about to approve. */
export async function listPersonnelCredentials(personnelId: string): Promise<PersonnelCredential[]> {
  const { data, error } = await supabase
    .from('personnel_credential')
    .select('*')
    .eq('personnel_id', personnelId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return snakeToCamel(data) as PersonnelCredential[];
}

export async function addCredential(payload: {
  discipline: Discipline;
  sacaaPart?: number | null;
  licenceSubtype?: string | null;
  license?: string | null;
  aircraftCategory?: AircraftCategory;
  medicalClass?: MedicalClass;
  endorsements?: string[];
  expires?: string | null;
  nonLicensedRole?: string | null;
}): Promise<{ credentialId: string }> {
  const { data, error } = await supabase.rpc('add_personnel_credential', {
    p_discipline:        payload.discipline,
    p_sacaa_part:        payload.sacaaPart ?? null,
    p_licence_subtype:   payload.licenceSubtype ?? null,
    p_license:           payload.license ?? null,
    p_aircraft_category: payload.aircraftCategory ?? 'aeroplane',
    p_medical_class:     payload.medicalClass ?? 'none',
    p_endorsements:      payload.endorsements ?? [],
    p_expires:           payload.expires ?? null,
    p_non_licensed_role: payload.nonLicensedRole ?? null,
  });
  if (error) throw error;
  return { credentialId: data as string };
}

/** Owner or admin can delete one of their credentials. */
export async function deleteCredential(credentialId: string) {
  const { error } = await supabase
    .from('personnel_credential')
    .delete()
    .eq('id', credentialId);
  if (error) throw error;
}

/** Admin only: mark a secondary credential as verified.
 *  Fires an in-app notification to the personnel. */
export async function verifyCredential(credentialId: string) {
  const { error } = await supabase.rpc('verify_personnel_credential', {
    p_credential_id: credentialId,
  });
  if (error) throw error;
}

/** Admin only: reject a secondary credential with an optional reason. */
export async function rejectCredential(credentialId: string, reason?: string) {
  const { error } = await supabase.rpc('reject_personnel_credential', {
    p_credential_id: credentialId,
    p_reason:        reason ?? null,
  });
  if (error) throw error;
}
