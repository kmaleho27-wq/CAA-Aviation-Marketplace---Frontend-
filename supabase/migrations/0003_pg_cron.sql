-- Naluka — schedule the sweep Edge Functions.
--
-- pg_cron + pg_net let Postgres call HTTPS endpoints on a schedule. We
-- use this for the two periodic sweeps (review fix M2):
--   - sacaa-sweep   (daily)  re-verifies expiring licences
--   - expiry-sweep  (daily)  flips document status based on expires date
--
-- Both functions check x-cron-secret and reject anything else, so a
-- secret leak only enables a no-op call.
--
-- Apply this migration ONCE the Edge Functions are deployed AND the
-- vault secrets `cron_secret` and `project_url` are set:
--
--   supabase secrets set CRON_SECRET=<random-32-bytes>
--   supabase secrets set APP_BASE_URL=https://naluka.netlify.app   -- used by stripe-onboard-return
--
-- The CRON_SECRET below is also stored in Postgres via vault so pg_cron
-- can pass it along. If you rotate it, update both places.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Vault-backed config. Replace the literal strings before applying, OR
-- use `supabase secrets set CRON_SECRET=...` and let an Edge Function
-- read them — pg_cron itself can't read function secrets, only DB secrets.
--
-- For simplicity we store them in pg_settings via ALTER DATABASE so
-- they're queryable from plpgsql. Replace these with real values before
-- applying in prod (or write them via psql after deploy):
--
--   ALTER DATABASE postgres SET app.cron_secret = 'replace-me-32-bytes';
--   ALTER DATABASE postgres SET app.project_ref = 'naluka-xxx';
--
-- pg_cron job calls https://<ref>.supabase.co/functions/v1/<function>.

-- Helper to fire a function with the cron header attached.
create or replace function public.invoke_scheduled_function(p_function_name text)
  returns bigint
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  v_ref     text := current_setting('app.project_ref', true);
  v_secret  text := current_setting('app.cron_secret', true);
  v_url     text;
  v_request_id bigint;
begin
  if v_ref is null or v_ref = '' then
    raise exception 'app.project_ref not set; run ALTER DATABASE ... SET app.project_ref = ...';
  end if;
  if v_secret is null or v_secret = '' then
    raise exception 'app.cron_secret not set; run ALTER DATABASE ... SET app.cron_secret = ...';
  end if;

  v_url := format('https://%s.supabase.co/functions/v1/%s', v_ref, p_function_name);

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := '{}'::jsonb
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke execute on function public.invoke_scheduled_function(text) from public, anon, authenticated;
grant  execute on function public.invoke_scheduled_function(text) to service_role;

-- Schedule: 02:00 UTC daily (avoids most peak-hours).
-- Use cron.schedule(name, cron_spec, sql_command). Re-running with the
-- same name updates the schedule rather than duplicating it.
select cron.schedule(
  'sacaa-sweep-daily',
  '0 2 * * *',
  $$select public.invoke_scheduled_function('sacaa-sweep')$$
);

select cron.schedule(
  'expiry-sweep-daily',
  '15 2 * * *',
  $$select public.invoke_scheduled_function('expiry-sweep')$$
);

-- ───── Cleanup of stale rate_limit rows ──────────────────────────
-- Drop hash-rate rows older than 1 hour. Cheap, runs every 15 min.
select cron.schedule(
  'rate-limit-gc',
  '*/15 * * * *',
  $$ delete from public.rate_limit where window_start < (now() - interval '1 hour'); $$
);

-- ───── Cleanup of old stripe_processed_event rows ────────────────
-- Stripe retains events 30 days, so anything older than that won't be
-- redelivered. Drop monthly to keep the table small.
select cron.schedule(
  'stripe-event-gc',
  '30 3 1 * *',  -- 03:30 UTC, day 1 of every month
  $$ delete from public.stripe_processed_event where processed_at < (now() - interval '60 days'); $$
);
