-- Naluka — document expiry alert notifications (Tier 1 wedge product).
--
-- The compliance SaaS pitch: "we tell you 90 days before any of your
-- crew's licences expire". Today expiry-sweep flips status verified
-- → expiring → expired but doesn't notify anyone — the user has to
-- log in and look. This migration adds in-app notifications fired at
-- 90 / 30 / 7 days before expiry, plus a "fired-once" ledger so a
-- single doc never alerts twice at the same threshold.
--
-- Email is intentionally deferred — it requires a Resend Edge
-- Function and is its own feature. In-app bell ships first.

-- ── Threshold ledger ────────────────────────────────────────────
-- One row per (document, threshold) combo when an alert has fired.
-- The unique index prevents double-firing.
create table if not exists public.document_expiry_alert (
  document_id   uuid not null references public.document(id) on delete cascade,
  threshold_days smallint not null check (threshold_days in (90, 30, 7)),
  fired_at      timestamptz not null default now(),
  primary key (document_id, threshold_days)
);

create index if not exists document_expiry_alert_fired_idx
  on public.document_expiry_alert(fired_at desc);

-- ── RPC: sweep_document_expiry_alerts ──────────────────────────
-- Called by expiry-sweep Edge Function on each cron tick. Atomically:
--   1. Finds documents whose expires falls inside any (90/30/7 day)
--      window AND has no matching row in document_expiry_alert.
--   2. Inserts a notification row for the personnel's user_id (and
--      the operator who created them, if applicable).
--   3. Records the alert in document_expiry_alert so it doesn't
--      fire again at the same threshold.
-- Returns the count of alerts fired.
create or replace function public.sweep_document_expiry_alerts()
  returns table(threshold smallint, alerts_fired int)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_threshold smallint;
  v_lower     timestamptz;
  v_upper     timestamptz;
  v_count     int;
  v_thresholds smallint[] := array[90, 30, 7];
  v_doc       record;
  v_personnel record;
begin
  for v_threshold in select unnest(v_thresholds) loop
    -- Window: docs whose expires is between (threshold-1) and threshold days from now.
    -- Using a 24h band so a daily cron can't miss a doc by skipping
    -- between days. (Repeat-fire is prevented by the alert ledger.)
    v_lower := now() + ((v_threshold - 1) || ' days')::interval;
    v_upper := now() + (v_threshold || ' days')::interval;
    v_count := 0;

    for v_doc in
      select d.id, d.name, d.type, d.personnel_id, d.expires
        from public.document d
       where d.expires is not null
         and d.expires >= v_lower
         and d.expires <  v_upper
         and not exists (
           select 1 from public.document_expiry_alert a
            where a.document_id = d.id and a.threshold_days = v_threshold
         )
    loop
      -- Look up personnel + their owner(s)
      select p.user_id, p.created_by_operator, p.name
        into v_personnel
        from public.personnel p
       where p.id = v_doc.personnel_id;

      -- Notify the personnel themselves (if they have a user account)
      if v_personnel.user_id is not null then
        insert into public.notification (user_id, type, title, body, unread)
        values (
          v_personnel.user_id,
          'warning',
          'Document expiring in ' || v_threshold || ' days',
          v_doc.name || ' (' || v_doc.type || ') expires on ' ||
            to_char(v_doc.expires, 'DD Mon YYYY') ||
            '. Upload a renewal in your profile to stay verified.',
          true
        );
      end if;

      -- Notify the operator who manages this crew (if any) — same
      -- doc, different audience message.
      if v_personnel.created_by_operator is not null
         and v_personnel.created_by_operator <> v_personnel.user_id then
        insert into public.notification (user_id, type, title, body, unread)
        values (
          v_personnel.created_by_operator,
          'warning',
          v_personnel.name || '''s ' || v_doc.type || ' expires in ' || v_threshold || ' days',
          v_doc.name || ' expires on ' || to_char(v_doc.expires, 'DD Mon YYYY') ||
            '. They will fall out of the verified pool unless renewed.',
          true
        );
      end if;

      -- Record fired alert so we never fire twice at this threshold.
      insert into public.document_expiry_alert (document_id, threshold_days)
      values (v_doc.id, v_threshold);

      v_count := v_count + 1;
    end loop;

    threshold := v_threshold;
    alerts_fired := v_count;
    return next;
  end loop;
end;
$$;

grant execute on function public.sweep_document_expiry_alerts() to authenticated, service_role;
