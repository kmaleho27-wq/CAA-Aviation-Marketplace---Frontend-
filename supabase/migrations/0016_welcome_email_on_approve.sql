-- Naluka — fire welcome email on personnel verification.
--
-- When approve_personnel flips status to 'verified', invoke the
-- send-welcome-email Edge Function via pg_net (fire-and-forget, no
-- block on email delivery). The Edge Function gracefully degrades
-- to a no-op if RESEND_API_KEY is unset, so this migration is safe
-- to apply before the Edge Function secret is configured.

-- Fire-and-forget RPC: posts to send-welcome-email with the personnel
-- ID. Re-uses the cron_secret pattern from 0004_cron_via_vault — same
-- shared header so the Edge Function's isCronAuthorized check passes.
create or replace function public.invoke_send_welcome_email(p_personnel_id uuid)
  returns bigint
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  v_ref        text := 'hrimskndpuuvftdskuae';
  v_secret     text;
  v_url        text;
  v_request_id bigint;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'cron_secret';

  -- Fail soft — vault missing means env is mis-configured, but we
  -- shouldn't block approve_personnel on it.
  if v_secret is null then
    raise warning 'invoke_send_welcome_email: cron_secret vault row missing — skipping email';
    return null;
  end if;

  v_url := format('https://%s.supabase.co/functions/v1/send-welcome-email', v_ref);

  select net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret',  v_secret
    ),
    body    := jsonb_build_object('personnel_id', p_personnel_id)
  ) into v_request_id;

  return v_request_id;
exception
  when others then
    raise warning 'invoke_send_welcome_email: % — %', sqlstate, sqlerrm;
    return null;
end;
$$;

revoke execute on function public.invoke_send_welcome_email(uuid) from public, anon, authenticated;
grant  execute on function public.invoke_send_welcome_email(uuid) to service_role;

-- ── Extend approve_personnel to fire the email ───────────────────
-- Same body as migration 0008's approve_personnel + an extra perform
-- of invoke_send_welcome_email at the end. The email send is
-- fire-and-forget — if it fails or pg_net errors, the approval still
-- commits. We don't want a Resend outage to block admin actions.
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
         available  = true,
         updated_at = now()
   where id = p_id
     and status = 'pending'
   returning * into v_row;

  if v_row.id is null then
    raise exception 'personnel not found or not pending: %', p_id;
  end if;

  perform public.record_audit_event(
    'kyc.approved',
    jsonb_build_object(
      'personnel_id', v_row.id,
      'discipline',   v_row.discipline,
      'name',         v_row.name,
      'license',      v_row.license
    )
  );

  -- Fire-and-forget welcome email. Wrapped so any failure in the
  -- pg_net layer doesn't block the approval.
  begin
    perform public.invoke_send_welcome_email(v_row.id);
  exception when others then
    raise warning 'approve_personnel: welcome email enqueue failed — % %', sqlstate, sqlerrm;
  end;

  return jsonb_build_object('id', v_row.id, 'status', v_row.status);
end;
$$;
