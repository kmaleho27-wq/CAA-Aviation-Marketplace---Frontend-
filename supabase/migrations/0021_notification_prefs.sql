-- Naluka — notification preferences.
--
-- Adds a jsonb column to profile so users can opt out of specific
-- notification categories (expiry alerts, AOG, MRO updates, etc.)
-- without affecting RLS-essential ones (security alerts always fire).
--
-- Default: everything ON. Users opt out, not in.

alter table public.profile
  add column if not exists notification_prefs jsonb not null default jsonb_build_object(
    'expiry_alerts',  true,   -- 90/30/7 day document expiry pings
    'aog_events',     true,   -- AOG broadcasts
    'mro_updates',    true,   -- MRO quote state changes
    'kyc_updates',    true,   -- verification approvals/rejections
    'support_replies', true   -- ticket responses (always-on by default)
  );

create or replace function public.update_notification_prefs(p_prefs jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'must be signed in'; end if;

  -- Merge incoming prefs onto existing — partial updates allowed.
  update public.profile
     set notification_prefs = notification_prefs || p_prefs,
         updated_at = now()
   where id = v_uid;

  return (select notification_prefs from public.profile where id = v_uid);
end;
$$;

grant execute on function public.update_notification_prefs(jsonb) to authenticated;
