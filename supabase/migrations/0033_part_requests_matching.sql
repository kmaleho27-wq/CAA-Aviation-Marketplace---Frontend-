-- Naluka — buyer-driven RFQs, broker-side matching, confidentiality.
--
-- The model:
--   1. Buyer creates a part_request ("I need 9514M54G05, qty 2")
--   2. Trigger auto-suggests matches from any brokered inventory
--      whose pn or name fuzzy-matches the request
--   3. Broker reviews matches in /app/matchmaking, sets a markup
--      per match, sends quote(s) back to the buyer
--   4. Buyer sees one or more quotes (total price + broker name only —
--      NEVER the supplier identity or base price)
--   5. Buyer accepts a quote → status flows to 'accepted'
--
-- Confidentiality (enforced at the RLS/view layer):
--   - Buyer sees: their own requests, broker quotes (final price only)
--   - Supplier sees: their inventory, broker PO once accepted (base
--     price only, NEVER buyer identity) — supplier-side view deferred
--   - Broker sees: everything they're party to
--   - Anyone else sees: nothing

-- ─────────────────────────────────────────────────────────────────
-- part_request — buyer's RFQ
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.part_request (
  id              uuid primary key default gen_random_uuid(),
  buyer_id        uuid not null references public.profile(id) on delete cascade,
  part_number     text not null,
  description     text,
  quantity        int  not null default 1 check (quantity > 0),
  condition_min   text default 'Serviceable' check (condition_min in ('New', 'Overhauled', 'Serviceable', 'As-removed')),
  max_price_zar   bigint check (max_price_zar is null or max_price_zar > 0),
  urgency         text not null default 'standard' check (urgency in ('aog', 'urgent', 'standard')),
  notes           text,
  status          text not null default 'open' check (status in (
    'open',         -- broker hasn't quoted yet
    'quoted',       -- at least one quote sent
    'accepted',     -- buyer accepted one of the quotes
    'fulfilled',    -- supplier confirmed shipment
    'expired',
    'cancelled'
  )),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists part_request_buyer_idx     on public.part_request(buyer_id, status);
create index if not exists part_request_status_idx    on public.part_request(status, created_at desc);
create index if not exists part_request_partnumber_idx on public.part_request(lower(part_number));

create trigger part_request_set_updated_at
  before update on public.part_request
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- broker_match — broker's pairing of a request to inventory
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.broker_match (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null references public.part_request(id) on delete cascade,
  part_id            uuid not null references public.part(id) on delete cascade,
  broker_id          uuid not null references public.profile(id) on delete restrict,
  -- Snapshot locked at match creation — supplier could change price
  -- later but the quote stays at the price the broker offered.
  base_price_cents   bigint not null check (base_price_cents >= 0),
  markup_pct         numeric(5,2) not null default 50
    check (markup_pct >= 20 and markup_pct <= 200),
  -- Computed convenience: what the buyer would see
  total_price_cents  bigint generated always as (
    round(base_price_cents * (1 + markup_pct / 100.0))
  ) stored,
  status             text not null default 'auto_suggested' check (status in (
    'auto_suggested',  -- trigger created, broker hasn't looked
    'broker_reviewed', -- broker confirmed they want to quote
    'quoted',          -- quote sent to buyer
    'accepted',        -- buyer accepted this specific quote
    'declined',        -- buyer declined OR broker withdrew
    'expired'
  )),
  notes              text,
  quoted_at          timestamptz,
  accepted_at        timestamptz,
  created_at         timestamptz not null default now(),
  unique (request_id, part_id)
);

create index if not exists broker_match_request_idx on public.broker_match(request_id, status);
create index if not exists broker_match_broker_idx  on public.broker_match(broker_id, status);

-- ─────────────────────────────────────────────────────────────────
-- RLS: part_request
-- ─────────────────────────────────────────────────────────────────
alter table public.part_request enable row level security;

-- Buyer sees their own requests
create policy part_request_buyer_select on public.part_request
  for select to authenticated
  using (buyer_id = auth.uid());

-- Brokers (currently = ADMIN role) see ALL open requests for matchmaking
create policy part_request_broker_select on public.part_request
  for select to authenticated
  using (public.is_admin());

-- Buyer creates their own requests
create policy part_request_buyer_insert on public.part_request
  for insert to authenticated
  with check (buyer_id = auth.uid());

-- Buyer can cancel / update their own; broker can update status
create policy part_request_buyer_update on public.part_request
  for update to authenticated
  using (buyer_id = auth.uid())
  with check (buyer_id = auth.uid());

create policy part_request_broker_update on public.part_request
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.part_request to authenticated;

-- ─────────────────────────────────────────────────────────────────
-- RLS: broker_match — most sensitive table, locked tight
-- ─────────────────────────────────────────────────────────────────
alter table public.broker_match enable row level security;

-- Only the broker sees raw match rows (with base price + supplier info)
create policy broker_match_broker_all on public.broker_match
  for all to authenticated
  using (broker_id = auth.uid() or public.is_admin())
  with check (broker_id = auth.uid() or public.is_admin());

grant select, insert, update on public.broker_match to authenticated;

-- ─────────────────────────────────────────────────────────────────
-- buyer_quote view — what the BUYER sees of broker_match
-- Filters out base_price, supplier identity, broker notes. Only
-- exposes total price + broker name + status. Status filter ensures
-- buyer never sees auto_suggested rows (broker hasn't committed yet).
-- ─────────────────────────────────────────────────────────────────
create or replace view public.buyer_quote as
  select
    bm.id               as match_id,
    bm.request_id,
    pr.buyer_id,
    bm.broker_id,
    bp.name             as broker_name,
    bm.total_price_cents,
    bm.markup_pct,        -- buyer sees the markup % (transparency, not the absolute base)
    bm.status,
    bm.quoted_at,
    bm.accepted_at
  from public.broker_match bm
  join public.part_request pr on pr.id = bm.request_id
  join public.profile bp on bp.id = bm.broker_id
  where bm.status in ('quoted', 'accepted', 'declined');

grant select on public.buyer_quote to authenticated;

-- ─────────────────────────────────────────────────────────────────
-- Auto-match trigger
-- On part_request insert: find every part where pn or name
-- substring-matches the request's part_number, attribute via
-- prospective_account.referrer_id, snapshot the base price.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.auto_match_part_request()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  v_search text := trim(new.part_number);
begin
  -- Strip currency prefix + commas from "ZAR 12,500" → 12500
  insert into public.broker_match (
    request_id, part_id, broker_id, base_price_cents, status
  )
  select
    new.id,
    p.id,
    pa.referrer_id,
    -- Parse base price from text. Strip non-digit chars first.
    coalesce(
      nullif(regexp_replace(coalesce(p.price, ''), '[^0-9]', '', 'g'), '')::bigint * 100,
      0
    ),
    'auto_suggested'
  from public.part p
  join public.prospective_account pa on pa.id = p.seller_prospect_id
  where v_search <> ''
    and (
      p.pn   ilike '%' || v_search || '%'
      or p.name ilike '%' || v_search || '%'
    )
    and pa.referrer_id is not null
  on conflict (request_id, part_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_auto_match_part_request on public.part_request;
create trigger trg_auto_match_part_request
  after insert on public.part_request
  for each row execute function public.auto_match_part_request();

-- ─────────────────────────────────────────────────────────────────
-- send_quote RPC — broker action to flip a match to 'quoted' and
-- bump the request's status. Also stamps timestamps. Returns the
-- updated match row.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.send_broker_quote(
  p_match_id uuid,
  p_markup_pct numeric default null
) returns public.broker_match
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_match public.broker_match;
begin
  -- Verify caller is the broker on this match
  select * into v_match from public.broker_match
   where id = p_match_id;
  if v_match.id is null then
    raise exception 'match % not found', p_match_id;
  end if;
  if v_match.broker_id <> auth.uid() and not public.is_admin() then
    raise exception 'only the assigned broker can send this quote';
  end if;

  update public.broker_match
     set markup_pct = coalesce(p_markup_pct, markup_pct),
         status     = 'quoted',
         quoted_at  = now()
   where id = p_match_id
   returning * into v_match;

  -- Bump request status to 'quoted' if still open
  update public.part_request
     set status = 'quoted'
   where id = v_match.request_id
     and status = 'open';

  return v_match;
end;
$$;

grant execute on function public.send_broker_quote(uuid, numeric)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────
-- accept_quote RPC — buyer action to accept a specific quote.
-- Declines all other quotes on the same request automatically.
-- ─────────────────────────────────────────────────────────────────
create or replace function public.accept_buyer_quote(
  p_match_id uuid
) returns public.broker_match
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_match public.broker_match;
  v_request public.part_request;
begin
  select * into v_match from public.broker_match where id = p_match_id;
  if v_match.id is null then
    raise exception 'match % not found', p_match_id;
  end if;
  if v_match.status <> 'quoted' then
    raise exception 'match is in status %, cannot be accepted', v_match.status;
  end if;

  select * into v_request from public.part_request where id = v_match.request_id;
  if v_request.buyer_id <> auth.uid() then
    raise exception 'only the requesting buyer can accept';
  end if;

  -- Accept this one
  update public.broker_match
     set status      = 'accepted',
         accepted_at = now()
   where id = p_match_id
   returning * into v_match;

  -- Decline siblings on same request
  update public.broker_match
     set status = 'declined'
   where request_id = v_match.request_id
     and id <> p_match_id
     and status = 'quoted';

  -- Bump request status
  update public.part_request
     set status = 'accepted'
   where id = v_match.request_id;

  return v_match;
end;
$$;

grant execute on function public.accept_buyer_quote(uuid)
  to authenticated;
