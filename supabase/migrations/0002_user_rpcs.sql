-- Naluka — user-callable RPCs.
--
-- The audit chain primitives (audit_append, record_transaction_event) are
-- locked to service_role for safety. These thin wrappers do role checks
-- inside, then call them. Each wrapper is the user-facing entry point for
-- one business action: sign RTS, approve/reject KYC, resolve dispute,
-- accept job, sign work order.
--
-- Usage from the frontend:
--   const { data, error } = await supabase.rpc('sign_rts', { p_transaction_id: 'TXN-...' });

-- ── sign_rts: completes a transaction (escrow → completed) and chains audit
create or replace function public.sign_rts(p_transaction_id text) returns jsonb
  language plpgsql security definer set search_path = public, extensions as $$
declare
  v_txn   public.transaction;
  v_actor uuid := auth.uid();
  v_event public.audit_event;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_txn from public.transaction where id = p_transaction_id;
  if not found then
    raise exception 'transaction % not found', p_transaction_id using errcode = 'no_data_found';
  end if;

  -- Seller signs RTS. Buyer can also sign in 2-party-confirm flows.
  -- Admin always allowed. Legacy seed rows (no buyer_id/seller_id) → admin only.
  if not (
    public.is_admin()
    or (v_txn.seller_id is not null and v_txn.seller_id = v_actor)
    or (v_txn.buyer_id is not null  and v_txn.buyer_id  = v_actor)
  ) then
    raise exception 'not authorized to sign this transaction' using errcode = '42501';
  end if;

  if v_txn.status not in ('rts-pending','in-escrow') then
    raise exception 'transaction already in terminal state: %', v_txn.status using errcode = 'invalid_parameter_value';
  end if;

  v_event := public.record_transaction_event(
    p_transaction_id,
    'completed'::public.transaction_status,
    'rts.signed'::public.audit_event_type,
    v_actor,
    jsonb_build_object('signedBy', v_actor::text)
  );

  -- Stamp signed_at on the transaction itself (record_transaction_event
  -- updated status; signed_at lives outside the chain).
  update public.transaction set signed_at = now() where id = p_transaction_id;

  return jsonb_build_object(
    'transactionId', p_transaction_id,
    'status', 'completed',
    'auditSeq', v_event.seq,
    'auditHash', v_event.hash
  );
end;
$$;

grant execute on function public.sign_rts(text) to authenticated;

-- ── approve_kyc / reject_kyc — admin only
create or replace function public.approve_kyc(p_id text) returns jsonb
  language plpgsql security definer set search_path = public, extensions as $$
declare
  v_actor uuid := auth.uid();
  v_event public.audit_event;
begin
  if not public.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  update public.kyc_application
     set status = 'approved', reviewed_at = now(), reviewer_id = v_actor
   where id = p_id;
  if not found then
    raise exception 'kyc % not found', p_id using errcode = 'no_data_found';
  end if;

  v_event := public.audit_append(
    'kyc.approved'::public.audit_event_type, p_id, v_actor,
    jsonb_build_object('reviewerId', v_actor::text)
  );

  return jsonb_build_object('id', p_id, 'status', 'approved', 'auditSeq', v_event.seq);
end;
$$;

create or replace function public.reject_kyc(p_id text) returns jsonb
  language plpgsql security definer set search_path = public, extensions as $$
declare
  v_actor uuid := auth.uid();
  v_event public.audit_event;
begin
  if not public.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  update public.kyc_application
     set status = 'rejected', reviewed_at = now(), reviewer_id = v_actor
   where id = p_id;
  if not found then
    raise exception 'kyc % not found', p_id using errcode = 'no_data_found';
  end if;

  v_event := public.audit_append(
    'kyc.rejected'::public.audit_event_type, p_id, v_actor,
    jsonb_build_object('reviewerId', v_actor::text)
  );

  return jsonb_build_object('id', p_id, 'status', 'rejected', 'auditSeq', v_event.seq);
end;
$$;

grant execute on function public.approve_kyc(text) to authenticated;
grant execute on function public.reject_kyc(text)  to authenticated;

-- ── resolve_dispute — admin only.
-- outcome: 'released' (funds → seller), 'refunded' (funds → buyer), 'docs' (need more info).
-- 'released' and 'refunded' also flip the linked transaction status.
create or replace function public.resolve_dispute(p_id text, p_outcome text) returns jsonb
  language plpgsql security definer set search_path = public, extensions as $$
declare
  v_actor       uuid := auth.uid();
  v_event       public.audit_event;
  v_dispute     public.dispute;
  v_new_status  public.dispute_status;
  v_txn_status  public.transaction_status;
begin
  if not public.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  if p_outcome not in ('released','refunded','docs') then
    raise exception 'invalid outcome: %', p_outcome using errcode = 'invalid_parameter_value';
  end if;

  v_new_status := p_outcome::public.dispute_status;

  select * into v_dispute from public.dispute where id = p_id;
  if not found then
    raise exception 'dispute % not found', p_id using errcode = 'no_data_found';
  end if;

  -- 'docs': just bump status, no chain entry yet (request for more info).
  if p_outcome = 'docs' then
    update public.dispute set status = v_new_status where id = p_id;
    return jsonb_build_object('id', p_id, 'status', p_outcome);
  end if;

  -- 'released' or 'refunded' → terminal. Update dispute + transaction + audit.
  update public.dispute
     set status = v_new_status, resolved_at = now(), resolver_id = v_actor
   where id = p_id;

  v_txn_status := case p_outcome
    when 'released' then 'completed'::public.transaction_status
    when 'refunded' then 'completed'::public.transaction_status
  end;

  v_event := public.record_transaction_event(
    v_dispute.transaction_id,
    v_txn_status,
    case p_outcome
      when 'released' then 'funds.released'::public.audit_event_type
      when 'refunded' then 'funds.refunded'::public.audit_event_type
    end,
    v_actor,
    jsonb_build_object('disputeId', p_id, 'outcome', p_outcome, 'resolverId', v_actor::text)
  );

  return jsonb_build_object(
    'id', p_id,
    'status', p_outcome,
    'transactionId', v_dispute.transaction_id,
    'auditSeq', v_event.seq
  );
end;
$$;

grant execute on function public.resolve_dispute(text, text) to authenticated;

-- ── accept_job — only the linked contractor (or admin) can accept
create or replace function public.accept_job(p_id text) returns jsonb
  language plpgsql security definer set search_path = public, extensions as $$
declare
  v_actor    uuid := auth.uid();
  v_job      public.job;
  v_personnel_id uuid;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_job from public.job where id = p_id;
  if not found then
    raise exception 'job % not found', p_id using errcode = 'no_data_found';
  end if;
  if v_job.accepted then
    raise exception 'job already accepted' using errcode = 'invalid_parameter_value';
  end if;

  -- Find the personnel row linked to this user (if any). The job must
  -- already point at it (contractor-specific job feed) or be unassigned.
  select id into v_personnel_id from public.personnel where user_id = v_actor;

  if not (
    public.is_admin()
    or (v_job.contractor_id is not null and v_job.contractor_id = v_personnel_id)
    or (v_job.contractor_id is null and v_personnel_id is not null)
  ) then
    raise exception 'not authorized to accept this job' using errcode = '42501';
  end if;

  update public.job
     set accepted = true,
         accepted_at = now(),
         contractor_id = coalesce(v_job.contractor_id, v_personnel_id)
   where id = p_id;

  return jsonb_build_object('id', p_id, 'accepted', true, 'contractorId', coalesce(v_job.contractor_id, v_personnel_id));
end;
$$;

grant execute on function public.accept_job(text) to authenticated;

-- ── sign_work_order — only the assigned contractor signs. Chains audit
-- because signing a work order is the dispatch trigger for RTS / payout.
create or replace function public.sign_work_order(p_reference text) returns jsonb
  language plpgsql security definer set search_path = public, extensions as $$
declare
  v_actor uuid := auth.uid();
  v_wo    public.work_order;
  v_event public.audit_event;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_wo from public.work_order where reference = p_reference;
  if not found then
    raise exception 'work order % not found', p_reference using errcode = 'no_data_found';
  end if;
  if v_wo.signed then
    raise exception 'work order already signed' using errcode = 'invalid_parameter_value';
  end if;

  if not (
    public.is_admin()
    or exists (
      select 1 from public.personnel p
      where p.id = v_wo.contractor_id and p.user_id = v_actor
    )
  ) then
    raise exception 'not authorized to sign this work order' using errcode = '42501';
  end if;

  update public.work_order set signed = true, signed_at = now() where reference = p_reference;

  -- Chain a generic rts.signed entry for the work order (subject = WO id).
  v_event := public.audit_append(
    'rts.signed'::public.audit_event_type,
    v_wo.id::text,
    v_actor,
    jsonb_build_object('workOrderRef', p_reference, 'signedBy', v_actor::text)
  );

  return jsonb_build_object(
    'reference', p_reference,
    'signed', true,
    'auditSeq', v_event.seq,
    'auditHash', v_event.hash
  );
end;
$$;

grant execute on function public.sign_work_order(text) to authenticated;
