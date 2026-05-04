-- Naluka — self-signup for aviation professionals.
--
-- Enables a pilot / cabin crew / AME / ATC / DAME / RPAS / ground-ops
-- user to sign up directly on /register with their discipline. The
-- handle_new_user trigger creates BOTH the profile row (existing) AND
-- a stub personnel row (new) when user_metadata carries a 'discipline'
-- key. Status starts at 'pending' awaiting admin verification.
--
-- See plan doc §20 (P1 #3). Approved by user 2026-05-04.

-- ── Relax NOT NULL constraints so a stub personnel row is creatable ──
-- A self-registered user provides discipline + location at signup; the
-- rest (rate, rating, role display, full licence details) gets filled
-- in via the profile page or KYC. Existing seed rows aren't affected
-- (they already have values for all of these).
alter table public.personnel alter column license   drop not null;
alter table public.personnel alter column role      drop not null;
alter table public.personnel alter column rating    drop not null;
alter table public.personnel alter column location  drop not null;
alter table public.personnel alter column rate      drop not null;

-- license is unique when present. Postgres lets multiple NULLs coexist
-- under a standard UNIQUE — exactly what we want for stub rows. The
-- existing constraint already permits this; nothing to change.

-- ── Extend handle_new_user trigger ──────────────────────────────────
-- When user_metadata.discipline is set, create the matching personnel
-- row in the same transaction as the profile insert. SECURITY DEFINER
-- so the insert runs as table owner regardless of the new user's RLS.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  meta              jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name            text  := coalesce(meta->>'name', split_part(new.email, '@', 1));
  v_role            public.role := coalesce((meta->>'role')::public.role, 'AME');
  v_discipline      text  := meta->>'discipline';
  v_initials        text;
begin
  -- 1. Profile row (existing behaviour).
  insert into public.profile (id, email, name, role)
  values (new.id, new.email, v_name, v_role);

  -- 2. Personnel stub — only if the user picked an aviation discipline.
  --    OPERATOR / SUPPLIER / AMO / ADMIN sign-ups skip this step.
  if v_discipline is not null and v_discipline <> '' then
    -- "Sipho Dlamini" → "SD"; falls back to first 2 chars of email.
    v_initials := upper(
      coalesce(
        nullif(
          substring(v_name from '^([A-Za-z])') ||
          substring(v_name from ' ([A-Za-z])'),
        ''),
        substring(new.email from 1 for 2)
      )
    );

    insert into public.personnel (
      user_id, name, initials, license, role, rating, types, location,
      status, expires, available, rate,
      discipline, sacaa_part, licence_subtype, aircraft_category,
      medical_class, endorsements, non_licensed_role
    ) values (
      new.id,
      v_name,
      v_initials,
      nullif(meta->>'license', ''),
      nullif(meta->>'role_title', ''),
      nullif(meta->>'rating', ''),
      '{}',
      nullif(meta->>'location', ''),
      'pending',
      null,
      false,                                                 -- not bookable until verified
      null,
      v_discipline::public.sacaa_discipline,
      nullif(meta->>'sacaa_part', '')::smallint,
      nullif(meta->>'licence_subtype', ''),
      coalesce(nullif(meta->>'aircraft_category', '')::public.aircraft_category, 'aeroplane'),
      coalesce(nullif(meta->>'medical_class', '')::public.medical_class, 'none'),
      '{}',
      nullif(meta->>'non_licensed_role', '')
    );
  end if;

  return new;
end;
$$;

-- The trigger itself (on_auth_user_created) doesn't need re-creation —
-- it already calls public.handle_new_user, which we just replaced.
