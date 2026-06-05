-- Naluka — broker referral attribution + dynamic per-listing markup.
--
-- Context: Aeropreserve (a global aviation broker) is migrating his
-- Rolodex of airlines + suppliers onto Naluka. He steps out of every
-- deal; Naluka becomes the venue. In exchange:
--   - Suppliers list their parts/services at their base price
--   - Each listing carries a markup_pct (20–200%, dynamic per listing)
--   - Buyers see the marked-up price
--   - On a confirmed transaction, the markup is captured by the
--     platform and split 50/50 with the referrer who introduced the
--     supplier (typically Aeropreserve, but the model generalises)
--
-- This migration is the data backbone. UI to follow (listing forms get
-- a markup slider; supplier sees their net + buyer-facing price;
-- referral dashboard at /app/referrals).

-- ── Referrer attribution on profile ─────────────────────────────
-- referrer_id: who introduced this account to Naluka. NULL means
-- self-registered. Self-referential FK keeps it clean.
-- referrer_cut_pct: only meaningful when this profile IS a referrer.
-- Default 50 mirrors the Aeropreserve deal; other brokers could be
-- different without a schema change.
alter table public.profile
  add column if not exists referrer_id       uuid references public.profile(id) on delete set null,
  add column if not exists referrer_cut_pct  numeric(5,2) not null default 50.00
    check (referrer_cut_pct >= 0 and referrer_cut_pct <= 100);

create index if not exists profile_referrer_idx
  on public.profile(referrer_id)
  where referrer_id is not null;

-- ── Per-listing markup ──────────────────────────────────────────
-- Each part / mro_service carries its own markup_pct. Suppliers set
-- it when listing; admins can override; brokers see it in their
-- dashboard. Range 20–200 caps both ends of reasonable markup —
-- below 20 isn't worth the platform's effort, above 200 is gouging.
alter table public.part
  add column if not exists markup_pct numeric(5,2) not null default 50.00
    check (markup_pct >= 20 and markup_pct <= 200);

alter table public.mro_service
  add column if not exists markup_pct numeric(5,2) not null default 50.00
    check (markup_pct >= 20 and markup_pct <= 200);

-- ── Referral ledger ─────────────────────────────────────────────
-- One row per (transaction, referrer) pair. Each row records:
--   - the markup amount captured (= supplier_price * markup_pct/100)
--   - the referrer's cut (= markup_amount * referrer_cut_pct/100)
-- Status flows: pending → confirmed → paid. "pending" is created at
-- transaction-acceptance; "confirmed" when escrow releases; "paid"
-- when Naluka has actually paid the broker (out-of-band for MVP).
-- Postgres does not support IF NOT EXISTS on CREATE TYPE — guard with a DO block.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'referral_status') then
    create type public.referral_status as enum ('pending', 'confirmed', 'paid', 'voided');
  end if;
end$$;

create table if not exists public.referral_ledger (
  id                    uuid primary key default gen_random_uuid(),
  transaction_id        text references public.transaction(id) on delete set null,
  referrer_id           uuid not null references public.profile(id) on delete restrict,
  referred_supplier_id  uuid references public.profile(id) on delete set null,
  -- snapshot at deal time — schema changes later don't rewrite history
  base_amount_cents     bigint not null check (base_amount_cents >= 0),
  markup_pct            numeric(5,2) not null,
  markup_amount_cents   bigint not null check (markup_amount_cents >= 0),
  referrer_cut_pct      numeric(5,2) not null,
  referrer_cut_cents    bigint not null check (referrer_cut_cents >= 0),
  currency              text not null default 'ZAR',
  status                public.referral_status not null default 'pending',
  notes                 text,
  created_at            timestamptz not null default now(),
  confirmed_at          timestamptz,
  paid_at               timestamptz,
  unique (transaction_id, referrer_id)
);

create index if not exists referral_ledger_referrer_idx
  on public.referral_ledger(referrer_id, status);
create index if not exists referral_ledger_status_idx
  on public.referral_ledger(status)
  where status in ('pending', 'confirmed');

-- ── RLS ─────────────────────────────────────────────────────────
-- Brokers see only their own ledger rows. Admin sees all.
alter table public.referral_ledger enable row level security;

create policy referral_ledger_self_select on public.referral_ledger
  for select to authenticated
  using (referrer_id = auth.uid() or public.is_admin());

-- Inserts/updates only by SECURITY DEFINER RPCs (see helper below).
-- service_role bypasses RLS for cron / Edge Function flows.
grant select on public.referral_ledger to authenticated;
grant all on public.referral_ledger to service_role;

-- ── Helper: record_referral ─────────────────────────────────────
-- Called from transaction-acceptance flow once we know the deal is
-- happening. Idempotent on (transaction_id, referrer_id). Returns the
-- ledger row id.
create or replace function public.record_referral(
  p_transaction_id text,
  p_supplier_id    uuid,
  p_base_cents     bigint,
  p_markup_pct     numeric
) returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_supplier   public.profile;
  v_referrer   public.profile;
  v_markup_amt bigint;
  v_cut_amt    bigint;
  v_id         uuid;
begin
  select * into v_supplier from public.profile where id = p_supplier_id;
  if v_supplier.id is null or v_supplier.referrer_id is null then
    return null;  -- supplier wasn't referred; no ledger row needed
  end if;

  select * into v_referrer from public.profile where id = v_supplier.referrer_id;

  v_markup_amt := round(p_base_cents * (p_markup_pct / 100.0));
  v_cut_amt    := round(v_markup_amt * (v_referrer.referrer_cut_pct / 100.0));

  insert into public.referral_ledger (
    transaction_id, referrer_id, referred_supplier_id,
    base_amount_cents, markup_pct, markup_amount_cents,
    referrer_cut_pct, referrer_cut_cents, status
  ) values (
    p_transaction_id, v_referrer.id, v_supplier.id,
    p_base_cents, p_markup_pct, v_markup_amt,
    v_referrer.referrer_cut_pct, v_cut_amt, 'pending'
  )
  on conflict (transaction_id, referrer_id) do update
    set markup_amount_cents = excluded.markup_amount_cents,
        referrer_cut_cents  = excluded.referrer_cut_cents
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.record_referral(text, uuid, bigint, numeric)
  to authenticated, service_role;

-- ── Helper: confirm_referral ────────────────────────────────────
-- Called when the transaction's escrow releases (i.e. the deal is
-- truly done). Flips status pending → confirmed and stamps the time.
create or replace function public.confirm_referral(p_transaction_id text)
  returns int
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_count int;
begin
  update public.referral_ledger
     set status       = 'confirmed',
         confirmed_at = now()
   where transaction_id = p_transaction_id
     and status = 'pending';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.confirm_referral(text)
  to authenticated, service_role;

-- ── View: broker_referral_summary ───────────────────────────────
-- Rolls up a referrer's ledger into the headline numbers their
-- dashboard needs. RLS-gated by underlying table.
create or replace view public.broker_referral_summary as
select
  rl.referrer_id,
  count(*)                                              as total_deals,
  count(*) filter (where rl.status = 'pending')         as pending_deals,
  count(*) filter (where rl.status = 'confirmed')       as confirmed_deals,
  count(*) filter (where rl.status = 'paid')            as paid_deals,
  coalesce(sum(rl.markup_amount_cents) filter (where rl.status in ('confirmed','paid')), 0) as total_markup_cents,
  coalesce(sum(rl.referrer_cut_cents)  filter (where rl.status in ('confirmed','paid')), 0) as total_cut_confirmed_cents,
  coalesce(sum(rl.referrer_cut_cents)  filter (where rl.status = 'pending'), 0)              as pending_cut_cents,
  coalesce(sum(rl.referrer_cut_cents)  filter (where rl.status = 'paid'), 0)                  as paid_out_cents,
  coalesce(sum(rl.referrer_cut_cents)  filter (where rl.status = 'confirmed'), 0)             as owed_cents,
  max(rl.created_at)                                                                          as last_deal_at
from public.referral_ledger rl
group by rl.referrer_id;

grant select on public.broker_referral_summary to authenticated;
