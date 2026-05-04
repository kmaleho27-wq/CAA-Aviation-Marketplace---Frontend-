-- Naluka — SACAA Part-aligned personnel taxonomy.
--
-- Adds structured columns to public.personnel covering all SACAA Parts
-- relevant to aviation workforce: 61, 62, 63, 64, 65, 66, 67, 68, 69, 71.
-- Plus a 'non_licensed' bucket for ground ops not covered by a SACAA Part
-- (firemen, marshallers, refuelers, security, etc.).
--
-- See plan doc §19 for the full design. Approved by user 2026-05-04.
--
-- Existing free-form columns kept untouched:
--   role        — human-readable job title ("Senior Cabin Crew", "DAME", etc.)
--   rating      — human-readable rating string ("Part 61 ATPL", etc.)
--   types       — aircraft type ratings array (B737, A320, etc.)
-- The new columns are for filtering and verification; UI keeps using
-- `role` / `rating` for display.

-- ── Enums ─────────────────────────────────────────────────────────

create type public.sacaa_discipline as enum (
  'flight_crew',          -- Part 61 (PPL, CPL, ATPL — aeroplane / helicopter)
  'national_pilot',       -- Part 62 (NPL — microlight, gyroplane, LSA)
  'glider_pilot',         -- Part 68
  'balloon_pilot',        -- Part 69
  'rpas_pilot',           -- Part 71 (RPL — drones)
  'flight_engineer',      -- Part 63
  'cabin_crew',           -- Part 64
  'atc',                  -- Part 65 (ATC + Assistant ATC)
  'ame',                  -- Part 66 (Cat A / B1 / B2 / C)
  'aviation_medical',     -- Part 67 (DAMEs)
  'non_licensed'          -- Firemen, marshallers, refuelers, security, etc.
);

create type public.aircraft_category as enum (
  'aeroplane',
  'helicopter',
  'glider',
  'balloon',
  'microlight',
  'gyroplane',
  'lsa',
  'rpas',
  'none'                  -- ATC, DAMEs, ground ops
);

create type public.medical_class as enum (
  'class_1',              -- ATPL, CPL, FE
  'class_2',              -- PPL, NPL, ATC, cabin crew
  'class_3',              -- ATC (some categories)
  'class_4',              -- recreational / glider / RPAS
  'none'                  -- AMEs, DAMEs themselves, ground ops, non-licensed
);

-- ── Add columns to personnel ──────────────────────────────────────
-- discipline starts nullable so existing rows can be backfilled, then
-- we set NOT NULL at the end of this migration.

alter table public.personnel
  add column discipline         public.sacaa_discipline,
  add column sacaa_part         smallint,
  add column licence_subtype    text,
  add column aircraft_category  public.aircraft_category default 'aeroplane' not null,
  add column medical_class      public.medical_class default 'none' not null,
  add column endorsements       text[] default '{}' not null,
  add column non_licensed_role  text;

-- Consistency check: discipline=non_licensed iff sacaa_part null AND non_licensed_role set.
-- Otherwise non_licensed_role must be null (free-form text already lives in `role`).
alter table public.personnel add constraint personnel_taxonomy_consistent check (
  (
    discipline = 'non_licensed'
    and sacaa_part is null
    and non_licensed_role is not null
    and non_licensed_role <> ''
  )
  or (
    discipline is distinct from 'non_licensed'
    and non_licensed_role is null
  )
);

-- ── Backfill the 6 existing seeded rows ──────────────────────────

update public.personnel set
  discipline = 'ame',
  sacaa_part = 66,
  licence_subtype = 'B1',
  aircraft_category = 'aeroplane',
  medical_class = 'none',
  endorsements = '{}'
  where license = 'SA-0142-B1';   -- Sipho Dlamini

update public.personnel set
  discipline = 'flight_crew',
  sacaa_part = 61,
  licence_subtype = 'ATPL',
  aircraft_category = 'aeroplane',
  medical_class = 'class_1',
  endorsements = '{Instrument,B737 Type,B767 Type}'
  where license = 'SA-0089-P1';   -- Anele Mokoena

update public.personnel set
  discipline = 'atc',
  sacaa_part = 65,
  licence_subtype = 'ATC-APP',
  aircraft_category = 'none',
  medical_class = 'class_2',
  endorsements = '{Approach,Enroute}'
  where license = 'KE-0301-ATC';  -- Tariq Hassan

update public.personnel set
  discipline = 'ame',
  sacaa_part = 66,
  licence_subtype = 'B2',
  aircraft_category = 'aeroplane',
  medical_class = 'none',
  endorsements = '{Avionics}'
  where license = 'SA-0056-B2';   -- Nomvula Khumalo

update public.personnel set
  discipline = 'flight_crew',
  sacaa_part = 61,
  licence_subtype = 'CPL',
  aircraft_category = 'aeroplane',
  medical_class = 'class_1',
  endorsements = '{Instrument}'
  where license = 'SA-0211-P2';   -- Kagiso Sithole

update public.personnel set
  discipline = 'ame',
  sacaa_part = 66,
  licence_subtype = 'B1',
  aircraft_category = 'aeroplane',
  medical_class = 'none',
  endorsements = '{}'
  where license = 'SA-0388-B1';   -- Amara Diallo

-- All existing rows now have a discipline. Lock it in.
alter table public.personnel alter column discipline set not null;

-- ── New seed rows covering disciplines we don't have yet ─────────

insert into public.personnel (
  name, initials, license, role, rating, types, location,
  status, expires, available, rate,
  discipline, sacaa_part, licence_subtype, aircraft_category, medical_class,
  endorsements, non_licensed_role
)
values
  -- Cabin Crew (Part 64)
  ('Lerato Tshabalala', 'LT', 'SA-CC-2024-0058', 'Senior Cabin Crew',
   'Part 64 SEP', '{B737,A320}', 'Johannesburg',
   'verified', '2026-09-30', true, 'ZAR 2,800/day',
   'cabin_crew', 64, 'CCM', 'aeroplane', 'class_2',
   '{SEP Current,CRM,B737 Type,A320 Type}', null
  ),

  -- DAME (Part 67)
  ('Dr Priya Naidoo', 'PN', 'SA-DAME-0091', 'Designated Aviation Medical Examiner',
   'Part 67 DAME', '{}', 'Cape Town',
   'verified', '2027-01-15', true, 'ZAR 850/exam',
   'aviation_medical', 67, 'DAME', 'none', 'none',
   '{Class 1 Authority,Class 2 Authority,Class 3 Authority,Class 4 Authority}', null
  ),

  -- RPAS Pilot (Part 71)
  ('Lwazi Mthembu', 'LM', 'SA-RPAS-2025-0042', 'RPAS Pilot — Aerial Survey',
   'Part 71 RPL', '{Multirotor,Fixed-wing}', 'Pretoria',
   'verified', '2026-12-31', true, 'ZAR 3,500/day',
   'rpas_pilot', 71, 'RPL', 'rpas', 'class_4',
   '{BVLOS Approval,Aerial Survey Endorsement}', null
  ),

  -- Flight Engineer (Part 63)
  ('Captain Johan van der Merwe', 'JM', 'SA-FE-0017', 'Flight Engineer — B747',
   'Part 63 FE', '{B747}', 'Johannesburg',
   'verified', '2026-04-30', true, 'ZAR 7,200/day',
   'flight_engineer', 63, 'FE', 'aeroplane', 'class_1',
   '{B747 Type}', null
  ),

  -- Aviation Firefighter (non-licensed)
  ('Themba Zulu', 'TZ', 'NL-FIRE-2024-0023', 'Aviation Firefighter — ICAO Cat 9',
   'ICAO 9 RFF', '{}', 'Johannesburg',
   'verified', null, true, 'ZAR 4,500/day',
   'non_licensed', null, null, 'none', 'none',
   '{}', 'aviation_firefighter'
  ),

  -- Aircraft Marshaller (non-licensed)
  ('Nokuthula Dube', 'ND', 'NL-MARSH-2024-0011', 'Aircraft Marshaller / Ramp Coordinator',
   'GHM-3', '{}', 'Cape Town',
   'verified', null, true, 'ZAR 1,800/day',
   'non_licensed', null, null, 'none', 'none',
   '{}', 'marshaller'
  ),

  -- National Pilot (Part 62) — microlight
  ('Hennie Botha', 'HB', 'SA-NPL-2023-0211', 'Recreational Pilot — Microlight',
   'Part 62 NPL', '{Microlight,Gyroplane}', 'Pretoria',
   'verified', '2026-07-12', true, 'ZAR 1,500/day',
   'national_pilot', 62, 'NPL', 'microlight', 'class_4',
   '{Microlight,Gyroplane}', null
  )

on conflict (license) do nothing;

-- ── Recreate personnel_public view exposing the new structured cols ──
-- Still masks license, rate, expires per D2 PII decision.

drop view if exists public.personnel_public;

create view public.personnel_public
  with (security_invoker = false) as
  select
    id,
    name,
    initials,
    role,
    rating,
    types,
    discipline,
    sacaa_part,
    licence_subtype,
    aircraft_category,
    medical_class,
    endorsements,
    non_licensed_role,
    location,
    status,
    available,
    created_at
  from public.personnel;

grant select on public.personnel_public to authenticated, anon;

-- ── Indexes for the new filter columns ───────────────────────────

create index personnel_discipline_idx on public.personnel(discipline);
create index personnel_sacaa_part_idx on public.personnel(sacaa_part) where sacaa_part is not null;
