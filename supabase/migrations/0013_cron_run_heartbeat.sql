-- Naluka — cron heartbeat + watchdog (Sprint 0 from /autoplan eng F4).
--
-- Bug being fixed: pg_cron's `net.http_post` to our sweep Edge
-- Functions can fail silently for many reasons (DNS hiccup, project
-- paused, function deploy stuck, secret rotation desync). The job
-- "runs" from cron's POV but does nothing. A 30-day silent failure
-- on expiry-sweep means licensed engineers with expired medicals stay
-- 'verified' — the exact compliance failure Naluka exists to prevent.
--
-- Fix: every sweep writes a row to public.cron_run on completion.
-- A watchdog query asserts every job has a successful run within the
-- expected window; missing rows trip the alert.

-- ── cron_run ledger ──────────────────────────────────────────────
create table if not exists public.cron_run (
  id            bigserial primary key,
  job           text not null,                     -- 'expiry-sweep' | 'sacaa-sweep' | etc.
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  rows_affected int,                               -- nullable for jobs without a row count
  ok            boolean not null default false,
  error_msg     text                               -- only populated on ok = false
);

create index if not exists cron_run_job_started_idx
  on public.cron_run (job, started_at desc);

-- ── RPC: record_cron_run ─────────────────────────────────────────
-- Edge Function sweeps call this RPC when they finish (success or
-- failure) so we have a single source of truth for liveness.
create or replace function public.record_cron_run(
  p_job text,
  p_ok boolean,
  p_rows_affected int default null,
  p_error_msg text default null
)
  returns bigint
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into public.cron_run (job, completed_at, rows_affected, ok, error_msg)
  values (p_job, now(), p_rows_affected, p_ok, p_error_msg)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.record_cron_run(text, boolean, int, text) to authenticated, anon, service_role;

-- ── View: cron_health ────────────────────────────────────────────
-- One row per job summarising last-run state. Use as a dashboard
-- query or alerting source. Stale = no successful run in 36 hours.
create or replace view public.cron_health as
with last_run as (
  select distinct on (job)
    job,
    started_at,
    completed_at,
    ok,
    rows_affected,
    error_msg
  from public.cron_run
  order by job, started_at desc
)
select
  job,
  started_at        as last_started_at,
  completed_at      as last_completed_at,
  ok                as last_ok,
  rows_affected     as last_rows_affected,
  error_msg         as last_error,
  (now() - started_at) > interval '36 hours' as stale,
  case
    when ok and (now() - started_at) <= interval '36 hours' then 'healthy'
    when not ok                                              then 'errored'
    when (now() - started_at) >  interval '36 hours'         then 'stale'
    else 'unknown'
  end as status
from last_run;

-- Admin-only read on the view (it's a view of a public table; gate
-- via RLS on cron_run + grant SELECT only to admins).
alter table public.cron_run enable row level security;

create policy cron_run_admin_read on public.cron_run
  for select to authenticated
  using (public.is_admin());

-- service_role inserts (Edge Functions calling record_cron_run RPC).
-- The RPC is SECURITY DEFINER so RLS on the underlying insert is
-- bypassed — but we still grant for direct inserts in tests.
create policy cron_run_admin_write on public.cron_run
  for insert to authenticated
  with check (public.is_admin());

-- ── Initial heartbeat row so cron_health has a baseline ──────────
-- Avoids 'no row → assumed missing' confusion right after migration.
insert into public.cron_run (job, completed_at, ok, error_msg)
values ('schema-bootstrap', now(), true, 'migration 0013 applied')
on conflict do nothing;
