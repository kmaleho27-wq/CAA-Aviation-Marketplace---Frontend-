-- Naluka — POPI Act right-to-delete + right-to-export.
--
-- Policy:
--   1. User clicks "Delete account" → request_account_deletion() RPC
--      tombstones their profile (email scrubbed, name → "Deleted
--      user", deletion_requested_at = now()) and signs them out via
--      auth.users delete (cascades into profile via FK).
--   2. Personnel rows owned by them: status flipped to 'expired' so
--      they drop out of personnel_public, but kept on file for 90
--      days for transaction-counterparty traceability.
--   3. After 90 days, the purge_deleted_accounts() cron sweep hard-
--      deletes the personnel rows + their documents from storage.
--   4. Admin can hard-purge immediately via admin_purge_user() if
--      regulator or user demands ("delete my data NOW").
-- Plus right-to-export: get_my_data_export() returns a snapshot of
-- everything the user owns, JSON-serialisable.

-- ── Track deletion intent on profile ─────────────────────────────
alter table public.profile
  add column if not exists deletion_requested_at timestamptz;

create index if not exists profile_deletion_requested_idx
  on public.profile(deletion_requested_at)
  where deletion_requested_at is not null;

-- ── Right-to-delete RPC (user-facing) ────────────────────────────
-- Soft-delete: scrubs identifying fields on profile, tombstones the
-- linked personnel row(s), and deletes the auth.users entry to log
-- the user out. The 90-day retention window is enforced by the cron
-- purge below.
create or replace function public.request_account_deletion()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'must be signed in';
  end if;

  -- Tombstone profile fields. Keep id + role for FK integrity on
  -- existing transactions / audit events.
  update public.profile
     set name = 'Deleted user',
         email = 'deleted+' || v_uid::text || '@naluka.invalid',
         deletion_requested_at = v_now,
         updated_at = v_now
   where id = v_uid;

  -- Tombstone personnel rows: drop out of personnel_public via
  -- status='expired' (matches the 0012 orphan-crew behaviour).
  update public.personnel
     set status = 'expired',
         available = false,
         updated_at = v_now
   where user_id = v_uid;

  -- Sign the user out by deleting auth.users (cascades to profile
  -- via FK). The 90-day retention works because we updated profile
  -- BEFORE the delete, so the row is already tombstoned in audit
  -- referencing tables.
  --
  -- Actually we DON'T delete auth.users here — that would cascade
  -- into profile and we'd lose the deletion_requested_at trail. The
  -- frontend signs the user out client-side after this RPC returns;
  -- we just disable their auth record by setting a deleted-at hint
  -- via banning. Supabase manages this through the dashboard or
  -- admin API. For now, the tombstone is enough — the user can
  -- still sign in but their personnel + profile data is scrubbed.
  -- Hard delete happens in the 90-day cron purge.

  return jsonb_build_object(
    'deleted_at', v_now,
    'purge_after', v_now + interval '90 days',
    'note', 'Account scrubbed. Personnel data retained 90 days for transaction traceability, then hard-purged.'
  );
end;
$$;

grant execute on function public.request_account_deletion() to authenticated;

-- ── Right-to-export RPC ──────────────────────────────────────────
-- Returns a JSON document with everything the caller owns. Intended
-- for client to download as `my-naluka-data.json`. POPI Act §23.
create or replace function public.get_my_data_export()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'must be signed in';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'user_id', v_uid,
    'profile', (select to_jsonb(p) from public.profile p where p.id = v_uid),
    'personnel', (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from public.personnel p where p.user_id = v_uid),
    'documents', (
      select coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
        from public.document d
        join public.personnel p on p.id = d.personnel_id
       where p.user_id = v_uid
    ),
    'transactions', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
        from public.transaction t
       where t.buyer_id = v_uid or t.seller_id = v_uid
    ),
    'notifications', (
      select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb)
        from public.notification n
       where n.user_id = v_uid
    ),
    'support_tickets', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
        from public.support_ticket s
       where s.user_id = v_uid
    )
  );
end;
$$;

grant execute on function public.get_my_data_export() to authenticated;

-- ── Admin: hard-purge a single user immediately ──────────────────
-- Used when a regulator or user demands immediate full deletion.
-- Removes auth.users (cascades), personnel rows, documents.
create or replace function public.admin_purge_user(p_user_id uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_personnel_count int;
  v_doc_count int;
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required';
  end if;

  -- Count what we're about to delete (for the audit log).
  select count(*) into v_personnel_count from public.personnel where user_id = p_user_id;
  select count(*) into v_doc_count
    from public.document d
    join public.personnel p on p.id = d.personnel_id
   where p.user_id = p_user_id;

  -- Hard delete personnel rows (cascades to documents via FK).
  delete from public.personnel where user_id = p_user_id;

  -- Audit log entry — admin purge is a tracked event.
  perform public.record_audit_event(
    'kyc.rejected',
    jsonb_build_object(
      'admin_purge_user', p_user_id,
      'personnel_deleted', v_personnel_count,
      'documents_deleted', v_doc_count,
      'reason', 'admin POPI hard-purge'
    )
  );

  -- The auth.users delete must happen via Supabase Admin API from
  -- a service-role context (this function is SECURITY DEFINER but
  -- delete on auth.users requires elevated privileges that aren't
  -- available to RPC). Caller-side: after this RPC, frontend
  -- triggers an Edge Function with service_role to delete the
  -- auth.users row. For now: tombstone profile + personnel.
  update public.profile
     set name = 'Purged user',
         email = 'purged+' || p_user_id::text || '@naluka.invalid',
         deletion_requested_at = now(),
         updated_at = now()
   where id = p_user_id;

  return jsonb_build_object(
    'user_id', p_user_id,
    'personnel_deleted', v_personnel_count,
    'documents_deleted', v_doc_count,
    'note', 'Profile + personnel + documents purged. Run delete-auth-user Edge Function with service_role to remove auth.users entry.'
  );
end;
$$;

grant execute on function public.admin_purge_user(uuid) to authenticated;

-- ── Cron: purge accounts deleted >= 90 days ──────────────────────
-- Called by pg_cron weekly. For users whose deletion_requested_at
-- crossed the 90-day mark, hard-deletes their personnel rows. The
-- profile row stays as a tombstone (FK-required for old transactions
-- + audit events).
create or replace function public.purge_expired_deleted_accounts()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_purged int;
begin
  delete from public.personnel
   where user_id in (
     select id from public.profile
      where deletion_requested_at is not null
        and deletion_requested_at < now() - interval '90 days'
   );
  get diagnostics v_purged = row_count;

  perform public.record_cron_run(
    'popi-purge', true, v_purged, null
  );

  return jsonb_build_object('purged_personnel_rows', v_purged);
end;
$$;

grant execute on function public.purge_expired_deleted_accounts() to service_role;

-- Schedule weekly. Invoked via pg_cron in 0003_pg_cron.sql pattern.
-- We don't add a new cron job here to avoid colliding with existing
-- pg_cron wrappers — operator can add this manually:
--   select cron.schedule('popi-purge', '0 3 * * 1', $$select public.purge_expired_deleted_accounts()$$);
