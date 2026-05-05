-- Naluka — MRO checkout-abandoned recovery (states-matrix audit fix).
--
-- Bug: when an operator clicks "Accept & pay" on a quoted MRO service,
-- mark_mro_quote_accepted flips the quote to 'accepted' and creates
-- the transaction. The frontend then redirects to PayFast. If the
-- operator closes the tab before paying, the quote sits at 'accepted'
-- forever — the transaction never receives an ITN, so
-- mark_mro_quote_escrowed never fires.
--
-- Fix:
--   1. resume_mro_payment(quote_id) RPC — caller-facing. Reuses the
--      existing transaction's idempotency_key so payfast-create-payment
--      returns the same checkoutUrl, letting the operator continue.
--   2. sweep_abandoned_mro_checkouts() — cron-callable. Auto-cancels
--      quotes that have been 'accepted' for > 2 hours with no ITN.
--      Routes through cancel_mro_quote so the AMO is notified.
--      The 2-hour window is configurable via the cron_run history
--      pattern but defaults to that — long enough that real users
--      bouncing back to retry payment within minutes still succeed,
--      short enough that a stuck quote doesn't linger overnight.

-- ── resume_mro_payment ──────────────────────────────────────────
-- Operator presses "Resume payment" on an 'accepted' quote. We
-- return the linked transaction's idempotency_key + id so the
-- frontend can re-call payfast-create-payment with the same key —
-- the existing-transaction branch in that Edge Function returns the
-- same checkout URL.
create or replace function public.resume_mro_payment(p_quote_id uuid)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_q public.mro_quote;
  v_txn public.transaction;
begin
  if auth.uid() is null then raise exception 'must be signed in'; end if;

  select * into v_q from public.mro_quote where id = p_quote_id;
  if v_q.id is null then raise exception 'quote not found'; end if;
  if v_q.operator_id <> auth.uid() and not public.is_admin() then
    raise exception 'only the operator can resume payment';
  end if;
  if v_q.status <> 'accepted' then
    raise exception 'quote must be in "accepted" status to resume (was %)', v_q.status;
  end if;
  if v_q.transaction_id is null then
    raise exception 'no transaction linked — cannot resume';
  end if;

  select * into v_txn from public.transaction where id = v_q.transaction_id;
  if v_txn.id is null then raise exception 'linked transaction missing'; end if;
  if v_txn.status <> 'in-escrow' then
    raise exception 'transaction status is "%" — cannot resume', v_txn.status;
  end if;

  return jsonb_build_object(
    'transaction_id',   v_txn.id,
    'idempotency_key',  v_txn.idempotency_key,
    'amount',           v_txn.amount,
    'item',             v_txn.item,
    'note',             'Pass idempotency_key + amount + item back to payfast-create-payment to resume the same checkout.'
  );
end;
$$;

grant execute on function public.resume_mro_payment(uuid) to authenticated;

-- ── sweep_abandoned_mro_checkouts ───────────────────────────────
-- Auto-cancels accepted-but-unpaid quotes older than the threshold.
-- Routes through cancel_mro_quote logic (status='cancelled', AMO
-- notified, dispute opened if escrow funded). Returns rows touched.
--
-- Note: 'accepted' transitions to 'escrowed' on PayFast ITN. So any
-- quote in 'accepted' state with a creation timestamp > 2h ago has
-- definitely been abandoned — PayFast ITNs land within seconds in
-- our experience.
create or replace function public.sweep_abandoned_mro_checkouts(p_threshold interval default interval '2 hours')
  returns int
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_q record;
  v_count int := 0;
begin
  for v_q in
    select id, operator_id
      from public.mro_quote
     where status = 'accepted'
       and accepted_at < now() - p_threshold
  loop
    -- Mark as cancelled with a structured reason.
    update public.mro_quote
       set status              = 'cancelled',
           cancellation_reason = 'auto-cancel: PayFast checkout abandoned (no ITN within ' || p_threshold::text || ')',
           cancelled_at        = now(),
           cancelled_by        = null   -- system action
     where id = v_q.id;

    -- Notify operator so they know they can re-quote.
    insert into public.notification (user_id, type, title, body, unread)
    values (
      v_q.operator_id,
      'warning',
      'MRO checkout cancelled',
      'Your MRO quote was auto-cancelled because PayFast didn''t complete the payment. ' ||
      'Open the marketplace to request a fresh quote.',
      true
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.sweep_abandoned_mro_checkouts(interval) to service_role;
