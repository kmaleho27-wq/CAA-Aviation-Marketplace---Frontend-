-- Naluka — supplier-side purchase order view.
--
-- The third leg of the confidentiality triangle. When a broker quote
-- gets accepted by a buyer, the SUPPLIER needs to know:
--   - One of my parts has been ordered
--   - Which broker placed the order
--   - At what base price (what I receive)
--   - When it was accepted (for fulfillment SLA)
--
-- The SUPPLIER must NOT see:
--   - Buyer identity (preserves broker's middleman moat)
--   - Final retail price (preserves broker's markup confidentiality)
--   - Other matches/quotes on the same request
--
-- Implementation: a view that joins broker_match → part → prospective_
-- account → linked supplier profile. RLS filter is implicit in the
-- view's WHERE clause: only rows where the prospective_account's
-- linked_profile_id matches auth.uid() come through.
--
-- Prerequisite: the supplier has signed up and their email matches
-- a prospect we imported, so the auto-link trigger from migration
-- 0030 stamped linked_profile_id. Until then, the view returns
-- nothing for them.

create or replace view public.supplier_purchase_order as
  select
    bm.id                  as match_id,
    bm.request_id,
    bm.broker_id,
    bp.name                as broker_name,
    bm.part_id,
    p.name                 as part_name,
    p.pn                   as part_pn,
    p.condition            as part_condition,
    p.price                as my_listed_price,
    bm.base_price_cents    as agreed_price_cents,
    pr.quantity            as quantity,
    pr.condition_min       as required_condition,
    bm.accepted_at,
    bm.created_at          as matched_at,
    pa.id                  as supplier_prospect_id,
    pa.linked_profile_id   as supplier_profile_id
  from public.broker_match bm
  join public.part p              on p.id  = bm.part_id
  join public.prospective_account pa on pa.id = p.seller_prospect_id
  join public.profile bp          on bp.id = bm.broker_id
  join public.part_request pr     on pr.id = bm.request_id
  where bm.status in ('accepted', 'declined')
    -- Supplier sees their own POs OR admin sees all (admins can audit)
    and (pa.linked_profile_id = auth.uid() or public.is_admin());

grant select on public.supplier_purchase_order to authenticated;

-- ─────────────────────────────────────────────────────────────────
-- accept_buyer_quote did the cross-stitching. Worth a comment here
-- noting that this view is the SUPPLIER's contract with Naluka: the
-- moment a row appears with their supplier_profile_id, they owe the
-- broker a delivery at agreed_price_cents. Future iterations:
--   - mark_shipped(match_id) RPC — supplier flips status
--   - fulfillment_window column — SLA tracker
--   - 8130/CofC document upload requirement before mark-shipped
-- ─────────────────────────────────────────────────────────────────
