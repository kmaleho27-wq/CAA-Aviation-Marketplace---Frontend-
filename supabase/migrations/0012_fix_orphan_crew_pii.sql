-- Naluka — fix orphan crew PII leak surfaced by /autoplan eng review.
--
-- Bug: when an operator's profile is deleted, personnel rows where
-- created_by_operator pointed to that operator transitioned to
-- created_by_operator=null AND user_id=null (operator-created rows
-- always have user_id null). Under the existing RLS policies these
-- rows became invisible to non-admins for SELECT/UPDATE/DELETE — but
-- continued to appear in personnel_public (security_invoker=false)
-- to every authenticated user. Result: orphan PII rows nobody owns,
-- visible to everyone via the marketplace.
--
-- Fix: handle orphans on operator deletion via a BEFORE DELETE trigger
-- that marks affected crew rows as 'expired' and pulls them out of
-- personnel_public via the active filter. Includes an admin RPC to
-- re-assign or delete the orphan rows on demand.
--
-- See plan doc — autoplan eng review F3. Ships independent of any tier.

-- ── Trigger: when an operator profile is deleted, tombstone their crew
create or replace function public.tombstone_orphan_crew_on_operator_delete()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Only act on operator-created crew (user_id is null) — self-signed
  -- crew rows just lose their created_by_operator reference (the
  -- existing on-delete-set-null does the right thing for those).
  update public.personnel
     set status     = 'expired',
         available  = false,
         updated_at = now()
   where created_by_operator = old.id
     and user_id is null
     and status <> 'expired';

  return old;
end;
$$;

drop trigger if exists profile_before_delete_tombstone_crew on public.profile;
create trigger profile_before_delete_tombstone_crew
  before delete on public.profile
  for each row execute function public.tombstone_orphan_crew_on_operator_delete();

-- ── Recreate personnel_public to filter expired rows ─────────────
-- Existing seed personnel use status='expired' for legitimately
-- expired licences — those operators saw them in the marketplace
-- regardless. With this change, both legitimately-expired AND
-- tombstoned-orphan rows drop out of the public view, which is the
-- right behaviour for a "browse available crew" surface.
drop view if exists public.personnel_public;

create view public.personnel_public
  with (security_invoker = false) as
  select
    id, name, initials, role, rating, types,
    discipline, sacaa_part, licence_subtype, aircraft_category,
    medical_class, endorsements, non_licensed_role,
    location, status, available,
    created_by_operator, created_at
  from public.personnel
  where status <> 'expired';

grant select on public.personnel_public to authenticated, anon;

-- ── Admin RPC: re-assign orphan crew to a new operator ───────────
-- Used when an admin deletes an operator profile and wants to keep
-- their crew rows alive under a different operator (e.g. acquisition).
-- Tombstoning happens automatically via the trigger above, so this
-- RPC is for the rare reactivation path.
create or replace function public.reassign_orphan_crew(
  p_old_operator_id uuid,
  p_new_operator_id uuid
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  if not exists (select 1 from public.profile where id = p_new_operator_id) then
    raise exception 'new operator not found: %', p_new_operator_id;
  end if;

  update public.personnel
     set created_by_operator = p_new_operator_id,
         status              = 'pending',  -- re-enter verification
         available           = false,
         updated_at          = now()
   where created_by_operator = p_old_operator_id
     and user_id is null;

  get diagnostics v_count = row_count;
  return jsonb_build_object('reassigned', v_count, 'new_operator', p_new_operator_id);
end;
$$;

grant execute on function public.reassign_orphan_crew(uuid, uuid) to authenticated;

-- ── Admin RPC: hard-delete tombstoned orphan crew (POPI compliance)
-- After the standard retention window (handled by app logic), admin
-- can purge tombstoned rows. Kept separate from the trigger so the
-- tombstone is reversible (via reassign_orphan_crew) until purged.
create or replace function public.purge_tombstoned_orphans(p_older_than interval default interval '90 days')
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  delete from public.personnel
   where status = 'expired'
     and created_by_operator is null     -- tombstoned by the trigger
     and user_id is null
     and updated_at < now() - p_older_than;

  get diagnostics v_count = row_count;
  return jsonb_build_object('purged', v_count, 'older_than', p_older_than::text);
end;
$$;

grant execute on function public.purge_tombstoned_orphans(interval) to authenticated;
