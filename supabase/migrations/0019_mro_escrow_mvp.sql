-- Naluka — MRO escrow MVP (Tier 1 marketplace closing).
--
-- Adds the missing state machine for MRO transactions:
--   1. Operator requests a quote (existing — fires notification)
--   2. AMO responds with price → mro_quote row 'quoted'
--   3. Operator accepts → kicks off PayFast escrow checkout
--   4. PayFast ITN flips transaction to in-escrow
--   5. AMO marks work complete → mro_quote 'work_complete'
--   6. Operator confirms → release_mro_escrow flips transaction +
--      mro_quote 'released' + audit chain entry
--
-- This is the HAPPY PATH ONLY. No 8130 doc verification, no multi-
-- step RTS sign-off ceremony, no dispute path beyond the existing
-- dispute table. A real Part 145 MRO workflow is 2-3 sprints; this
-- ships the skeleton so the marketplace can close transactions.

create type public.mro_quote_status as enum (
  'requested',     -- operator asked, AMO hasn't priced yet
  'quoted',        -- AMO responded with a price
  'accepted',      -- operator accepted, PayFast checkout in flight
  'escrowed',      -- PayFast confirmed; funds in escrow
  'work_complete', -- AMO declared work done
  'released',      -- operator confirmed; funds released
  'declined',      -- operator declined the AMO's quote
  'cancelled'      -- either party walked away pre-escrow
);

create table public.mro_quote (
  id              uuid primary key default gen_random_uuid(),
  service_id      uuid not null references public.mro_service(id) on delete cascade,
  operator_id     uuid not null references public.profile(id) on delete cascade,
  amo_id          uuid not null references public.profile(id) on delete cascade,
  message         text,                                 -- operator's request text
  amount_quoted   text,                                 -- AMO's price, e.g. "ZAR 280,000"
  amo_notes       text,                                 -- AMO's quote notes
  status          public.mro_quote_status not null default 'requested',
  transaction_id  text references public.transaction(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  quoted_at       timestamptz,
  accepted_at     timestamptz,
  escrowed_at     timestamptz,
  work_completed_at timestamptz,
  released_at     timestamptz
);

create index mro_quote_operator_idx     on public.mro_quote(operator_id, created_at desc);
create index mro_quote_amo_idx          on public.mro_quote(amo_id, created_at desc);
create index mro_quote_status_idx       on public.mro_quote(status);
create index mro_quote_transaction_idx  on public.mro_quote(transaction_id) where transaction_id is not null;

create trigger mro_quote_set_updated_at
  before update on public.mro_quote
  for each row execute function public.set_updated_at();

alter table public.mro_quote enable row level security;

-- Operator sees own (as operator_id), AMO sees own (as amo_id), admin sees all.
create policy mro_quote_select_owners on public.mro_quote
  for select to authenticated
  using (operator_id = auth.uid() or amo_id = auth.uid() or public.is_admin());

-- Inserts go through request_mro_quote_v2 RPC below — direct inserts
-- only allowed for admin.
create policy mro_quote_insert_admin on public.mro_quote
  for insert to authenticated
  with check (public.is_admin());

-- Updates: each side can only mutate their permitted fields. Enforced
-- in the RPCs below; the policy here is a coarse OR.
create policy mro_quote_update_parties on public.mro_quote
  for update to authenticated
  using (operator_id = auth.uid() or amo_id = auth.uid() or public.is_admin())
  with check (operator_id = auth.uid() or amo_id = auth.uid() or public.is_admin());

grant select, insert, update on public.mro_quote to authenticated;

-- ── request_mro_quote_v2 — supersedes the notification-only v1 ───
-- Same surface as request_mro_quote (existing in 0011) but creates a
-- proper mro_quote row. Drops a notification on the AMO too.
create or replace function public.request_mro_quote_v2(
  p_service_id uuid,
  p_message    text default null
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_service     public.mro_service;
  v_quote_id    uuid;
  v_operator_id uuid := auth.uid();
  v_operator    public.profile;
begin
  if v_operator_id is null then raise exception 'must be signed in'; end if;

  select * into v_service from public.mro_service where id = p_service_id;
  if v_service.id is null then raise exception 'mro service not found: %', p_service_id; end if;

  select * into v_operator from public.profile where id = v_operator_id;

  insert into public.mro_quote (service_id, operator_id, amo_id, message, status)
  values (v_service.id, v_operator_id, v_service.mro_id, p_message, 'requested')
  returning id into v_quote_id;

  -- Notify AMO with a link they can click into.
  insert into public.notification (user_id, type, title, body, unread)
  values (
    v_service.mro_id,
    'success',
    'Quote requested — ' || v_service.name,
    coalesce(v_operator.name, v_operator.email) ||
      ' is requesting a quote' ||
      coalesce(': "' || nullif(p_message, '') || '"', '') ||
      '. Reply with pricing in your AMO Quotes panel.',
    true
  );

  return v_quote_id;
end;
$$;

grant execute on function public.request_mro_quote_v2(uuid, text) to authenticated;

-- ── respond_mro_quote — AMO responds with a price ────────────────
create or replace function public.respond_mro_quote(
  p_quote_id  uuid,
  p_amount    text,           -- display string, e.g. "ZAR 280,000"
  p_notes     text default null
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_q public.mro_quote;
  v_amo_name text;
  v_service_name text;
begin
  if length(coalesce(p_amount, '')) = 0 then raise exception 'amount required'; end if;

  select * into v_q from public.mro_quote where id = p_quote_id;
  if v_q.id is null then raise exception 'quote not found'; end if;

  if v_q.amo_id <> auth.uid() and not public.is_admin() then
    raise exception 'only the AMO can respond to this quote';
  end if;
  if v_q.status not in ('requested') then
    raise exception 'quote status % cannot be responded to', v_q.status;
  end if;

  update public.mro_quote
     set status        = 'quoted',
         amount_quoted = p_amount,
         amo_notes     = p_notes,
         quoted_at     = now()
   where id = p_quote_id;

  select name into v_amo_name from public.profile where id = v_q.amo_id;
  select name into v_service_name from public.mro_service where id = v_q.service_id;

  -- Notify operator.
  insert into public.notification (user_id, type, title, body, unread)
  values (
    v_q.operator_id,
    'warning',
    'Quote ready — ' || v_service_name,
    coalesce(v_amo_name, 'Your AMO') || ' quoted ' || p_amount ||
      coalesce(' — ' || nullif(p_notes, ''), '') ||
      '. Open MRO Services to accept and pay into escrow.',
    true
  );

  return jsonb_build_object('quote_id', p_quote_id, 'status', 'quoted');
end;
$$;

grant execute on function public.respond_mro_quote(uuid, text, text) to authenticated;

-- ── decline_mro_quote — operator says no to the price ────────────
create or replace function public.decline_mro_quote(p_quote_id uuid, p_reason text default null)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q public.mro_quote;
begin
  select * into v_q from public.mro_quote where id = p_quote_id;
  if v_q.id is null then raise exception 'quote not found'; end if;
  if v_q.operator_id <> auth.uid() and not public.is_admin() then
    raise exception 'only the operator can decline';
  end if;
  if v_q.status not in ('requested', 'quoted') then
    raise exception 'cannot decline at status %', v_q.status;
  end if;

  update public.mro_quote set status = 'declined', updated_at = now()
   where id = p_quote_id;

  insert into public.notification (user_id, type, title, body, unread)
  values (v_q.amo_id, 'warning', 'Quote declined',
    'Operator declined' || coalesce(': ' || nullif(p_reason, ''), '.'), true);

  return jsonb_build_object('quote_id', p_quote_id, 'status', 'declined');
end$$;
grant execute on function public.decline_mro_quote(uuid, text) to authenticated;

-- ── mark_mro_quote_accepted — called by payfast-create-payment ─
-- After the PayFast checkout returns, the frontend redirects through
-- payfast-create-payment which inserts a transaction. That call also
-- updates the linked mro_quote to 'accepted' via this RPC.
create or replace function public.mark_mro_quote_accepted(
  p_quote_id      uuid,
  p_transaction_id text
)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q public.mro_quote;
begin
  select * into v_q from public.mro_quote where id = p_quote_id;
  if v_q.id is null then raise exception 'quote not found'; end if;
  if v_q.operator_id <> auth.uid() and not public.is_admin() then
    raise exception 'only the operator can accept';
  end if;
  if v_q.status <> 'quoted' then
    raise exception 'quote must be in "quoted" status to accept (was %)', v_q.status;
  end if;

  update public.mro_quote
     set status         = 'accepted',
         transaction_id = p_transaction_id,
         accepted_at    = now()
   where id = p_quote_id;

  return jsonb_build_object('quote_id', p_quote_id, 'status', 'accepted');
end$$;
grant execute on function public.mark_mro_quote_accepted(uuid, text) to authenticated;

-- ── mark_mro_quote_escrowed — called by payfast-itn ──────────────
-- Existing payfast-itn flips transaction status to 'in-escrow'. A
-- trigger on transaction would be cleaner, but for MVP we have the
-- ITN call this RPC explicitly. Service-role-callable.
create or replace function public.mark_mro_quote_escrowed(p_transaction_id text)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q public.mro_quote;
begin
  select * into v_q from public.mro_quote where transaction_id = p_transaction_id;
  if v_q.id is null then return jsonb_build_object('skipped', true, 'reason', 'no MRO quote linked'); end if;
  if v_q.status <> 'accepted' then
    return jsonb_build_object('skipped', true, 'reason', 'quote not in accepted status');
  end if;

  update public.mro_quote set status = 'escrowed', escrowed_at = now() where id = v_q.id;

  insert into public.notification (user_id, type, title, body, unread)
  values (v_q.amo_id, 'success', 'Funds escrowed — start work',
    'Operator funds are in escrow. Begin the work and mark complete when done.', true);

  return jsonb_build_object('quote_id', v_q.id, 'status', 'escrowed');
end$$;
grant execute on function public.mark_mro_quote_escrowed(text) to authenticated, service_role;

-- ── mark_mro_work_complete — AMO declares work done ─────────────
create or replace function public.mark_mro_work_complete(p_quote_id uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
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

  update public.mro_quote set status = 'work_complete', work_completed_at = now()
   where id = p_quote_id;

  insert into public.notification (user_id, type, title, body, unread)
  values (v_q.operator_id, 'warning', 'Work complete — confirm to release',
    'AMO has marked the work complete. Open MRO Services to confirm and release escrow.', true);

  return jsonb_build_object('quote_id', p_quote_id, 'status', 'work_complete');
end$$;
grant execute on function public.mark_mro_work_complete(uuid) to authenticated;

-- ── release_mro_escrow — operator confirms, funds released ───────
-- Flips both mro_quote and the linked transaction. Audit chain entry
-- via record_audit_event for traceability.
create or replace function public.release_mro_escrow(p_quote_id uuid)
  returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q public.mro_quote;
begin
  select * into v_q from public.mro_quote where id = p_quote_id;
  if v_q.id is null then raise exception 'quote not found'; end if;
  if v_q.operator_id <> auth.uid() and not public.is_admin() then
    raise exception 'only the operator can release';
  end if;
  if v_q.status <> 'work_complete' then
    raise exception 'cannot release at status % (AMO must mark complete first)', v_q.status;
  end if;

  update public.mro_quote set status = 'released', released_at = now()
   where id = p_quote_id;

  -- Flip the transaction to completed.
  if v_q.transaction_id is not null then
    update public.transaction set status = 'completed', signed_at = now()
     where id = v_q.transaction_id;
  end if;

  perform public.record_audit_event(
    'funds.released',
    jsonb_build_object(
      'kind', 'mro',
      'quote_id', v_q.id,
      'transaction_id', v_q.transaction_id,
      'amount', v_q.amount_quoted,
      'amo_id', v_q.amo_id,
      'operator_id', v_q.operator_id
    )
  );

  insert into public.notification (user_id, type, title, body, unread)
  values (v_q.amo_id, 'success', 'Escrow released — payment on its way',
    'Operator confirmed work complete. Funds have been released from escrow.', true);

  return jsonb_build_object('quote_id', p_quote_id, 'status', 'released');
end$$;
grant execute on function public.release_mro_escrow(uuid) to authenticated;
