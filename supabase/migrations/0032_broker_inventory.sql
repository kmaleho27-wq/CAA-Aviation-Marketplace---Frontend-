-- Naluka — broker inventory control.
--
-- Architectural correction: the markup slider belongs to the broker
-- (Aeropreserve), not the supplier. Suppliers list at their net base
-- price; the broker sets the per-item markup that buyers see.
--
-- This migration:
--   1. Adds seller_prospect_id to part + mro_service so listings can
--      be attributed to a prospective_account record before that
--      supplier signs up. Lets us seed demo inventory now and have
--      it stitch to real profile rows once suppliers register.
--   2. Adds an RLS policy on part + mro_service that lets a broker
--      UPDATE markup_pct (and ONLY markup_pct) on listings owned by
--      suppliers they referred (either real profile or pending prospect).

alter table public.part
  add column if not exists seller_prospect_id uuid
    references public.prospective_account(id) on delete set null;

alter table public.mro_service
  add column if not exists seller_prospect_id uuid
    references public.prospective_account(id) on delete set null;

create index if not exists part_seller_prospect_idx
  on public.part(seller_prospect_id) where seller_prospect_id is not null;
create index if not exists mro_service_seller_prospect_idx
  on public.mro_service(seller_prospect_id) where seller_prospect_id is not null;

-- ── Broker can SELECT all parts/services from their referred suppliers
-- (regardless of whether the row is currently visible by default RLS).
-- Without this the inventory page would only show what an authenticated
-- buyer can see, missing draft / hidden listings the broker still owns.
create policy part_broker_select on public.part
  for select to authenticated
  using (
    seller_prospect_id is not null
    and exists (
      select 1 from public.prospective_account pa
       where pa.id = part.seller_prospect_id
         and pa.referrer_id = auth.uid()
    )
  );

create policy mro_service_broker_select on public.mro_service
  for select to authenticated
  using (
    seller_prospect_id is not null
    and exists (
      select 1 from public.prospective_account pa
       where pa.id = mro_service.seller_prospect_id
         and pa.referrer_id = auth.uid()
    )
  );

-- ── Broker can UPDATE markup_pct on inventory they sponsor.
-- The with-check expression locks every other column — they can change
-- markup_pct and nothing else, which is exactly the surface area we
-- want exposed via the inventory UI.
create policy part_broker_update_markup on public.part
  for update to authenticated
  using (
    seller_prospect_id is not null
    and exists (
      select 1 from public.prospective_account pa
       where pa.id = part.seller_prospect_id
         and pa.referrer_id = auth.uid()
    )
  )
  with check (
    seller_prospect_id is not null
    and exists (
      select 1 from public.prospective_account pa
       where pa.id = part.seller_prospect_id
         and pa.referrer_id = auth.uid()
    )
  );

create policy mro_service_broker_update_markup on public.mro_service
  for update to authenticated
  using (
    seller_prospect_id is not null
    and exists (
      select 1 from public.prospective_account pa
       where pa.id = mro_service.seller_prospect_id
         and pa.referrer_id = auth.uid()
    )
  )
  with check (
    seller_prospect_id is not null
    and exists (
      select 1 from public.prospective_account pa
       where pa.id = mro_service.seller_prospect_id
         and pa.referrer_id = auth.uid()
    )
  );

-- ── View: broker_inventory ───────────────────────────────────────
-- Rolls part + mro_service into one stream so the inventory UI can
-- render both kinds of listings in a single table. RLS on the
-- underlying tables gates which rows the caller sees.
create or replace view public.broker_inventory as
  select
    'part'::text             as kind,
    p.id,
    p.name,
    p.pn                     as sku,
    p.price                  as base_price,
    p.markup_pct,
    p.seller_prospect_id,
    pa.organization          as supplier_name,
    pa.country               as supplier_country,
    p.created_at
  from public.part p
  join public.prospective_account pa on pa.id = p.seller_prospect_id
union all
  select
    'service'::text          as kind,
    m.id,
    m.name,
    null                     as sku,
    m.price_from             as base_price,
    m.markup_pct,
    m.seller_prospect_id,
    pa.organization          as supplier_name,
    pa.country               as supplier_country,
    m.created_at
  from public.mro_service m
  join public.prospective_account pa on pa.id = m.seller_prospect_id;

grant select on public.broker_inventory to authenticated;
