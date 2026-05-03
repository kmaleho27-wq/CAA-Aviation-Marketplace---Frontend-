-- Fix: Supabase Free tier locks down ALTER DATABASE SET. Switch
-- invoke_scheduled_function to read its secret from Supabase Vault
-- (which is the canonical Supabase way) and bake the project_ref in as
-- a literal — it's the public dashboard URL slug, not a secret.

-- ── Store cron_secret in vault, idempotent ───────────────────────
-- The same value must be set as the CRON_SECRET Edge Function secret
-- (`supabase secrets set CRON_SECRET=...`) so the receiving function
-- can verify the x-cron-secret header.
do $$
declare
  v_existing uuid;
begin
  select id into v_existing from vault.secrets where name = 'cron_secret';
  if v_existing is null then
    perform vault.create_secret(
      '7471a3d3fd68611a7350e9e3b08c39620dedb3823ae5ebf22eabee1033d7bca2',
      'cron_secret',
      'Shared secret pg_cron passes to scheduled Edge Functions (sacaa-sweep, expiry-sweep)'
    );
  end if;
end $$;

-- ── Replace invoke_scheduled_function to read from vault ──────────
create or replace function public.invoke_scheduled_function(p_function_name text)
  returns bigint
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  v_ref     text := 'hrimskndpuuvftdskuae';  -- public project ref
  v_secret  text;
  v_url     text;
  v_request_id bigint;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets
   where name = 'cron_secret';

  if v_secret is null then
    raise exception 'vault.secrets row "cron_secret" missing — run 0004 migration';
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
