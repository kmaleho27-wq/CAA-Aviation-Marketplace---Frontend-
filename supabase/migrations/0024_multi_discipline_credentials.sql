-- Naluka — multi-discipline credentials.
--
-- Real-world: a SACAA examiner who's also a Part 145 Cat B1 engineer
-- and an active ATPL pilot is one person, three SACAA credentials,
-- three separate licence numbers, three expiry dates, possibly
-- different medical classes per role.
--
-- We keep personnel.discipline as the PRIMARY credential (the one
-- shown first in marketplace cards). Additional credentials go in
-- personnel_credential with full per-credential metadata. The
-- expiry watchdog, audit pack, and admin verification queue all
-- pick up additional credentials automatically by querying this
-- table alongside personnel.

create table public.personnel_credential (
  id                 uuid primary key default gen_random_uuid(),
  personnel_id       uuid not null references public.personnel(id) on delete cascade,
  discipline         public.sacaa_discipline not null,
  sacaa_part         smallint,
  licence_subtype    text,
  license            text,                                -- this credential's licence number
  aircraft_category  public.aircraft_category not null default 'aeroplane',
  medical_class      public.medical_class not null default 'none',
  endorsements       text[] not null default '{}',
  expires            timestamptz,
  status             public.personnel_status not null default 'pending',
  non_licensed_role  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- A given personnel row can only carry each discipline ONCE. If
  -- you're an AME, you have one AME credential — multiple Cat B1
  -- ratings live in the endorsements array, not as duplicate rows.
  unique (personnel_id, discipline)
);

create index personnel_credential_personnel_idx
  on public.personnel_credential(personnel_id);
create index personnel_credential_status_idx
  on public.personnel_credential(status);
create index personnel_credential_expires_idx
  on public.personnel_credential(expires)
  where expires is not null;

create trigger personnel_credential_set_updated_at
  before update on public.personnel_credential
  for each row execute function public.set_updated_at();

-- ── RLS: same access pattern as personnel ────────────────────────
alter table public.personnel_credential enable row level security;

create policy personnel_credential_select on public.personnel_credential
  for select to authenticated
  using (
    exists (
      select 1 from public.personnel p
       where p.id = personnel_credential.personnel_id
         and (
           p.user_id = auth.uid()
           or public.is_admin()
           or p.created_by_operator = auth.uid()
           or exists (
             select 1 from public.transaction t
              where t.personnel_id = p.id
                and t.status in ('in-escrow', 'rts-pending')
                and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
           )
         )
    )
  );

create policy personnel_credential_insert_self on public.personnel_credential
  for insert to authenticated
  with check (
    exists (
      select 1 from public.personnel p
       where p.id = personnel_credential.personnel_id
         and (p.user_id = auth.uid() or p.created_by_operator = auth.uid() or public.is_admin())
    )
  );

create policy personnel_credential_update_self on public.personnel_credential
  for update to authenticated
  using (
    exists (
      select 1 from public.personnel p
       where p.id = personnel_credential.personnel_id
         and (p.user_id = auth.uid() or p.created_by_operator = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.personnel p
       where p.id = personnel_credential.personnel_id
         and (p.user_id = auth.uid() or p.created_by_operator = auth.uid() or public.is_admin())
    )
  );

create policy personnel_credential_delete_self on public.personnel_credential
  for delete to authenticated
  using (
    exists (
      select 1 from public.personnel p
       where p.id = personnel_credential.personnel_id
         and (p.user_id = auth.uid() or public.is_admin())
    )
  );

grant select, insert, update, delete on public.personnel_credential to authenticated;

-- ── add_personnel_credential RPC ─────────────────────────────────
-- User adds a secondary credential. Validates that the discipline
-- is not their primary (personnel.discipline) — if they want to
-- modify the primary, they edit the personnel row itself.
create or replace function public.add_personnel_credential(
  p_discipline       public.sacaa_discipline,
  p_sacaa_part       int default null,
  p_licence_subtype  text default null,
  p_license          text default null,
  p_aircraft_category public.aircraft_category default 'aeroplane',
  p_medical_class    public.medical_class default 'none',
  p_endorsements     text[] default '{}',
  p_expires          timestamptz default null,
  p_non_licensed_role text default null
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_personnel public.personnel;
  v_credential_id uuid;
begin
  if v_uid is null then raise exception 'must be signed in'; end if;

  select * into v_personnel
    from public.personnel
   where user_id = v_uid
   limit 1;
  if v_personnel.id is null then
    raise exception 'no personnel record for current user — register first';
  end if;

  if v_personnel.discipline = p_discipline then
    raise exception 'discipline % is already your primary credential — edit your profile to update it', p_discipline;
  end if;

  insert into public.personnel_credential (
    personnel_id, discipline, sacaa_part, licence_subtype, license,
    aircraft_category, medical_class, endorsements, expires,
    status, non_licensed_role
  )
  values (
    v_personnel.id, p_discipline, p_sacaa_part::smallint, p_licence_subtype, p_license,
    p_aircraft_category, p_medical_class, p_endorsements, p_expires,
    'pending', p_non_licensed_role
  )
  returning id into v_credential_id;

  return v_credential_id;
end;
$$;

grant execute on function public.add_personnel_credential(
  public.sacaa_discipline, int, text, text, public.aircraft_category,
  public.medical_class, text[], timestamptz, text
) to authenticated;
