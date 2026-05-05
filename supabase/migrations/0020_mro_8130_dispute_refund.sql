-- Naluka — MRO escrow tightenings (closing the MVP gaps).
--
-- 1. 8130 / RTS doc upload at "work complete" step.
-- 2. Operator-initiated refund/cancel before release.
-- 3. MRO dispute creation UI fed by existing dispute table.
--
-- Three things that were deliberately deferred in 0019 to ship the
-- happy path. Each is small on its own; collectively they make the
-- MRO flow safe enough for real customers.

-- ── 8130 doc upload at work complete ────────────────────────────
-- Reuse the personnel-docs storage bucket (private, user-folder
-- scoped). The mro_quote row carries a storage_path pointing at the
-- uploaded 8130-3 PDF.
alter table public.mro_quote
  add column if not exists work_complete_doc_path text,
  add column if not exists cancellation_reason    text,
  add column if not exists cancelled_at           timestamptz,
  add column if not exists cancelled_by           uuid references public.profile(id) on delete set null;

-- Extend mark_mro_work_complete to optionally accept an 8130 doc path.
-- Keeps backward-compat (existing callers omit the param).
create or replace function public.mark_mro_work_complete(
  p_quote_id uuid,
  p_8130_doc_path text default null
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare v_q public.mro_quote;
begin
  select * into v_q from public.mro_quote where id = p_quote_id;
  if v_q.id is null then raise exception 'quote not found'; end if;
  if v_q.amo_id <> auth.uid() and not public.is_admin() then
    raise exception 'only the AMO can mark work complete';
  end if;
  if v_q.status <> 'escrowed' then
    raise exception 'cannot mark complete at status % (must be "escrowed")', v_q.status;
  end if;

  update public.mro_quote
     set status                  = 'work_complete',
         work_completed_at       = now(),
         work_complete_doc_path  = coalesce(p_8130_doc_path, work_complete_doc_path)
   where id = p_quote_id;

  insert into public.notification (user_id, type, title, body, unread)
  values (
    v_q.operator_id,
    'warning',
    'Work complete — confirm to release',
    'AMO has marked the work complete'
      || case when p_8130_doc_path is not null then ' and uploaded the release document.' else '.' end
      || ' Open MRO Services to review and release escrow.',
    true
  );

  return jsonb_build_object('quote_id', p_quote_id, 'status', 'work_complete', 'doc_uploaded', p_8130_doc_path is not null);
end;
$$;

grant execute on function public.mark_mro_work_complete(uuid, text) to authenticated;

-- ── Operator-initiated cancel before release ────────────────────
-- Allowed at status in (requested, quoted, accepted, escrowed). Once
-- 'work_complete', the operator should release rather than cancel —
-- AMO has already done the work. (Disputes path covers post-complete.)
--
-- Refund mechanism: this RPC marks the quote 'cancelled' and flips the
-- linked transaction to 'dispute' which routes through the existing
-- resolve_dispute admin flow. We don't auto-PayFast-refund here —
-- admin refund via PayFast dashboard remains manual until we wire
-- their refund API.
create or replace function public.cancel_mro_quote(p_quote_id uuid, p_reason text default null)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare v_q public.mro_quote; v_uid uuid := auth.uid();
begin
  select * into v_q from public.mro_quote where id = p_quote_id;
  if v_q.id is null then raise exception 'quote not found'; end if;
  if v_q.operator_id <> v_uid and v_q.amo_id <> v_uid and not public.is_admin() then
    raise exception 'only the operator, AMO, or admin can cancel';
  end if;
  if v_q.status not in ('requested', 'quoted', 'accepted', 'escrowed') then
    raise exception 'cannot cancel at status % (use dispute path post-completion)', v_q.status;
  end if;

  update public.mro_quote
     set status              = 'cancelled',
         cancellation_reason = p_reason,
         cancelled_at        = now(),
         cancelled_by        = v_uid
   where id = p_quote_id;

  -- If funds were already escrowed, flip the transaction to 'dispute'
  -- so admin can drive the PayFast refund via the existing
  -- resolve_dispute path.
  if v_q.status = 'escrowed' and v_q.transaction_id is not null then
    update public.transaction set status = 'dispute' where id = v_q.transaction_id;

    insert into public.dispute (transaction_id, status, opened_by, opened_at, reason)
    values (
      v_q.transaction_id,
      'open',
      v_uid,
      now(),
      'MRO cancellation post-escrow: ' || coalesce(p_reason, '(no reason given)')
    );

    perform public.record_audit_event(
      'dispute.opened',
      jsonb_build_object(
        'kind', 'mro_cancellation',
        'quote_id', v_q.id,
        'transaction_id', v_q.transaction_id,
        'reason', coalesce(p_reason, '')
      )
    );
  end if;

  -- Notify the other party.
  insert into public.notification (user_id, type, title, body, unread)
  select case when v_uid = v_q.operator_id then v_q.amo_id else v_q.operator_id end,
         'warning',
         'MRO quote cancelled',
         'Counterparty cancelled' || coalesce(': ' || nullif(p_reason, ''), '.')
           || case when v_q.status = 'escrowed' then ' Funds in escrow — admin will arrange refund.' else '' end,
         true;

  return jsonb_build_object('quote_id', p_quote_id, 'status', 'cancelled', 'requires_refund', v_q.status = 'escrowed');
end;
$$;

grant execute on function public.cancel_mro_quote(uuid, text) to authenticated;

-- ── MRO dispute creation (operator after release) ───────────────
-- Once a quote is in 'work_complete' or 'released' state, the operator
-- can open a dispute citing the work quality. Routes through the
-- existing dispute table + admin resolve_dispute RPC.
create or replace function public.dispute_mro_quote(p_quote_id uuid, p_reason text)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare v_q public.mro_quote; v_dispute_id uuid;
begin
  if length(coalesce(p_reason, '')) < 10 then
    raise exception 'dispute reason must be at least 10 characters';
  end if;

  select * into v_q from public.mro_quote where id = p_quote_id;
  if v_q.id is null then raise exception 'quote not found'; end if;
  if v_q.operator_id <> auth.uid() and not public.is_admin() then
    raise exception 'only the operator can dispute (AMOs use cancel)';
  end if;
  if v_q.status not in ('work_complete', 'released') then
    raise exception 'can only dispute after AMO marks work complete';
  end if;
  if v_q.transaction_id is null then
    raise exception 'no transaction linked — cannot create dispute';
  end if;

  -- Flip the transaction.
  update public.transaction set status = 'dispute' where id = v_q.transaction_id;

  insert into public.dispute (transaction_id, status, opened_by, opened_at, reason)
  values (v_q.transaction_id, 'open', auth.uid(), now(), p_reason)
  returning id into v_dispute_id;

  perform public.record_audit_event(
    'dispute.opened',
    jsonb_build_object(
      'kind', 'mro_quality',
      'quote_id', v_q.id,
      'transaction_id', v_q.transaction_id,
      'dispute_id', v_dispute_id,
      'reason', p_reason
    )
  );

  -- Notify AMO.
  insert into public.notification (user_id, type, title, body, unread)
  values (
    v_q.amo_id,
    'warning',
    'Dispute opened on completed work',
    'Operator opened a dispute: "' || left(p_reason, 200) ||
      case when length(p_reason) > 200 then '…' else '' end || '". Admin will arbitrate.',
    true
  );

  return jsonb_build_object('quote_id', p_quote_id, 'dispute_id', v_dispute_id);
end;
$$;

grant execute on function public.dispute_mro_quote(uuid, text) to authenticated;
