-- Naluka — support ticket queue.
--
-- Customer-facing contact form posts to this table via a SECURITY
-- DEFINER RPC. Admins read all tickets; users see their own. Each
-- new ticket also drops a notification on every admin so they don't
-- miss it.

create type public.support_ticket_status as enum (
  'open', 'in_progress', 'resolved', 'closed'
);

create table public.support_ticket (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profile(id) on delete set null,
  email       text not null,                 -- captured even if user deleted
  subject     text not null,
  body        text not null,
  status      public.support_ticket_status not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index support_ticket_status_idx     on public.support_ticket(status, created_at desc);
create index support_ticket_user_id_idx    on public.support_ticket(user_id) where user_id is not null;

create trigger support_ticket_set_updated_at
  before update on public.support_ticket
  for each row execute function public.set_updated_at();

alter table public.support_ticket enable row level security;

-- Admins: full access.
create policy support_ticket_admin_all on public.support_ticket
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Users: see + create their own.
create policy support_ticket_self_select on public.support_ticket
  for select to authenticated
  using (user_id = auth.uid());

create policy support_ticket_self_insert on public.support_ticket
  for insert to authenticated
  with check (user_id = auth.uid() or user_id is null);

grant select, insert, update on public.support_ticket to authenticated;

-- ── submit_support_ticket RPC ────────────────────────────────────
-- Wraps the insert + admin notification in one call. Lets unauth-
-- enticated users submit too (user_id null + email captured).
create or replace function public.submit_support_ticket(
  p_email   text,
  p_subject text,
  p_body    text
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_user_id uuid;
  v_ticket_id uuid;
begin
  if length(coalesce(p_subject, '')) < 3 then raise exception 'subject too short'; end if;
  if length(coalesce(p_body, ''))    < 10 then raise exception 'body too short'; end if;
  if p_email !~* '^[^@]+@[^@]+\.[^@]+$'   then raise exception 'invalid email'; end if;

  v_user_id := auth.uid();   -- null when called by anon

  insert into public.support_ticket (user_id, email, subject, body)
  values (v_user_id, p_email, p_subject, p_body)
  returning id into v_ticket_id;

  -- Notify every admin. Tiny notification volume; no need for a queue.
  insert into public.notification (user_id, type, title, body, unread)
  select p.id,
         'warning',
         'Support ticket: ' || p_subject,
         coalesce((select name from public.profile where id = v_user_id), p_email)
           || ': ' || left(p_body, 200)
           || case when length(p_body) > 200 then '…' else '' end,
         true
    from public.profile p where p.role = 'ADMIN';

  return v_ticket_id;
end;
$$;

grant execute on function public.submit_support_ticket(text, text, text) to authenticated, anon;
