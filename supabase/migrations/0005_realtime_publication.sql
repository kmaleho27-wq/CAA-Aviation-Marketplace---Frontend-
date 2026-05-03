-- Naluka — opt key tables into the supabase_realtime publication.
--
-- Supabase doesn't publish all tables by default; tables must be added
-- explicitly. Once added, frontends can subscribe to INSERT / UPDATE /
-- DELETE events via supabase.channel().on('postgres_changes', ...).
--
-- Tables we want live:
--   aog_event     — operator dashboard updates the AOG list when a new
--                   AOG is posted or an existing one is resolved
--   notification  — bell icon updates without refresh
--   transaction   — admin transactions page reflects new rows / status
--                   changes from Stripe webhooks in real time
--
-- RLS still applies to realtime payloads — subscribers only receive
-- events for rows they're allowed to read via the SELECT policies in
-- 0001_init.sql. The C1 fix (nullable buyer/seller) carries through.

alter publication supabase_realtime add table public.aog_event;
alter publication supabase_realtime add table public.notification;
alter publication supabase_realtime add table public.transaction;
