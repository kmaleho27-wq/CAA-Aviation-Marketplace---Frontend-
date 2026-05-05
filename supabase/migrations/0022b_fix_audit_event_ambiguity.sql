-- Naluka — fix ambiguous column reference in get_my_audit_events.
--
-- Bug: 0022's get_my_audit_events returns a TABLE with columns named
-- (id, seq, type, ...). When the body does `select e.id, e.seq, ...`,
-- PostgreSQL can't tell whether `id` in the WHERE/JOIN context refers
-- to the OUT parameter or a column from the SELECT — error 42702.
--
-- Fix: rename OUT parameters with `_out` suffix so they don't shadow
-- column names, and use explicit `as id_out` aliases. JS callers
-- get camelCase names anyway via snakeToCamel — only the API
-- shape changes superficially.

-- DROP first because we're changing the RETURNS TABLE shape (renamed
-- OUT params id→event_id, seq→event_seq, type→event_type). Postgres
-- refuses CREATE OR REPLACE when the return-row type changes — error
-- 42P13 "cannot change return type of existing function".
drop function if exists public.get_my_audit_events(int, int);

create function public.get_my_audit_events(
  p_from_seq int default 0,
  p_limit int default 1000
)
  returns table (
    event_id        uuid,
    event_seq       int,
    event_type      public.audit_event_type,
    subject_id      text,
    actor_id        uuid,
    payload         jsonb,
    hash            text,
    prev_hash       text,
    created_at      timestamptz
  )
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
begin
  if v_uid is null then raise exception 'must be signed in'; end if;

  return query
  with my_personnel as (
    select p.id::text as pid
      from public.personnel p
     where p.user_id = v_uid or p.created_by_operator = v_uid
  ),
  my_transactions as (
    select t.id as tid
      from public.transaction t
     where t.buyer_id = v_uid or t.seller_id = v_uid
  ),
  my_mro_quotes as (
    select q.id::text as qid
      from public.mro_quote q
     where q.operator_id = v_uid or q.amo_id = v_uid
  )
  select
    e.id        as event_id,
    e.seq       as event_seq,
    e.type      as event_type,
    e.subject_id,
    e.actor_id,
    e.payload,
    e.hash,
    e.prev_hash,
    e.created_at
  from public.audit_event e
   where e.seq > p_from_seq
     and (
       v_is_admin
       or e.subject_id in (select tid from my_transactions)
       or e.payload->>'personnel_id'    in (select pid from my_personnel)
       or e.payload->>'transaction_id'  in (select tid from my_transactions)
       or e.payload->>'quote_id'        in (select qid from my_mro_quotes)
     )
   order by e.seq asc
   limit p_limit;
end;
$$;

grant execute on function public.get_my_audit_events(int, int) to authenticated;
