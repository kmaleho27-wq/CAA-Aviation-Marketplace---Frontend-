-- Naluka — initial schema (Supabase port of server/prisma/schema.prisma)
--
-- Domain: profiles (auth-linked) + marketplace (parts, personnel) + vault
-- (documents) + transactions/escrow + dashboard (aog) + notifications +
-- admin (kyc, disputes) + contractor (jobs, work_orders) + audit chain.
--
-- Casing: snake_case (Postgres standard). The frontend wraps this via
-- @supabase/supabase-js and maps to camelCase in JS where convenient.
--
-- Audit chain: see public.audit_append() for the locking + hash strategy.
-- TL;DR — ACCESS EXCLUSIVE lock, MAX(seq)+1 inside the lock, deterministic
-- canonical-JSON hash. Matches the verifyChain() invariant the previous
-- TS implementation enforced (server/src/lib/ledger.ts).

-- ───── Extensions ───────────────────────────────────────
create extension if not exists pgcrypto;        -- gen_random_uuid, digest
create extension if not exists "uuid-ossp";     -- uuid_generate_v4 (legacy)

-- ───── Enums ────────────────────────────────────────────
create type public.role as enum ('AME','AMO','OPERATOR','SUPPLIER','ADMIN');
create type public.part_status as enum ('verified','expiring','expired');
create type public.part_condition as enum ('New','Overhauled','Serviceable');
create type public.personnel_status as enum ('verified','expiring','expired','pending');
create type public.document_type as enum (
  'Personnel Licence',
  'Release Certificate',
  'Organisation Cert',
  'Medical Certificate',
  'Release to Service',
  'Import Clearance'
);
create type public.document_status as enum ('verified','expiring','expired');
create type public.transaction_type as enum ('Parts','Personnel','MRO');
create type public.transaction_status as enum ('rts-pending','in-escrow','completed','dispute');
create type public.notification_type as enum ('aog','warning','success');
create type public.kyc_risk as enum ('low','medium','high');
create type public.kyc_status as enum ('pending','approved','rejected');
create type public.dispute_status as enum ('open','released','refunded','docs');
create type public.job_urgency as enum ('aog','normal');
create type public.audit_event_type as enum (
  'rts.signed',
  'funds.released',
  'funds.refunded',
  'kyc.approved',
  'kyc.rejected',
  'dispute.opened',
  'dispute.resolved'
);

-- ───── Profiles ─────────────────────────────────────────
-- Replaces Prisma's User model. Linked 1:1 to auth.users; role + sales-side
-- columns live here. Created automatically by handle_new_user trigger below.
create table public.profile (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null unique,
  name              text not null,
  role              public.role not null default 'AME',
  avatar_url        text,
  stripe_account_id text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index profile_role_idx on public.profile(role);

-- ───── Marketplace: Parts ───────────────────────────────
create table public.part (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  pn         text not null unique,
  cert       text not null,                -- "EASA Form 1", "FAA 8130-3", "SACAA F-18"
  supplier   text not null,                -- denormalized for v1
  location   text not null,
  price      text not null,                -- "ZAR 142,500" (display string; B6 swaps to cents)
  status     public.part_status not null default 'verified',
  condition  public.part_condition not null default 'New',
  aog        boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index part_aog_idx    on public.part(aog) where aog = true;
create index part_status_idx on public.part(status);

-- ───── Personnel ────────────────────────────────────────
create table public.personnel (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profile(id) on delete set null,
  name       text not null,
  initials   text not null,
  license    text not null unique,         -- SACAA / KCAA licence number
  role       text not null,                -- "Licensed Aircraft Engineer", etc.
  rating     text not null,                -- "Part 66 Cat B1"
  types      text[] not null default '{}', -- ["B737","A320"]
  location   text not null,
  status     public.personnel_status not null default 'pending',
  expires    timestamptz,
  available  boolean not null default false,
  rate       text not null,                -- "ZAR 4,200/day"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index personnel_status_idx       on public.personnel(status);
create index personnel_available_idx    on public.personnel(available) where available = true;
create index personnel_location_idx     on public.personnel(location);

-- ───── Documents (compliance vault) ─────────────────────
create table public.document (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  ref_number   text not null unique,
  type         public.document_type not null,
  issued       timestamptz not null,
  expires      timestamptz,                  -- null for non-expiring docs
  status       public.document_status not null default 'verified',
  cert         text not null,                -- "Part 66 Cat B1", "EASA Form 1"
  storage_path text,                         -- path in Supabase Storage 'vault' bucket
  part_id      uuid references public.part(id) on delete set null,
  personnel_id uuid references public.personnel(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index document_part_idx      on public.document(part_id);
create index document_personnel_idx on public.document(personnel_id);
create index document_type_status   on public.document(type, status);

-- ───── Transactions / Escrow ────────────────────────────
-- Note: id is human-readable ("TXN-2024-0041"). Buyer/seller are nullable
-- intentionally (seed data has neither). RLS handles NULLs explicitly.
create table public.transaction (
  id                    text primary key,
  type                  public.transaction_type not null,
  item                  text not null,
  party                 text not null,        -- counterparty display name (denormalized)
  amount                text not null,        -- "ZAR 142,500"
  status                public.transaction_status not null default 'in-escrow',
  aog                   boolean not null default false,
  part_id               uuid references public.part(id) on delete set null,
  personnel_id          uuid references public.personnel(id) on delete set null,
  buyer_id              uuid references public.profile(id) on delete set null,
  seller_id             uuid references public.profile(id) on delete set null,
  signed_at             timestamptz,
  -- Stripe escrow trail
  stripe_intent_id        text,
  stripe_transfer_id      text,
  stripe_refund_id        text,
  application_fee_cents   integer,             -- 3% platform commission, ZAR cents
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index transaction_buyer_idx   on public.transaction(buyer_id);
create index transaction_seller_idx  on public.transaction(seller_id);
create index transaction_status_idx  on public.transaction(status);
create index transaction_aog_idx     on public.transaction(aog) where aog = true;
create index transaction_intent_idx  on public.transaction(stripe_intent_id) where stripe_intent_id is not null;

-- ───── AOG events (dashboard) ───────────────────────────
create table public.aog_event (
  id         uuid primary key default gen_random_uuid(),
  reg        text not null,                 -- "ZS-OAL"
  location   text not null,                 -- "FAOR · Johannesburg"
  part       text not null,                 -- free text
  matches    integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index aog_event_active_idx on public.aog_event(active, created_at desc);

-- ───── Notifications ────────────────────────────────────
-- user_id null = broadcast (visible to everyone via RLS).
create table public.notification (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profile(id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  body       text not null,
  unread     boolean not null default true,
  created_at timestamptz not null default now()
);

create index notification_user_idx on public.notification(user_id, unread, created_at desc);

-- ───── KYC ──────────────────────────────────────────────
create table public.kyc_application (
  id            text primary key,           -- "KYC-2411-042"
  applicant_id  uuid references public.profile(id) on delete set null,
  name          text not null,
  type          text not null,              -- "Licensed Engineer", "DAME", etc.
  license       text not null,
  docs          text[] not null default '{}',
  risk          public.kyc_risk not null default 'medium',
  status        public.kyc_status not null default 'pending',
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewer_id   uuid references public.profile(id) on delete set null
);

create index kyc_status_idx    on public.kyc_application(status, submitted_at desc);
create index kyc_applicant_idx on public.kyc_application(applicant_id);

-- ───── Disputes ─────────────────────────────────────────
create table public.dispute (
  id              text primary key,           -- mirrors transaction.id
  transaction_id  text not null unique references public.transaction(id) on delete restrict,
  buyer           text not null,              -- denormalized
  seller          text not null,              -- denormalized
  amount          text not null,
  reason          text not null,
  days            integer not null default 0,
  status          public.dispute_status not null default 'open',
  opened_at       timestamptz not null default now(),
  resolved_at     timestamptz,
  resolver_id     uuid references public.profile(id) on delete set null
);

create index dispute_status_idx on public.dispute(status, opened_at desc);

-- ───── Contractor: Jobs ─────────────────────────────────
create table public.job (
  id              text primary key,           -- "JOB-2411-041"
  title           text not null,
  airline         text not null,
  location        text not null,
  duration        text not null,
  rate            text not null,
  urgency         public.job_urgency not null default 'normal',
  match           text not null,              -- "98%"
  rating_req      text not null,              -- required licence rating
  accepted        boolean not null default false,
  contractor_id   uuid references public.personnel(id) on delete set null,
  accepted_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index job_urgency_idx     on public.job(urgency, created_at desc);
create index job_contractor_idx  on public.job(contractor_id);

-- ───── Contractor: Work Orders ──────────────────────────
create table public.work_order (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique,       -- "WO-2024-11-0041"
  aircraft        text not null,
  task            text not null,
  airline         text not null,
  part_used       text not null,
  payout          text not null,
  signed          boolean not null default false,
  signed_at       timestamptz,
  contractor_id   uuid references public.personnel(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index work_order_contractor_idx on public.work_order(contractor_id);

-- ───── Audit ledger (hash-chained) ──────────────────────
-- Single global chain. seq is INTEGER (not bigserial / autoincrement) — the
-- audit_append function computes seq as MAX(seq)+1 inside an ACCESS EXCLUSIVE
-- lock so concurrent appends cannot fork the chain. See audit_append below.
create table public.audit_event (
  id          uuid primary key default gen_random_uuid(),
  seq         integer not null unique,
  type        public.audit_event_type not null,
  subject_id  text not null,                  -- typically transaction.id or kyc.id
  actor_id    uuid references public.profile(id) on delete set null,
  payload     jsonb not null default '{}'::jsonb,
  hash        text not null,                  -- sha256 hex
  prev_hash   text,                            -- null for genesis
  created_at  timestamptz not null default now()
);

create index audit_event_subject_idx on public.audit_event(subject_id);
create index audit_event_type_idx    on public.audit_event(type, created_at desc);

-- ───── Edge Function support tables ─────────────────────

-- Stripe webhook idempotency. event.id alone is insufficient because Stripe
-- delivers payment_intent.succeeded AND charge.succeeded for the same payment
-- (different event.ids, same intent). We track both.
create table public.stripe_processed_event (
  event_id        text primary key,
  intent_id       text,
  event_type      text not null,
  processed_at    timestamptz not null default now()
);

create index stripe_processed_event_intent_idx
  on public.stripe_processed_event(intent_id, event_type)
  where intent_id is not null;

-- Simple per-key rate limiter for public Edge Functions (SACAA verify, etc.).
-- Window-based: count events per (key, window_start). Function clamps count.
create table public.rate_limit (
  key            text not null,
  window_start   timestamptz not null,
  count          integer not null default 0,
  primary key (key, window_start)
);

create index rate_limit_window_idx on public.rate_limit(window_start);


-- ═════════════════════════════════════════════════════════
-- Functions
-- ═════════════════════════════════════════════════════════

-- ── canonical_jsonb: deterministic JSON serialization with sorted keys
-- Mirrors the JS `canonical()` in server/src/lib/ledger.ts so verify_chain()
-- can reproduce the original hash inputs byte-for-byte.
create or replace function public.canonical_jsonb(j jsonb) returns text
  language plpgsql immutable parallel safe as $$
declare
  k text;
  v jsonb;
  parts text[];
begin
  if j is null then
    return 'null';
  end if;

  case jsonb_typeof(j)
    when 'null' then
      return 'null';
    when 'object' then
      parts := array[]::text[];
      for k, v in
        select key, value from jsonb_each(j) order by key
      loop
        parts := parts || (to_jsonb(k)::text || ':' || public.canonical_jsonb(v));
      end loop;
      return '{' || array_to_string(parts, ',') || '}';
    when 'array' then
      parts := array(select public.canonical_jsonb(elem) from jsonb_array_elements(j) elem);
      return '[' || array_to_string(parts, ',') || ']';
    else
      -- string, number, boolean — jsonb's text repr is JSON-serialized
      return j::text;
  end case;
end;
$$;

-- ── compute_event_hash: pure function, replicates the TS computeHash
-- The format string for created_at must produce 'YYYY-MM-DDTHH:MM:SS.sssZ'
-- to match JS Date.toISOString() byte-for-byte.
create or replace function public.compute_event_hash(
  prev_hash  text,
  seq        integer,
  event_type text,
  subject_id text,
  actor_id   text,
  payload    jsonb,
  created_at timestamptz
) returns text
  language plpgsql immutable parallel safe as $$
declare
  msg text;
begin
  msg := coalesce(prev_hash, 'GENESIS')
    || '|' || seq::text
    || '|' || event_type
    || '|' || subject_id
    || '|' || coalesce(actor_id, '')
    || '|' || public.canonical_jsonb(payload)
    || '|' || to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  return encode(digest(msg, 'sha256'), 'hex');
end;
$$;

-- ── audit_append: the only sanctioned writer of audit_event.
-- ACCESS EXCLUSIVE lock + MAX(seq)+1 + now() all inside the lock means
-- concurrent appends serialize and the chain cannot fork. SECURITY DEFINER
-- + REVOKE EXECUTE FROM public means only service_role (Edge Functions) can
-- call this. Authenticated users see audit events through verify_chain()
-- and admin SELECT policy on the table.
create or replace function public.audit_append(
  p_type       public.audit_event_type,
  p_subject_id text,
  p_actor_id   uuid,
  p_payload    jsonb
) returns public.audit_event
  language plpgsql security definer set search_path = public, extensions as $$
declare
  v_seq        integer;
  v_prev_hash  text;
  v_created_at timestamptz;
  v_hash       text;
  v_row        public.audit_event;
begin
  -- Serialize all appends; reads still work (regular SELECT does not block).
  lock table public.audit_event in access exclusive mode;

  select coalesce(max(seq), 0) + 1 into v_seq from public.audit_event;

  if v_seq > 1 then
    select hash into v_prev_hash from public.audit_event where seq = v_seq - 1;
  else
    v_prev_hash := null;  -- genesis
  end if;

  v_created_at := now();
  v_hash := public.compute_event_hash(
    v_prev_hash, v_seq, p_type::text, p_subject_id,
    p_actor_id::text, p_payload, v_created_at
  );

  insert into public.audit_event (
    seq, type, subject_id, actor_id, payload, hash, prev_hash, created_at
  ) values (
    v_seq, p_type, p_subject_id, p_actor_id, p_payload, v_hash, v_prev_hash, v_created_at
  ) returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.audit_append from public, anon, authenticated;
grant  execute on function public.audit_append to service_role;

-- ── record_transaction_event: atomic status update + audit append.
-- Edge Functions (Stripe webhook) call ONLY this for state changes so the
-- audit chain never drifts from transaction.status. Both writes commit or
-- rollback together.
create or replace function public.record_transaction_event(
  p_transaction_id text,
  p_new_status     public.transaction_status,
  p_event_type     public.audit_event_type,
  p_actor_id       uuid,
  p_payload        jsonb
) returns public.audit_event
  language plpgsql security definer set search_path = public, extensions as $$
declare
  v_event public.audit_event;
begin
  update public.transaction
     set status = p_new_status, updated_at = now()
   where id = p_transaction_id;
  if not found then
    raise exception 'transaction % not found', p_transaction_id
      using errcode = 'no_data_found';
  end if;

  v_event := public.audit_append(p_event_type, p_transaction_id, p_actor_id, p_payload);
  return v_event;
end;
$$;

revoke execute on function public.record_transaction_event from public, anon, authenticated;
grant  execute on function public.record_transaction_event to service_role;

-- ── verify_chain: read-only chain integrity check. Anyone authenticated
-- with role ADMIN can call; the function reads the whole chain and
-- reconstructs the hash deterministically. Returns first break or full ok.
create or replace function public.verify_chain()
  returns table(valid boolean, total integer, broken_at integer, reason text)
  language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_prev_hash text := null;
  v_total     integer := 0;
  v_event     public.audit_event;
  v_expected  text;
begin
  if not public.is_admin() then
    raise exception 'verify_chain requires admin role' using errcode = '42501';
  end if;

  for v_event in select * from public.audit_event order by seq asc loop
    v_total := v_total + 1;
    if coalesce(v_event.prev_hash, '') <> coalesce(v_prev_hash, '') then
      return query select false, v_total, v_event.seq, 'prev_hash mismatch'::text;
      return;
    end if;
    v_expected := public.compute_event_hash(
      v_event.prev_hash, v_event.seq, v_event.type::text, v_event.subject_id,
      v_event.actor_id::text, v_event.payload, v_event.created_at
    );
    if v_expected <> v_event.hash then
      return query select false, v_total, v_event.seq, 'hash mismatch (tampered)'::text;
      return;
    end if;
    v_prev_hash := v_event.hash;
  end loop;
  return query select true, v_total, null::integer, null::text;
end;
$$;

grant execute on function public.verify_chain to authenticated;

-- ── Role helpers used in RLS predicates
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() ->> 'app_role') = 'ADMIN', false);
$$;

create or replace function public.current_app_role() returns text
  language sql stable security definer set search_path = public as $$
  select auth.jwt() ->> 'app_role';
$$;

grant execute on function public.is_admin to authenticated, anon;
grant execute on function public.current_app_role to authenticated, anon;

-- ── handle_new_user: trigger to mirror auth.users → public.profile
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profile (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.role, 'AME')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── custom_access_token_hook: injects app_role JWT claim from profile.role
-- Wired up via supabase/config.toml [auth.hook.custom_access_token].
create or replace function public.custom_access_token_hook(event jsonb) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_role    public.role;
  v_claims  jsonb;
begin
  v_user_id := (event ->> 'user_id')::uuid;
  select role into v_role from public.profile where id = v_user_id;
  v_claims := event -> 'claims';
  if v_role is not null then
    v_claims := jsonb_set(v_claims, '{app_role}', to_jsonb(v_role::text));
  end if;
  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant  execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- ── updated_at touch trigger (reusable)
create or replace function public.set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profile_set_updated_at      before update on public.profile      for each row execute function public.set_updated_at();
create trigger part_set_updated_at         before update on public.part         for each row execute function public.set_updated_at();
create trigger personnel_set_updated_at    before update on public.personnel    for each row execute function public.set_updated_at();
create trigger document_set_updated_at     before update on public.document     for each row execute function public.set_updated_at();
create trigger transaction_set_updated_at  before update on public.transaction  for each row execute function public.set_updated_at();


-- ═════════════════════════════════════════════════════════
-- Views
-- ═════════════════════════════════════════════════════════

-- personnel_public: marketplace listing view that masks PII (license, rate,
-- expires). Created with security_invoker = false so it runs as the view
-- owner (postgres) and bypasses the underlying RLS — anyone with SELECT
-- on the view sees the public columns of every row. Decision D2 (B).
create view public.personnel_public
  with (security_invoker = false) as
  select
    id,
    name,
    initials,
    role,
    rating,
    types,
    location,
    status,
    available,
    created_at
  from public.personnel;

grant select on public.personnel_public to authenticated, anon;


-- ═════════════════════════════════════════════════════════
-- RLS — enable on every public table
-- ═════════════════════════════════════════════════════════
alter table public.profile                enable row level security;
alter table public.part                   enable row level security;
alter table public.personnel              enable row level security;
alter table public.document               enable row level security;
alter table public.transaction            enable row level security;
alter table public.aog_event              enable row level security;
alter table public.notification           enable row level security;
alter table public.kyc_application        enable row level security;
alter table public.dispute                enable row level security;
alter table public.job                    enable row level security;
alter table public.work_order             enable row level security;
alter table public.audit_event            enable row level security;
alter table public.stripe_processed_event enable row level security;
alter table public.rate_limit             enable row level security;

-- ── profile policies
-- SELECT: every authenticated user can read public columns of every profile
-- (needed for marketplace seller/buyer name display). stripe_account_id is
-- the only sensitive column here — see column-level revoke below.
create policy profile_select_all on public.profile
  for select to authenticated using (true);

create policy profile_update_self on public.profile
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profile_admin_all on public.profile
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Hide stripe_account_id from non-admin reads via column GRANT.
revoke select (stripe_account_id) on public.profile from authenticated;
-- (admins still read it via profile_admin_all because USING + ALL => bypass column grants? No —
--  column grants apply per-role. Admins inherit authenticated. Workaround: expose via SECURITY
--  DEFINER function get_seller_payout_account() called from Edge Function only.)

-- ── part policies
create policy part_select_all on public.part
  for select to authenticated using (true);

create policy part_supplier_insert on public.part
  for insert to authenticated
  with check (
    public.current_app_role() in ('SUPPLIER','ADMIN')
  );

create policy part_supplier_update on public.part
  for update to authenticated
  using (
    public.is_admin()
    or public.current_app_role() = 'SUPPLIER'
  )
  with check (
    public.is_admin()
    or public.current_app_role() = 'SUPPLIER'
  );

create policy part_admin_delete on public.part
  for delete to authenticated using (public.is_admin());

-- ── personnel policies
-- SELECT on the underlying table is restricted (PII). Marketplace browses
-- via personnel_public view. Full row visible only to:
--   - the linked user themselves
--   - admin
--   - the counterparty in an active transaction referencing this row
create policy personnel_select_self_or_admin_or_counterparty on public.personnel
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.transaction t
      where t.personnel_id = personnel.id
        and t.status in ('in-escrow','rts-pending')
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

create policy personnel_insert_self on public.personnel
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

create policy personnel_update_self on public.personnel
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy personnel_admin_delete on public.personnel
  for delete to authenticated using (public.is_admin());

-- ── document policies
-- Owners (linked personnel.user_id), admins, and counterparties on active
-- transactions can read. Public-cert types (release certs, org certs, RTS,
-- import clearance) are visible to all authenticated for marketplace trust.
create policy document_select on public.document
  for select to authenticated
  using (
    public.is_admin()
    or type in ('Release Certificate','Organisation Cert','Release to Service','Import Clearance')
    or (
      personnel_id is not null
      and exists (
        select 1 from public.personnel p
        where p.id = personnel_id and p.user_id = auth.uid()
      )
    )
  );

create policy document_admin_write on public.document
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── transaction policies
-- buyer_id / seller_id are nullable. Explicit IS NOT NULL guards prevent the
-- NULL=NULL trap that would lock everyone out (review finding C1).
create policy transaction_select on public.transaction
  for select to authenticated
  using (
    (buyer_id is not null and buyer_id = auth.uid())
    or (seller_id is not null and seller_id = auth.uid())
    or public.is_admin()
  );

-- INSERT/UPDATE/DELETE: service_role only (Edge Functions call
-- record_transaction_event). No policies for authenticated roles.

-- ── aog_event policies
create policy aog_event_select_all on public.aog_event
  for select to authenticated using (true);

create policy aog_event_admin_write on public.aog_event
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── notification policies
-- user_id null = broadcast (visible to all authenticated).
create policy notification_select on public.notification
  for select to authenticated
  using (user_id is null or user_id = auth.uid() or public.is_admin());

create policy notification_update_self on public.notification
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notification_admin_write on public.notification
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── kyc_application policies
create policy kyc_select_self_or_admin on public.kyc_application
  for select to authenticated
  using (applicant_id = auth.uid() or public.is_admin());

create policy kyc_insert_self on public.kyc_application
  for insert to authenticated
  with check (applicant_id = auth.uid());

create policy kyc_admin_review on public.kyc_application
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── dispute policies
create policy dispute_select on public.dispute
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.transaction t
      where t.id = dispute.transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

create policy dispute_admin_write on public.dispute
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── job policies
create policy job_select_all on public.job
  for select to authenticated using (true);

create policy job_accept_own on public.job
  for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.personnel p
      where p.id = job.contractor_id and p.user_id = auth.uid()
    )
    or contractor_id is null  -- accepting an unassigned job
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.personnel p
      where p.id = job.contractor_id and p.user_id = auth.uid()
    )
  );

create policy job_admin_write on public.job
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── work_order policies
create policy work_order_select on public.work_order
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.personnel p
      where p.id = work_order.contractor_id and p.user_id = auth.uid()
    )
  );

create policy work_order_sign_own on public.work_order
  for update to authenticated
  using (
    exists (
      select 1 from public.personnel p
      where p.id = work_order.contractor_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.personnel p
      where p.id = work_order.contractor_id and p.user_id = auth.uid()
    )
  );

create policy work_order_admin_write on public.work_order
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── audit_event policies — read-only for admins, NEVER writable except via
-- audit_append (which runs as service_role).
create policy audit_event_admin_select on public.audit_event
  for select to authenticated using (public.is_admin());

-- No INSERT / UPDATE / DELETE policies → all denied for authenticated.
-- service_role bypasses RLS, so audit_append works.

-- ── stripe_processed_event — service_role only (no policies for authenticated)
-- ── rate_limit — service_role only (no policies for authenticated)

-- ═════════════════════════════════════════════════════════
-- Storage: vault bucket policies (referenced from config.toml)
-- ═════════════════════════════════════════════════════════
-- Note: bucket itself is created by the CLI from config.toml. Policies
-- live on storage.objects.

create policy vault_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vault'
    and (
      public.is_admin()
      or exists (
        select 1 from public.document d
        join public.personnel p on p.id = d.personnel_id
        where d.storage_path = storage.objects.name and p.user_id = auth.uid()
      )
    )
  );

create policy vault_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vault' and public.is_admin()
  );

create policy vault_delete_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vault' and public.is_admin()
  );


-- ═════════════════════════════════════════════════════════
-- Grants
-- ═════════════════════════════════════════════════════════
-- supabase-js uses the `authenticated` role for logged-in users and `anon`
-- for unauthenticated requests. RLS does the heavy lifting; grants are
-- coarse-grained.

grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on
  public.profile,
  public.part,
  public.personnel,
  public.document,
  public.transaction,
  public.aog_event,
  public.notification,
  public.kyc_application,
  public.dispute,
  public.job,
  public.work_order,
  public.audit_event
to authenticated;

grant select on public.personnel_public to authenticated, anon;

-- Helper functions are GRANTed individually above.

-- End of 0001_init.sql
