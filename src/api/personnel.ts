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
  // Multi-discipline support: when filtering by discipline, we also
  // want to surface personnel whose VERIFIED secondary credential
  // matches — an ATPL pilot who's also a verified Cat B1 engineer
  // should appear when an operator filters for AME (66). Pre-fetch
  // matching personnel IDs from personnel_credential and OR them in.
  let credentialPersonnelIds: string[] = [];
  if (opts.discipline) {
    const { data: credRows, error: credErr } = await supabase
      .from('personnel_credential')
      .select('personnel_id')
      .eq('discipline', opts.discipline)
      .eq('status', 'verified');
    if (credErr) throw credErr;
    credentialPersonnelIds = (credRows ?? []).map((r) => r.personnel_id);
  }

  let q = supabase
    .from('personnel_public')
    .select('*')
    .order('created_at', { ascending: false });

  // Legacy
  if (opts.filter === 'available') q = q.eq('available', true);
  if (opts.filter === 'verified')  q = q.eq('status', 'verified');

  if (opts.discipline) {
    if (credentialPersonnelIds.length > 0) {
      // Match either primary discipline OR personnel with a verified
      // secondary credential. Postgrest .or() syntax is comma-separated.
      const idList = credentialPersonnelIds.join(',');
      q = q.or(`discipline.eq.${opts.discipline},id.in.(${idList})`);
    } else {
      q = q.eq('discipline', opts.discipline);
    }
  }
  if (opts.sacaaPart != null)  q = q.eq('sacaa_part', opts.sacaaPart);
  if (opts.aircraftCategory)   q = q.eq('aircraft_category', opts.aircraftCategory);
  if (opts.location)           q = q.ilike('location', `%${opts.location}%`);
  if (opts.availableOnly)      q = q.eq('available', true);
  if (opts.verifiedOnly)       q = q.eq('status', 'verified');
  if (opts.createdByOperator)  q = q.eq('created_by_operator', opts.createdByOperator);

  const { data, error } = await q;
  if (error) throw error;

  // Attach verified secondary disciplines to each row so the card can
  // render "+ B1 · DAME" chips next to the primary. Single round-trip
  // for all returned IDs.
  const rows = data ?? [];
  if (rows.length > 0) {
    const ids = rows.map((r: { id: string }) => r.id);
    const { data: allCreds } = await supabase
      .from('personnel_credential')
      .select('personnel_id, discipline, status')
      .in('personnel_id', ids)
      .eq('status', 'verified');
    const credsByPersonnel = new Map<string, string[]>();
    (allCreds ?? []).forEach((c: { personnel_id: string; discipline: string }) => {
      const arr = credsByPersonnel.get(c.personnel_id) ?? [];
      arr.push(c.discipline);
      credsByPersonnel.set(c.personnel_id, arr);
    });
    rows.forEach((r: { id: string; extra_disciplines?: string[] }) => {
      r.extra_disciplines = credsByPersonnel.get(r.id) ?? [];
    });
  }

  return snakeToCamel(rows);
}

/**
 * Export the operator's full crew (incl. licence + medical + endorsements)
 * as a CSV file for SACAA inspection prep. Triggers a browser download.
 *
 * Pulls from the unmasked `personnel` table — RLS gates which rows the
 * caller can see (own + admin + counterparty + created_by_operator).
 */
export async function exportPersonnelCsv() {
  const { data, error } = await supabase
    .from('personnel')
    .select('name, license, discipline, sacaa_part, licence_subtype, role, rating, types, location, status, expires, available, rate, medical_class, endorsements, non_licensed_role, created_at')
    .order('discipline')
    .order('name');
  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) {
    throw new Error('No crew rows to export.');
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(',')),
  ].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ymd = new Date().toISOString().slice(0, 10);
  a.download = `naluka-crew-${ymd}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return rows.length;
}

/** Escape a value for CSV — quote if it contains comma/quote/newline. */
function csvCell(v: unknown): string {
  if (v == null) return '';
  if (Array.isArray(v)) return csvCell(v.join('; '));
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
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
