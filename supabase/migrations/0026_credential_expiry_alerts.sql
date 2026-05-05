-- Naluka — credential expiry alerts.
--
-- Mirror of 0015_document_expiry_alerts but for personnel_credential.
-- Without this, secondary credentials silently expire and the user
-- finds out from a customer who refused to dispatch them. Same 90 /
-- 30 / 7-day windows as documents, same fired-once ledger.
--
-- Status flipping (verified → expiring → expired) is also added here
-- so credential cards visually warn before SACAA rejects the licence.

-- ── Alert ledger ────────────────────────────────────────────────
create table if not exists public.personnel_credential_expiry_alert (
  credential_id  uuid not null references public.personnel_credential(id) on delete cascade,
  threshold_days smallint not null check (threshold_days in (90, 30, 7)),
  fired_at       timestamptz not null default now(),
  primary key (credential_id, threshold_days)
);

create index if not exists personnel_credential_expiry_alert_fired_idx
  on public.personnel_credential_expiry_alert(fired_at desc);

-- ── RPC: sweep_credential_expiry_alerts ────────────────────────
-- Called by expiry-sweep alongside sweep_document_expiry_alerts on
-- each cron tick. Same 24h band logic to avoid skipped days.
create or replace function public.sweep_credential_expiry_alerts()
  returns table(threshold smallint, alerts_fired int)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_threshold  smallint;
  v_lower      timestamptz;
  v_upper      timestamptz;
  v_count      int;
  v_thresholds smallint[] := array[90, 30, 7];
  v_cred       record;
  v_personnel  record;
begin
  for v_threshold in select unnest(v_thresholds) loop
    v_lower := now() + ((v_threshold - 1) || ' days')::interval;
    v_upper := now() + (v_threshold || ' days')::interval;
    v_count := 0;

    for v_cred in
      select c.id, c.discipline, c.license, c.personnel_id, c.expires
        from public.personnel_credential c
       where c.expires is not null
         and c.expires >= v_lower
         and c.expires <  v_upper
         and not exists (
           select 1 from public.personnel_credential_expiry_alert a
            where a.credential_id = c.id and a.threshold_days = v_threshold
         )
    loop
      select p.user_id, p.created_by_operator, p.name
        into v_personnel
        from public.personnel p
       where p.id = v_cred.personnel_id;

      if v_personnel.user_id is not null then
        insert into public.notification (user_id, type, title, body, unread)
        values (
          v_personnel.user_id,
          'warning',
          v_cred.discipline::text || ' credential expiring in ' || v_threshold || ' days',
          coalesce(v_cred.license, v_cred.discipline::text) ||
            ' expires on ' || to_char(v_cred.expires, 'DD Mon YYYY') ||
            '. Update it in your profile to stay verified for that discipline.',
          true
        );
      end if;

      if v_personnel.created_by_operator is not null
         and v_personnel.created_by_operator <> v_personnel.user_id then
        insert into public.notification (user_id, type, title, body, unread)
        values (
          v_personnel.created_by_operator,
          'warning',
          v_personnel.name || '''s ' || v_cred.discipline::text || ' expires in ' || v_threshold || ' days',
          coalesce(v_cred.license, v_cred.discipline::text) ||
            ' expires on ' || to_char(v_cred.expires, 'DD Mon YYYY') ||
            '. They will fall out of the verified pool for that discipline unless renewed.',
          true
        );
      end if;

      insert into public.personnel_credential_expiry_alert (credential_id, threshold_days)
      values (v_cred.id, v_threshold);

      v_count := v_count + 1;
    end loop;

    threshold := v_threshold;
    alerts_fired := v_count;
    return next;
  end loop;
end;
$$;

grant execute on function public.sweep_credential_expiry_alerts() to authenticated, service_role;

-- ── Status flipping ─────────────────────────────────────────────
-- Flip verified → expiring (≤30d) → expired (≤now) on personnel_credential.
-- Edge function calls this RPC for atomicity rather than running two
-- update statements over the wire.
create or replace function public.sweep_credential_status()
  returns table(flipped_to_expiring int, flipped_to_expired int)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_to_expiring int;
  v_to_expired  int;
begin
  with bumped as (
    update public.personnel_credential
       set status = 'expiring', updated_at = now()
     where status = 'verified'
       and expires is not null
       and expires <= now() + interval '30 days'
       and expires >  now()
     returning id
  )
  select count(*) into v_to_expiring from bumped;

  with bumped as (
    update public.personnel_credential
       set status = 'expired', updated_at = now()
     where status in ('verified', 'expiring')
       and expires is not null
       and expires <= now()
     returning id
  )
  select count(*) into v_to_expired from bumped;

  flipped_to_expiring := v_to_expiring;
  flipped_to_expired  := v_to_expired;
  return next;
end;
$$;

grant execute on function public.sweep_credential_status() to authenticated, service_role;
