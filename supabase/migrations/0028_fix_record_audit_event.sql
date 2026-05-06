-- Naluka — fix the missing record_audit_event() wrapper.
--
-- Bug: migrations 0008, 0016, 0018, 0019, 0020 all call
-- public.record_audit_event(text, jsonb) but the function was never
-- actually defined. The closest existing function is audit_append
-- (audit_event_type, text, uuid, jsonb) which lives in 0001_init.sql.
--
-- Symptom: admin approve / reject on a pending personnel raised
--   "function public.record_audit_event(unknown, jsonb) does not exist"
-- in production. Same error would fire on welcome-email-on-approve,
-- POPI hard-purge, MRO escrow release, and MRO dispute open.
--
-- Fix: create the wrapper so all five callsites work without
-- touching their bodies. Wrapper:
--   1. Casts the text event type to the audit_event_type enum
--   2. Picks subject_id from the most-likely identifying payload key
--      (personnel_id → quote_id → transaction_id → user_id → '')
--   3. Uses auth.uid() as actor_id (NULL for service_role contexts)
--   4. Delegates to audit_append for the actual chained insert
--
-- This restores the audit chain for personnel approvals, welcome
-- emails, POPI deletions, MRO escrow releases, and MRO disputes —
-- features that were silently broken since each migration shipped.

create or replace function public.record_audit_event(
  p_event_type text,
  p_payload    jsonb
) returns public.audit_event
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  v_subject_id text;
  v_actor_id   uuid := auth.uid();   -- NULL when called from service_role / cron
begin
  -- Pick the most identifying payload key as subject_id. Order matters:
  -- approval / rejection events should anchor on personnel_id, escrow
  -- events on quote/transaction id, POPI on user_id. Falls back to ''
  -- so we never block on a pathological payload — chain integrity does
  -- not depend on subject_id uniqueness.
  v_subject_id := coalesce(
    p_payload->>'personnel_id',
    p_payload->>'quote_id',
    p_payload->>'transaction_id',
    p_payload->>'user_id',
    p_payload->>'dispute_id',
    p_payload->>'admin_purge_user',
    ''
  );

  return public.audit_append(
    p_event_type::public.audit_event_type,
    v_subject_id,
    v_actor_id,
    p_payload
  );
end;
$$;

-- Same access as audit_append: SECURITY DEFINER + locked-down execute.
-- service_role (Edge Functions, cron) and authenticated users calling
-- through other SECURITY DEFINER RPCs (approve_personnel, etc.) reach
-- this via their own elevated privileges, so we only need authenticated
-- to invoke it indirectly.
revoke execute on function public.record_audit_event(text, jsonb) from public, anon;
grant  execute on function public.record_audit_event(text, jsonb) to authenticated, service_role;
