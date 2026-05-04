#!/usr/bin/env node
/**
 * One-shot seed for Supabase. Mirrors server/prisma/seed.ts.
 *
 * Order matters because of FK chain (review finding H3):
 *   1. auth.users (admin API) → trigger creates public.profile
 *   2. parts, personnel (linked to operator/contractor profile via user_id)
 *   3. documents (linked to part/personnel)
 *   4. transactions, disputes
 *   5. aog_events, notifications, kyc, jobs, work_orders
 *
 * Usage:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/seed-supabase.mjs
 *
 * Idempotent — re-running upserts every row by natural unique key.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ISO = (s) => new Date(s + 'T00:00:00Z').toISOString();

// ── Demo users ──────────────────────────────────────────────────────
const DEMO_USERS = [
  { email: 'operator@naluka.aero',   password: 'demo1234', name: 'Sipho Dlamini', role: 'OPERATOR' },
  { email: 'admin@naluka.aero',      password: 'demo1234', name: 'Trust Admin',   role: 'ADMIN'    },
  { email: 'contractor@naluka.aero', password: 'demo1234', name: 'Sipho Dlamini', role: 'AME'      },
];

// ── Marketplace parts ────────────────────────────────────────────────
const PARTS = [
  { name: 'CFM56-7B Fuel Pump Assembly', pn: 'CFM-FP-7B-0042', cert: 'EASA Form 1', supplier: 'AeroTech Parts SA',   location: 'Johannesburg', price: 'ZAR 142,500', status: 'verified',  condition: 'Overhauled',  aog: true  },
  { name: 'Avionics LRU Module G1000',   pn: 'AV-LRU-G1000-11', cert: 'FAA 8130-3',  supplier: 'Global Avionics Ltd', location: 'Cape Town',    price: 'ZAR 89,000',  status: 'verified',  condition: 'Serviceable', aog: true  },
  { name: 'Nose Gear Actuator Assembly', pn: 'NG-ACT-737-006',  cert: 'SACAA F-18',  supplier: 'Nairobi MRO Centre',  location: 'Nairobi',      price: 'ZAR 211,000', status: 'verified',  condition: 'New',         aog: false },
  { name: 'APU Starter Motor',           pn: 'APU-SM-RE150-02', cert: 'EASA Form 1', supplier: 'Cape Aviation Parts', location: 'Cape Town',    price: 'ZAR 34,200',  status: 'verified',  condition: 'Overhauled',  aog: false },
  { name: 'Brake Control Unit',          pn: 'BCU-B737-443',    cert: 'SACAA F-18',  supplier: 'SA AeroSpares',       location: 'Pretoria',     price: 'ZAR 56,800',  status: 'expiring',  condition: 'Serviceable', aog: false },
  { name: 'Engine Bleed Air Valve',      pn: 'BAV-CFM-B1-019',  cert: 'FAA 8130-3',  supplier: 'Pan-African Aviation',location: 'Addis Ababa',  price: 'ZAR 28,400',  status: 'verified',  condition: 'New',         aog: false },
];

// ── Personnel ───────────────────────────────────────────────────────
// Discipline / part / subtype / aircraft / medical columns added in
// migration 0006 (SACAA Parts 61-71 + non_licensed). Fresh DBs need
// these populated; the migration backfills the original 6 rows for
// existing DBs but new clones run through this script.
const PERSONNEL = [
  // Original 6
  { name: 'Sipho Dlamini',   initials: 'SD', license: 'SA-0142-B1',  role: 'Licensed Aircraft Engineer', rating: 'Part 66 Cat B1', types: ['B737','A320'],   location: 'Johannesburg', status: 'verified', expires: '2025-08-14', available: true,  rate: 'ZAR 4,200/day',
    discipline: 'ame', sacaa_part: 66, licence_subtype: 'B1', aircraft_category: 'aeroplane', medical_class: 'none',    endorsements: [] },
  { name: 'Anele Mokoena',   initials: 'AM', license: 'SA-0089-P1',  role: 'Commercial Pilot',           rating: 'Part 61 ATPL',   types: ['B737','B767'],   location: 'Cape Town',    status: 'expiring', expires: '2024-12-30', available: true,  rate: 'ZAR 6,800/day',
    discipline: 'flight_crew', sacaa_part: 61, licence_subtype: 'ATPL', aircraft_category: 'aeroplane', medical_class: 'class_1', endorsements: ['Instrument','B737 Type','B767 Type'] },
  { name: 'Tariq Hassan',    initials: 'TH', license: 'KE-0301-ATC', role: 'Air Traffic Controller',     rating: 'Part 65 ATC-APP',types: ['Enroute','APP'], location: 'Nairobi',      status: 'pending',  expires: null,         available: false, rate: 'ZAR 5,100/day',
    discipline: 'atc', sacaa_part: 65, licence_subtype: 'ATC-APP', aircraft_category: 'none', medical_class: 'class_2', endorsements: ['Approach','Enroute'] },
  { name: 'Nomvula Khumalo', initials: 'NK', license: 'SA-0056-B2',  role: 'Avionics Engineer',          rating: 'Part 66 Cat B2', types: ['A320','A330'],   location: 'Durban',       status: 'expired',  expires: '2024-09-01', available: false, rate: 'ZAR 3,900/day',
    discipline: 'ame', sacaa_part: 66, licence_subtype: 'B2', aircraft_category: 'aeroplane', medical_class: 'none', endorsements: ['Avionics'] },
  { name: 'Kagiso Sithole',  initials: 'KS', license: 'SA-0211-P2',  role: 'Commercial Pilot',           rating: 'Part 61 CPL',    types: ['C208','PC-12'],  location: 'Pretoria',     status: 'verified', expires: '2026-03-22', available: true,  rate: 'ZAR 3,200/day',
    discipline: 'flight_crew', sacaa_part: 61, licence_subtype: 'CPL', aircraft_category: 'aeroplane', medical_class: 'class_1', endorsements: ['Instrument'] },
  { name: 'Amara Diallo',    initials: 'AD', license: 'SA-0388-B1',  role: 'Licensed Aircraft Engineer', rating: 'Part 66 Cat B1', types: ['B737','B747'],   location: 'Johannesburg', status: 'verified', expires: '2025-11-08', available: true,  rate: 'ZAR 4,500/day',
    discipline: 'ame', sacaa_part: 66, licence_subtype: 'B1', aircraft_category: 'aeroplane', medical_class: 'none', endorsements: [] },

  // Added in 0006 — covers cabin crew, DAME, RPAS, FE, firefighter, marshaller, NPL.
  { name: 'Lerato Tshabalala', initials: 'LT', license: 'SA-CC-2024-0058', role: 'Senior Cabin Crew',
    rating: 'Part 64 SEP', types: ['B737','A320'], location: 'Johannesburg',
    status: 'verified', expires: '2026-09-30', available: true, rate: 'ZAR 2,800/day',
    discipline: 'cabin_crew', sacaa_part: 64, licence_subtype: 'CCM', aircraft_category: 'aeroplane', medical_class: 'class_2',
    endorsements: ['SEP Current','CRM','B737 Type','A320 Type'] },
  { name: 'Dr Priya Naidoo', initials: 'PN', license: 'SA-DAME-0091', role: 'Designated Aviation Medical Examiner',
    rating: 'Part 67 DAME', types: [], location: 'Cape Town',
    status: 'verified', expires: '2027-01-15', available: true, rate: 'ZAR 850/exam',
    discipline: 'aviation_medical', sacaa_part: 67, licence_subtype: 'DAME', aircraft_category: 'none', medical_class: 'none',
    endorsements: ['Class 1 Authority','Class 2 Authority','Class 3 Authority','Class 4 Authority'] },
  { name: 'Lwazi Mthembu', initials: 'LM', license: 'SA-RPAS-2025-0042', role: 'RPAS Pilot — Aerial Survey',
    rating: 'Part 71 RPL', types: ['Multirotor','Fixed-wing'], location: 'Pretoria',
    status: 'verified', expires: '2026-12-31', available: true, rate: 'ZAR 3,500/day',
    discipline: 'rpas_pilot', sacaa_part: 71, licence_subtype: 'RPL', aircraft_category: 'rpas', medical_class: 'class_4',
    endorsements: ['BVLOS Approval','Aerial Survey Endorsement'] },
  { name: 'Captain Johan van der Merwe', initials: 'JM', license: 'SA-FE-0017', role: 'Flight Engineer — B747',
    rating: 'Part 63 FE', types: ['B747'], location: 'Johannesburg',
    status: 'verified', expires: '2026-04-30', available: true, rate: 'ZAR 7,200/day',
    discipline: 'flight_engineer', sacaa_part: 63, licence_subtype: 'FE', aircraft_category: 'aeroplane', medical_class: 'class_1',
    endorsements: ['B747 Type'] },
  { name: 'Themba Zulu', initials: 'TZ', license: 'NL-FIRE-2024-0023', role: 'Aviation Firefighter — ICAO Cat 9',
    rating: 'ICAO 9 RFF', types: [], location: 'Johannesburg',
    status: 'verified', expires: null, available: true, rate: 'ZAR 4,500/day',
    discipline: 'non_licensed', sacaa_part: null, licence_subtype: null, aircraft_category: 'none', medical_class: 'none',
    endorsements: [], non_licensed_role: 'aviation_firefighter' },
  { name: 'Nokuthula Dube', initials: 'ND', license: 'NL-MARSH-2024-0011', role: 'Aircraft Marshaller / Ramp Coordinator',
    rating: 'GHM-3', types: [], location: 'Cape Town',
    status: 'verified', expires: null, available: true, rate: 'ZAR 1,800/day',
    discipline: 'non_licensed', sacaa_part: null, licence_subtype: null, aircraft_category: 'none', medical_class: 'none',
    endorsements: [], non_licensed_role: 'marshaller' },
  { name: 'Hennie Botha', initials: 'HB', license: 'SA-NPL-2023-0211', role: 'Recreational Pilot — Microlight',
    rating: 'Part 62 NPL', types: ['Microlight','Gyroplane'], location: 'Pretoria',
    status: 'verified', expires: '2026-07-12', available: true, rate: 'ZAR 1,500/day',
    discipline: 'national_pilot', sacaa_part: 62, licence_subtype: 'NPL', aircraft_category: 'microlight', medical_class: 'class_4',
    endorsements: ['Microlight','Gyroplane'] },
];

// ── Documents ───────────────────────────────────────────────────────
const DOCUMENTS = [
  { name: 'SACAA Part 66 Licence — Sipho Dlamini', ref_number: 'SA-0142-B1',         type: 'Personnel Licence',    issued: '2022-08-14', expires: '2025-08-14', status: 'verified', cert: 'Part 66 Cat B1', personnelLicense: 'SA-0142-B1' },
  { name: 'EASA Form 1 — CFM56-7B Fuel Pump',      ref_number: 'EASA-F1-2024-0342',  type: 'Release Certificate',  issued: '2024-01-10', expires: '2026-01-10', status: 'verified', cert: 'EASA Form 1',    partPn: 'CFM-FP-7B-0042' },
  { name: 'SACAA AMO Certificate — AeroTech SA',    ref_number: 'AMO-SA-2023-0089',  type: 'Organisation Cert',    issued: '2023-03-01', expires: '2025-03-01', status: 'expiring', cert: 'Part 145 AMO' },
  { name: 'Class 1 Medical — Anele Mokoena',        ref_number: 'MED-SA-0089-CL1',   type: 'Medical Certificate',  issued: '2023-06-15', expires: '2024-12-30', status: 'expiring', cert: 'Class 1 Medical', personnelLicense: 'SA-0089-P1' },
  { name: 'FAA 8130-3 — Avionics LRU G1000',        ref_number: 'FAA-8130-2024-1102',type: 'Release Certificate',  issued: '2024-04-22', expires: '2027-04-22', status: 'verified', cert: 'FAA 8130-3',     partPn: 'AV-LRU-G1000-11' },
  { name: 'SACAA Part 66 — Nomvula Khumalo',        ref_number: 'SA-0056-B2',        type: 'Personnel Licence',    issued: '2022-03-01', expires: '2024-09-01', status: 'expired',  cert: 'Part 66 Cat B2', personnelLicense: 'SA-0056-B2' },
  { name: 'Digital RTS — ZS-OAL Maintenance',       ref_number: 'RTS-2024-11-0041',  type: 'Release to Service',   issued: '2024-11-12', expires: null,         status: 'verified', cert: 'Digital RTS' },
  { name: 'SACAA Form 18 — Imported APU Parts',     ref_number: 'F18-SA-2024-0078',  type: 'Import Clearance',     issued: '2024-09-30', expires: '2025-03-30', status: 'verified', cert: 'SACAA Form 18' },
];

// ── Transactions ────────────────────────────────────────────────────
const TRANSACTIONS = [
  { id: 'TXN-2024-0041', type: 'Parts',     item: 'CFM56-7B Fuel Pump Assembly',         party: 'AeroTech Parts SA',     amount: 'ZAR 142,500', status: 'rts-pending', created: '2024-11-12', aog: true  },
  { id: 'TXN-2024-0039', type: 'Personnel', item: 'Licensed Engineer — 3-day contract',  party: 'Sipho Dlamini',         amount: 'ZAR 12,600',  status: 'completed',   created: '2024-11-08', aog: false },
  { id: 'TXN-2024-0038', type: 'Parts',     item: 'Avionics LRU Module G1000',           party: 'Global Avionics Ltd',   amount: 'ZAR 89,000',  status: 'in-escrow',   created: '2024-11-07', aog: true  },
  { id: 'TXN-2024-0035', type: 'MRO',       item: 'A-Check Service — ZS-OAL',            party: 'JHB Aviation Services', amount: 'ZAR 320,000', status: 'in-escrow',   created: '2024-10-30', aog: false },
  { id: 'TXN-2024-0031', type: 'Parts',     item: 'Nose Gear Actuator Assembly',         party: 'Nairobi MRO Centre',    amount: 'ZAR 211,000', status: 'dispute',     created: '2024-10-22', aog: false },
  { id: 'TXN-2024-0028', type: 'Personnel', item: 'ATPL Pilot — Ferry Flight',           party: 'Anele Mokoena',         amount: 'ZAR 6,800',   status: 'completed',   created: '2024-10-18', aog: false },
  { id: 'TXN-2024-0027', type: 'MRO',       item: 'A-Check Service — 5Y-KQZ',            party: 'JHB Aviation Services', amount: 'ZAR 180,000', status: 'dispute',     created: '2024-10-15', aog: false },
];

const AOG_EVENTS = [
  { reg: 'ZS-OAL', location: 'FAOR · Johannesburg', part: 'CFM56-7B Fuel Pump Assembly — Part 145 engineer also required', matches: 2 },
  { reg: 'ZS-SFN', location: 'FACT · Cape Town',     part: 'Avionics LRU Module G1000 — rotable required urgently',         matches: 1 },
  { reg: '5Y-KQZ', location: 'HKNA · Nairobi',       part: 'Nose Gear Actuator Assembly — KCAA-certified MRO needed',       matches: 3 },
];

const NOTIFICATIONS = [
  { type: 'aog',     title: 'AOG Alert — ZS-OAL',                body: 'CFM56-7B Fuel Pump matched to 2 suppliers. Escrow ready.',                  unread: true,  ageMinutes: 2     },
  { type: 'warning', title: 'Licence Expiring — Anele Mokoena',  body: 'Part 61 ATPL expires in 42 days. Renewal reminder sent.',                   unread: true,  ageMinutes: 60    },
  { type: 'success', title: 'RTS Signed — ZS-SFN',               body: 'Sipho Dlamini signed Digital Release to Service. ZAR 89,000 released.',     unread: false, ageMinutes: 180   },
  { type: 'success', title: 'KYC Approved — Kagiso Sithole',     body: 'Identity verified. Compliance Badge now active.',                            unread: false, ageMinutes: 1440  },
  { type: 'warning', title: 'AOG Resolved — 5Y-KQZ',             body: 'Nose Gear Actuator dispatched. Awaiting delivery confirmation.',             unread: false, ageMinutes: 1500  },
];

const KYC = [
  { id: 'KYC-2411-042', name: 'Thabo Nkosi',      type: 'Licensed Engineer', license: 'SA-0388-B1',  docs: ['SACAA Licence', 'ID Document', 'Medical Cert'], risk: 'low',    submittedHoursAgo: 2  },
  { id: 'KYC-2411-041', name: 'Fatima Al-Hassan', type: 'Commercial Pilot',  license: 'SA-0401-P1',  docs: ['SACAA Licence', 'ID Document'],                  risk: 'medium', submittedHoursAgo: 5  },
  { id: 'KYC-2411-039', name: 'Moses Kamau',      type: 'ATC Officer',       license: 'KE-0312-ATC', docs: ['KCAA Licence', 'ID Document', 'Medical Cert'],   risk: 'low',    submittedHoursAgo: 24 },
  { id: 'KYC-2411-037', name: 'Priya Naidoo',     type: 'DAME',              license: 'SA-DAME-0091',docs: ['SACAA Medical Auth', 'ID Document'],             risk: 'high',   submittedHoursAgo: 30 },
  { id: 'KYC-2411-036', name: 'Charl Pretorius',  type: 'Licensed Engineer', license: 'SA-0199-B2',  docs: ['SACAA Licence', 'ID Document', 'Medical Cert'],  risk: 'low',    submittedHoursAgo: 48 },
];

const DISPUTES = [
  { id: 'TXN-2024-0031', buyer: 'Kenya Airways',   seller: 'Nairobi MRO Centre',    amount: 'ZAR 211,000', reason: 'Documentation incomplete — SACAA Form 18 missing', days: 8 },
  { id: 'TXN-2024-0027', buyer: 'Africa Express',  seller: 'JHB Aviation Services', amount: 'ZAR 180,000', reason: 'Buyer disputes RTS signatory authorisation level', days: 3 },
];

const JOBS = [
  { id: 'JOB-2411-041', title: 'B737 AOG — Fuel Pump R&R',    airline: 'South African Airways', location: 'FAOR · Johannesburg', duration: '2 days',  rate: 'ZAR 4,200/day', urgency: 'aog',    match: '98%', rating_req: 'Part 66 Cat B1' },
  { id: 'JOB-2411-038', title: 'A320 Line Maintenance Check', airline: 'FlySafair',             location: 'FACT · Cape Town',    duration: '5 days',  rate: 'ZAR 4,200/day', urgency: 'normal', match: '94%', rating_req: 'Part 66 Cat B1' },
  { id: 'JOB-2411-031', title: 'C-Check Support — B767',      airline: 'Ethiopian Airlines',    location: 'HAAB · Addis Ababa',  duration: '3 weeks', rate: 'ZAR 4,000/day', urgency: 'normal', match: '87%', rating_req: 'Part 66 Cat B1' },
];

// ────────────────────────────────────────────────────────────────────
async function ensureUser({ email, password, name, role }) {
  // listUsers paginates; for 3 demo accounts we don't paginate.
  const { data: existing } = await sb.auth.admin.listUsers({ perPage: 200 });
  const found = existing?.users?.find((u) => u.email === email);
  if (found) {
    await sb.auth.admin.updateUserById(found.id, {
      password,
      user_metadata: { name, role },
      email_confirm: true,
    });
    return found.id;
  }
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });
  if (error) throw error;
  return data.user.id;
}

async function upsertProfile(id, { email, name, role }) {
  // The handle_new_user trigger creates a profile row with default role=AME.
  // Force the explicit role here.
  const { error } = await sb
    .from('profile')
    .upsert({ id, email, name, role }, { onConflict: 'id' });
  if (error) throw error;
}

async function main() {
  console.log('▼ Seeding Naluka…');

  // 1. Users + profiles
  const userIds = {};
  for (const u of DEMO_USERS) {
    userIds[u.email] = await ensureUser(u);
    await upsertProfile(userIds[u.email], u);
  }
  console.log(`  users: ${DEMO_USERS.length}`);

  const operatorId   = userIds['operator@naluka.aero'];
  const contractorId = userIds['contractor@naluka.aero'];

  // 2. Parts
  const { error: partsErr } = await sb.from('part').upsert(PARTS, { onConflict: 'pn' });
  if (partsErr) throw partsErr;
  console.log(`  parts: ${PARTS.length}`);

  // 3. Personnel — link contractor user
  const personnelRows = PERSONNEL.map((p) => ({
    name: p.name, initials: p.initials, license: p.license, role: p.role,
    rating: p.rating, types: p.types, location: p.location, status: p.status,
    expires: p.expires ? ISO(p.expires) : null,
    available: p.available, rate: p.rate,
    discipline: p.discipline,
    sacaa_part: p.sacaa_part,
    licence_subtype: p.licence_subtype,
    aircraft_category: p.aircraft_category,
    medical_class: p.medical_class,
    endorsements: p.endorsements ?? [],
    non_licensed_role: p.non_licensed_role ?? null,
    user_id: p.license === 'SA-0142-B1' ? contractorId : null,
  }));
  const { error: pplErr } = await sb.from('personnel').upsert(personnelRows, { onConflict: 'license' });
  if (pplErr) throw pplErr;
  console.log(`  personnel: ${PERSONNEL.length}`);

  // Look up freshly-seeded part / personnel IDs for FK resolution
  const { data: partRows }    = await sb.from('part').select('id, pn');
  const { data: personnelRowsDB } = await sb.from('personnel').select('id, license');
  const partByPn       = Object.fromEntries(partRows.map((r) => [r.pn, r.id]));
  const personnelByLic = Object.fromEntries(personnelRowsDB.map((r) => [r.license, r.id]));
  const siphoId        = personnelByLic['SA-0142-B1'];

  // 4. Documents
  const docRows = DOCUMENTS.map((d) => ({
    name: d.name,
    ref_number: d.ref_number,
    type: d.type,
    issued: ISO(d.issued),
    expires: d.expires ? ISO(d.expires) : null,
    status: d.status,
    cert: d.cert,
    part_id:      d.partPn            ? partByPn[d.partPn]            ?? null : null,
    personnel_id: d.personnelLicense  ? personnelByLic[d.personnelLicense] ?? null : null,
  }));
  const { error: docErr } = await sb.from('document').upsert(docRows, { onConflict: 'ref_number' });
  if (docErr) throw docErr;
  console.log(`  documents: ${DOCUMENTS.length}`);

  // 5. Transactions
  const txnRows = TRANSACTIONS.map((t) => ({
    id: t.id, type: t.type, item: t.item, party: t.party,
    amount: t.amount, status: t.status, aog: t.aog,
    created_at: ISO(t.created),
  }));
  const { error: txnErr } = await sb.from('transaction').upsert(txnRows, { onConflict: 'id' });
  if (txnErr) throw txnErr;
  console.log(`  transactions: ${TRANSACTIONS.length}`);

  // 6. Disputes (FK to transaction)
  const dispRows = DISPUTES.map((d) => ({
    id: d.id, transaction_id: d.id, buyer: d.buyer, seller: d.seller,
    amount: d.amount, reason: d.reason, days: d.days, status: 'open',
  }));
  const { error: dispErr } = await sb.from('dispute').upsert(dispRows, { onConflict: 'id' });
  if (dispErr) throw dispErr;
  console.log(`  disputes: ${DISPUTES.length}`);

  // 7. AOG events — full reset (no natural unique key)
  await sb.from('aog_event').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error: aogErr } = await sb.from('aog_event').insert(AOG_EVENTS);
  if (aogErr) throw aogErr;
  console.log(`  aog events: ${AOG_EVENTS.length}`);

  // 8. Notifications — attach to operator
  await sb.from('notification').delete().eq('user_id', operatorId);
  const notifRows = NOTIFICATIONS.map((n) => ({
    user_id: operatorId,
    type: n.type, title: n.title, body: n.body, unread: n.unread,
    created_at: new Date(Date.now() - n.ageMinutes * 60_000).toISOString(),
  }));
  const { error: notifErr } = await sb.from('notification').insert(notifRows);
  if (notifErr) throw notifErr;
  console.log(`  notifications: ${NOTIFICATIONS.length}`);

  // 9. KYC
  const kycRows = KYC.map((k) => ({
    id: k.id, name: k.name, type: k.type, license: k.license, docs: k.docs,
    risk: k.risk, status: 'pending',
    submitted_at: new Date(Date.now() - k.submittedHoursAgo * 3600_000).toISOString(),
  }));
  const { error: kycErr } = await sb.from('kyc_application').upsert(kycRows, { onConflict: 'id' });
  if (kycErr) throw kycErr;
  console.log(`  kyc: ${KYC.length}`);

  // 10. Jobs
  const jobRows = JOBS.map((j) => ({
    id: j.id, title: j.title, airline: j.airline, location: j.location,
    duration: j.duration, rate: j.rate, urgency: j.urgency, match: j.match,
    rating_req: j.rating_req, contractor_id: siphoId ?? null,
  }));
  const { error: jobErr } = await sb.from('job').upsert(jobRows, { onConflict: 'id' });
  if (jobErr) throw jobErr;
  console.log(`  jobs: ${JOBS.length}`);

  // 11. Active work order
  const { error: woErr } = await sb.from('work_order').upsert([
    {
      reference: 'WO-2024-11-0041',
      aircraft: 'ZS-OAL · Boeing 737-800',
      task: 'Fuel Pump Assembly Replacement',
      airline: 'South African Airways',
      part_used: 'CFM56-7B · S/N 872341-A',
      payout: 'ZAR 8,400',
      contractor_id: siphoId ?? null,
    },
  ], { onConflict: 'reference' });
  if (woErr) throw woErr;
  console.log(`  work orders: 1`);

  console.log('▲ Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
