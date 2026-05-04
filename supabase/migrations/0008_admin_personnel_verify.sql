-- Naluka — admin approve/reject for pending personnel rows.
--
-- Self-signups from migration 0007 create a personnel row with
-- status='pending' directly (not via the kyc_application table). The
-- existing approve_kyc / reject_kyc RPCs don't apply. These two new
-- RPCs let an admin flip status → verified|expired and append the
-- transition to the audit chain.
--
-- See plan doc §20 (P1 #4). Approved by user 2026-05-04.

-- ── approve_personnel ────────────────────────────────────────────
create or replace function public.approve_personnel(p_id uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_row public.personnel;
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  update public.personnel
     set status     = 'verified',
         available  = true,            -- newly verified pros are bookable
         updated_at = now()
   where id = p_id
     and status = 'pending'
   returning * into v_row;

  if v_row.id is null then
    raise exception 'personnel not found or not pending: %', p_id;
  end if;

  -- Append to the hash-chained audit ledger so admin actions are
  -- tamper-evident alongside RTS / dispute / KYC events.
  perform public.record_audit_event(
    'kyc.approved',
    jsonb_build_object(
      'personnel_id', v_row.id,
      'discipline',   v_row.discipline,
      'name',         v_row.name,
      'license',      v_row.license
    )
  );

  return jsonb_build_object('id', v_row.id, 'status', v_row.status);
end;
$$;

grant execute on function public.approve_personnel(uuid) to authenticated;

-- ── reject_personnel ─────────────────────────────────────────────
-- Sets status='expired' as a soft tombstone. We keep the row so the
-- user can re-submit corrected info later; using a dedicated 'rejected'
-- status enum value would require a personnel_status migration that
-- isn't worth the churn for this slice.
create or replace function public.reject_personnel(p_id uuid, p_reason text default null)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_row public.personnel;
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  update public.personnel
     set status     = 'expired',
         available  = false,
         updated_at = now()
   where id = p_id
     and status = 'pending'
   returning * into v_row;

  if v_row.id is null then
    raise exception 'personnel not found or not pending: %', p_id;
  end if;

  perform public.record_audit_event(
    'kyc.rejected',
    jsonb_build_object(
      'personnel_id', v_row.id,
      'discipline',   v_row.discipline,
      'name',         v_row.name,
      'reason',       coalesce(p_reason, '')
    )
  );

  return jsonb_build_object('id', v_row.id, 'status', v_row.status);
end;
$$;

grant execute on function public.reject_personnel(uuid, text) to authenticated;

-- Admin SELECT on personnel is already allowed by the existing
-- personnel_select_self_or_admin_or_counterparty policy (0001_init.sql),
-- so no new RLS rule is needed for the listPendingPersonnel query.
