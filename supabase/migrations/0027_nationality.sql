-- Naluka — capture nationality at signup.
--
-- Why: SACAA verifies licences differently for SA nationals vs foreign
-- nationals. SA nationals get verified directly against SACAA's
-- register. Foreign nationals (expat pilots, contracted engineers, etc.)
-- need ICAO state-of-licence validation against the licensing
-- authority of their home country (CAA UK, FAA, EASA, etc.). Capturing
-- nationality at signup lets the admin reviewer pick the right
-- verification path immediately instead of going back to ask.
--
-- Stores ISO 3166-1 alpha-2 (e.g. 'ZA', 'ZW', 'GB'). Two letters keeps
-- it portable, queryable, and consistent with the rest of the world's
-- databases. Display labels live in the UI.

alter table public.personnel
  add column if not exists nationality char(2);

alter table public.profile
  add column if not exists nationality char(2);

create index if not exists personnel_nationality_idx
  on public.personnel(nationality);

-- ── Update handle_new_user trigger ──────────────────────────────
-- Reads meta->>'nationality' (already passed by Register.jsx) and
-- writes to BOTH profile and personnel rows. Existing users without
-- nationality stay null — backfill is a separate optional task.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  meta              jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name            text  := coalesce(meta->>'name', split_part(new.email, '@', 1));
  v_role            public.role := coalesce((meta->>'role')::public.role, 'AME');
  v_discipline      text  := meta->>'discipline';
  v_nationality     char(2) := nullif(upper(meta->>'nationality'), '');
  v_initials        text;
begin
  -- 1. Profile row.
  insert into public.profile (id, email, name, role, nationality)
  values (new.id, new.email, v_name, v_role, v_nationality);

  -- 2. Personnel stub — only if the user picked an aviation discipline.
  if v_discipline is not null and v_discipline <> '' then
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
      medical_class, endorsements, non_licensed_role, nationality
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
      false,
      null,
      v_discipline::public.sacaa_discipline,
      nullif(meta->>'sacaa_part', '')::smallint,
      nullif(meta->>'licence_subtype', ''),
      coalesce(nullif(meta->>'aircraft_category', '')::public.aircraft_category, 'aeroplane'),
      coalesce(nullif(meta->>'medical_class', '')::public.medical_class, 'none'),
      '{}',
      nullif(meta->>'non_licensed_role', ''),
      v_nationality
    );
  end if;

  return new;
end;
$$;
