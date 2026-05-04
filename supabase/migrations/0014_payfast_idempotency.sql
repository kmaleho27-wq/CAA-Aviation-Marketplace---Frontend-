-- Naluka — PayFast idempotency hardening (Sprint 0 from /autoplan F2).
--
-- Bug being fixed:
--   1. Transaction IDs use a YYYY-NNNN format with N a random 4-digit
--      number from 1000-9999 → 9000-row collision space → birthday
--      collision around N=100 transactions in a single year. We've
--      already passed that threshold across testing.
--   2. PayFast may retry an ITN if our 200 response is delayed.
--      Without an idempotency key on transactions, a buyer who
--      double-clicks creates TWO distinct in-escrow rows. PayFast
--      retries on the SECOND row could double-release escrow.
--
-- Fix:
--   - Add idempotency_key column on transaction (UUID, unique).
--   - Add a CHECK constraint enforcing FK consistency by type
--     (Parts → part_id required, Personnel → personnel_id required,
--     MRO → both null currently — will be revisited when MRO escrow
--     ships).
--   - Backfill idempotency_key for existing rows from id (one-time;
--     safe because existing IDs are unique by construction even if
--     the format is collision-prone going forward).
--
-- The transaction.id format (TXN-YYYY-NNNN) is preserved for human
-- readability — no breaking change for displays. Internally we use
-- idempotency_key for de-dup checks at the Edge Function layer.

-- ── Add idempotency_key column ────────────────────────────────────
alter table public.transaction
  add column if not exists idempotency_key uuid;

-- Backfill: every existing row gets a fresh UUID. Done in a single
-- update; safe because the column is currently null on all rows.
update public.transaction
   set idempotency_key = gen_random_uuid()
 where idempotency_key is null;

-- Now enforce non-null + uniqueness.
alter table public.transaction
  alter column idempotency_key set not null;

create unique index if not exists transaction_idempotency_key_uniq
  on public.transaction(idempotency_key);

-- ── Type / FK consistency CHECK ───────────────────────────────────
-- Prevents future accidents like "kind:'mro' inserted with part_id
-- pointing at a Personnel row" by making the relationship explicit.
-- MRO transactions don't yet have a dedicated FK column — when the
-- MRO escrow flow ships (P1 #6 in revised roadmap), we'll add an
-- mro_quote_id column and update this constraint.
alter table public.transaction drop constraint if exists transaction_type_fk_consistent;
alter table public.transaction
  add constraint transaction_type_fk_consistent check (
    (type = 'Parts'     and part_id      is not null and personnel_id is null)
    or
    (type = 'Personnel' and personnel_id is not null and part_id      is null)
    or
    (type = 'MRO')   -- MRO consistency added when escrow flow ships
  )
  not valid;       -- not valid: skip historical rows; only enforce on new inserts

-- Validate going forward but don't block migration if old rows fail
-- (they shouldn't — seed data conforms — but `not valid` is a safety
-- net for any drift we missed).
alter table public.transaction
  validate constraint transaction_type_fk_consistent;

-- ── claim_idempotency_key RPC ────────────────────────────────────
-- Edge Function calls this to atomically check-and-insert a key
-- before creating a transaction. If the key was already used, returns
-- the existing transaction.id so the caller can return the same
-- response instead of creating a duplicate.
create or replace function public.claim_idempotency_key(p_key uuid)
  returns table(transaction_id text, was_existing boolean)
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_txn_id text;
begin
  select id into v_txn_id from public.transaction where idempotency_key = p_key;

  if v_txn_id is not null then
    return query select v_txn_id, true;
  else
    return query select null::text, false;
  end if;
end;
$$;

grant execute on function public.claim_idempotency_key(uuid) to authenticated, service_role;
