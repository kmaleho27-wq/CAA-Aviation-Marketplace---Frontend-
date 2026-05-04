-- Naluka — operators add crew on behalf of their team.
--
-- An airline / operator types in their existing crew once (manually
-- or via bulk add later) instead of asking 200 pilots and engineers
-- each to self-register. The personnel row carries a back-reference
-- to the creating operator so they can manage "their" crew, and the
-- row sits at status='pending' awaiting admin verification just like
-- a self-signup.
--
-- See plan doc §20 (P2 #6). Approved by user 2026-05-04.

-- ── New back-reference column ────────────────────────────────────
alter table public.personnel
  add column if not exists created_by_operator uuid
    references public.profile(id) on delete set null;

create index if not exists personnel_created_by_operator_idx
  on public.personnel(created_by_operator)
  where created_by_operator is not null;

-- ── Replace the SELECT policy to include "operator sees own crew" ──
-- The original policy blocks an operator from reading their own
-- pending crew rows (they're not user_id, not admin, no live txn).
-- Drop and re-create with the new clause appended.
drop policy if exists personnel_select_self_or_admin_or_counterparty on public.personnel;

create policy personnel_select_self_admin_counterparty_or_operator on public.personnel
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or created_by_operator = auth.uid()
    or exists (
      select 1 from public.transaction t
      where t.personnel_id = personnel.id
        and t.status in ('in-escrow','rts-pending')
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

-- ── INSERT policy: existing personnel_insert_self also covers this ─
-- The existing rule allows insert when user_id = auth.uid(), but for
-- operator-created rows user_id is null. Loosen it to also permit
-- inserts where created_by_operator = auth.uid().
drop policy if exists personnel_insert_self on public.personnel;

create policy personnel_insert_self_or_operator on public.personnel
  for insert to authenticated
  with check (
    public.is_admin()
    or user_id = auth.uid()
    or (created_by_operator = auth.uid() and user_id is null)
  );

-- ── UPDATE policy: operator can edit their crew until verified ────
-- The existing rule lets self-or-admin update. Add operator-of-row.
-- Once admin verifies, we don't restrict — operators may still want
-- to set rate / availability for their own crew post-verification.
drop policy if exists personnel_update_self on public.personnel;

create policy personnel_update_self_or_operator on public.personnel
  for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or created_by_operator = auth.uid()
  )
  with check (
    user_id = auth.uid()
    or public.is_admin()
    or created_by_operator = auth.uid()
  );

-- ── Re-expose personnel_public with created_by_operator ─────────
-- The marketplace UI needs this column so the operator can filter to
-- "My crew". License / rate / expires remain masked per D2 (PII).
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
    created_by_operator,
    created_at
  from public.personnel;

grant select on public.personnel_public to authenticated, anon;
