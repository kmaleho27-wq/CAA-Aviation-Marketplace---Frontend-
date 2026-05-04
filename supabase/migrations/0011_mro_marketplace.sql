-- Naluka — MRO services marketplace.
--
-- Third marketplace alongside Parts + Personnel. AMOs (Part 145
-- maintenance organisations — profile.role = 'AMO') publish services
-- they offer (A-Check, line maintenance, engine overhaul). Operators
-- request quotes; quotes are notifications for now (real escrow + 8130
-- doc flow comes later).
--
-- See plan doc §20 (P3 #7). Approved by user 2026-05-04.

-- ── Service category ────────────────────────────────────────────
create type public.mro_service_category as enum (
  'a_check',           -- A-Check / line maintenance light
  'b_check',
  'c_check',           -- C-Check / heavy
  'd_check',
  'engine_overhaul',
  'avionics',
  'paint_interior',
  'aog_response',      -- 24/7 AOG dispatch
  'component',         -- component repair / overhaul
  'other'
);

-- ── mro_service ─────────────────────────────────────────────────
create table public.mro_service (
  id              uuid primary key default gen_random_uuid(),
  mro_id          uuid not null references public.profile(id) on delete cascade,
  name            text not null,                 -- "A-Check Service — B737"
  category        public.mro_service_category not null,
  description     text,                          -- 2-3 sentences
  aircraft_types  text[] not null default '{}',  -- ["B737","A320"]
  location        text not null,                 -- "FAOR · Johannesburg"
  lead_time_days  smallint,                      -- typical lead time
  price_from      text,                          -- "ZAR 280,000" — display string
  rating          numeric(3, 2),                 -- 0.00 – 5.00 (calc later)
  status          public.personnel_status not null default 'verified',
                                                 -- reuse the enum: verified / expiring / expired / pending
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index mro_service_mro_id_idx    on public.mro_service(mro_id);
create index mro_service_category_idx  on public.mro_service(category);
create index mro_service_active_idx    on public.mro_service(active) where active = true;
create index mro_service_location_idx  on public.mro_service(location);

create trigger mro_service_set_updated_at
  before update on public.mro_service
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.mro_service enable row level security;

-- Anyone authenticated reads active verified services (the
-- marketplace is open to all signed-in users).
create policy mro_service_select_active on public.mro_service
  for select to authenticated
  using (
    active = true
    and status = 'verified'
    or mro_id = auth.uid()                  -- AMO sees own (incl. inactive)
    or public.is_admin()
  );

-- AMO inserts/updates/deletes their own rows. Admin can do anything.
create policy mro_service_insert_self on public.mro_service
  for insert to authenticated
  with check (mro_id = auth.uid() or public.is_admin());

create policy mro_service_update_self on public.mro_service
  for update to authenticated
  using (mro_id = auth.uid() or public.is_admin())
  with check (mro_id = auth.uid() or public.is_admin());

create policy mro_service_delete_self on public.mro_service
  for delete to authenticated
  using (mro_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.mro_service to authenticated;

-- ── request_mro_quote RPC ───────────────────────────────────────
-- Operator clicks "Request quote" → we drop a notification on the AMO
-- (so they see it on their dashboard bell) and audit-log it. Real
-- escrow + 8130 doc + RTS flow lands in a follow-up sprint.
create or replace function public.request_mro_quote(p_service_id uuid, p_message text default null)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_service       public.mro_service;
  v_requester     public.profile;
  v_notification  uuid;
begin
  if auth.uid() is null then
    raise exception 'must be signed in';
  end if;

  select * into v_service from public.mro_service where id = p_service_id;
  if v_service.id is null then
    raise exception 'mro service not found: %', p_service_id;
  end if;

  select * into v_requester from public.profile where id = auth.uid();

  insert into public.notification (
    user_id, type, title, body, unread, created_at
  ) values (
    v_service.mro_id,
    'success',
    'Quote requested — ' || v_service.name,
    coalesce(v_requester.name, v_requester.email) ||
      ' is requesting a quote for ' || v_service.name ||
      coalesce(' — "' || nullif(p_message, '') || '"', '') ||
      '. Reply via Naluka to send pricing.',
    true,
    now()
  )
  returning id into v_notification;

  return jsonb_build_object(
    'service_id',     v_service.id,
    'service_name',   v_service.name,
    'mro_id',         v_service.mro_id,
    'notification_id', v_notification
  );
end;
$$;

grant execute on function public.request_mro_quote(uuid, text) to authenticated;

-- ── Seed data ───────────────────────────────────────────────────
-- Three demo services owned by the supplier@naluka.aero seed user
-- (already an AMO-equivalent in dev). Skipped if seed user not present.
do $$
declare
  v_amo uuid := (select id from public.profile where email = 'supplier@naluka.aero' limit 1);
begin
  if v_amo is null then return; end if;

  insert into public.mro_service (mro_id, name, category, description, aircraft_types, location, lead_time_days, price_from, rating)
  values
    (v_amo, 'A-Check — B737-800',          'a_check',         'Line maintenance A-Check inspection per Boeing AMM. Includes EASA Form 1 and digital RTS sign-off.', '{B737-800,B737NG}', 'FAOR · Johannesburg', 3,  'ZAR 280,000', 4.80),
    (v_amo, 'A-Check — A320 family',       'a_check',         'A320 family A-Check. Approved AMO with current Airbus AMP. SACAA Part 145 certified.',                '{A319,A320,A321}', 'FAOR · Johannesburg', 3,  'ZAR 295,000', 4.70),
    (v_amo, 'CFM56-7B Engine Overhaul',     'engine_overhaul','Hot section + cold section overhaul, on-condition module replacement, full back-to-birth traceability.', '{B737NG}',         'FAOR · Johannesburg', 21, 'ZAR 6,400,000', 4.90),
    (v_amo, 'AOG Rapid Response — 24/7',   'aog_response',    'Mobile AOG team dispatched within 90 minutes across Southern Africa. Part Cat A/B1/B2 engineers on call.', '{B737,A320,Q400,CRJ}', 'Pan-Africa', 1, 'ZAR 12,500/day', 4.95)
  on conflict do nothing;
end$$;
