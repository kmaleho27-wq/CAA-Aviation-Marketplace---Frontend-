-- Local-only validation harness. NOT shipped to Supabase — the migration
-- runner skips files starting with '.'. This stubs out the Supabase-managed
-- pieces (auth schema + roles + helper fns) so we can apply 0001 + 0002
-- against vanilla Postgres 15 and smoke-test the audit chain.

-- ── Roles Supabase creates by default ─────────────────────────
do $$ begin
  create role anon                 nologin;             exception when duplicate_object then null;
end $$;
do $$ begin
  create role authenticated        nologin;             exception when duplicate_object then null;
end $$;
do $$ begin
  create role service_role         nologin bypassrls;   exception when duplicate_object then null;
end $$;
do $$ begin
  create role supabase_auth_admin  nologin;             exception when duplicate_object then null;
end $$;

-- ── auth.* schema stub ────────────────────────────────────────
create schema if not exists auth;
create schema if not exists extensions;

create table if not exists auth.users (
  id                    uuid primary key default gen_random_uuid(),
  email                 text unique,
  raw_user_meta_data    jsonb default '{}'::jsonb,
  created_at            timestamptz default now()
);

-- Session-scoped GUCs let us simulate auth.uid() / auth.jwt() per test.
create or replace function auth.uid() returns uuid
  language sql stable as $$
  select nullif(current_setting('naluka.test_uid', true), '')::uuid
$$;

create or replace function auth.jwt() returns jsonb
  language sql stable as $$
  select coalesce(
    nullif(current_setting('naluka.test_jwt', true), '')::jsonb,
    '{}'::jsonb
  )
$$;

-- ── storage.* stub (Supabase ships this) ──────────────────────
create schema if not exists storage;
create table if not exists storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text,
  name      text,
  owner     uuid,
  created_at timestamptz default now()
);
