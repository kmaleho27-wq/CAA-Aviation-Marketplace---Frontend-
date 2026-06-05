-- Naluka — prospective accounts (broker pre-seeded contacts).
--
-- Context: Aeropreserve is migrating his Rolodex onto Naluka. He
-- can't create real auth.users for them (he doesn't know their
-- passwords, they haven't consented to a Naluka account yet), but he
-- DOES need a way to track who he's introduced so:
--   - His broker dashboard shows "your network" before they sign up
--   - Real signup auto-attributes them to him via referrer_id
--   - We capture the original markup expectations + notes
--
-- Model: prospective_account is a CRM-style record of intent to
-- invite. It links to a real profile (linked_profile_id) once the
-- prospect signs up with the matching email. RLS scopes rows to the
-- introducing referrer + admin.

create table if not exists public.prospective_account (
  id                  uuid primary key default gen_random_uuid(),
  referrer_id         uuid not null references public.profile(id) on delete cascade,
  organization        text not null,
  account_type        text not null check (account_type in (
    'supplier', 'mro_customer', 'airline_customer'
  )),
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  country             char(2),                    -- ISO 3166-1 alpha-2
  -- Aeropreserve's suggested default markup for this supplier's
  -- listings — gets pre-filled on their listings when they sign up.
  suggested_markup_pct numeric(5,2)
    check (suggested_markup_pct is null or (suggested_markup_pct >= 20 and suggested_markup_pct <= 200)),
  notes               text,
  -- Lifecycle
  status              text not null default 'invited' check (status in (
    'invited',      -- record created, no outreach yet
    'contacted',    -- broker has reached out via WhatsApp / email
    'signed_up',    -- they've registered on Naluka (auto-set by trigger)
    'declined'      -- they've actively said no
  )),
  -- Once they sign up, this points at their real profile row
  linked_profile_id   uuid references public.profile(id) on delete set null,
  signed_up_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- One prospect record per (referrer, email) so re-importing is idempotent
  unique (referrer_id, contact_email)
);

create index if not exists prospective_account_referrer_idx
  on public.prospective_account(referrer_id, status);
create index if not exists prospective_account_email_idx
  on public.prospective_account(lower(contact_email))
  where contact_email is not null;

create trigger prospective_account_set_updated_at
  before update on public.prospective_account
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────
-- Referrer sees their own prospects. Admin sees everything.
alter table public.prospective_account enable row level security;

create policy prospective_account_self_select on public.prospective_account
  for select to authenticated
  using (referrer_id = auth.uid() or public.is_admin());

-- Inserts/updates only by admins or via SECURITY DEFINER RPCs.
create policy prospective_account_admin_write on public.prospective_account
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, update on public.prospective_account to authenticated;
grant all on public.prospective_account to service_role;

-- ── Auto-link on signup ─────────────────────────────────────────
-- When a new user signs up, check if their email matches any
-- prospective_account row. If so:
--   1. Set profile.referrer_id = prospect.referrer_id (so attribution
--      flows through to referral_ledger going forward)
--   2. Link the prospect → real profile and stamp signed_up_at
--   3. Update status to 'signed_up'
--
-- This trigger fires AFTER handle_new_user (which creates profile),
-- so by the time we run, profile exists.

create or replace function public.link_prospective_account_on_signup()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_prospect public.prospective_account;
begin
  select * into v_prospect
    from public.prospective_account
   where lower(contact_email) = lower(new.email)
     and linked_profile_id is null
   limit 1;

  if v_prospect.id is null then
    return new;  -- not a pre-seeded contact, nothing to do
  end if;

  -- Stamp referrer on the new profile
  update public.profile
     set referrer_id = v_prospect.referrer_id
   where id = new.id;

  -- Link prospect to real profile + flip status
  update public.prospective_account
     set linked_profile_id = new.id,
         status            = 'signed_up',
         signed_up_at      = now(),
         updated_at        = now()
   where id = v_prospect.id;

  return new;
end;
$$;

-- Trigger on auth.users insert — fires after handle_new_user.
-- Naming with a 'z_' prefix to alphabetically sort after handle_new_user.
drop trigger if exists z_link_prospective_account on auth.users;
create trigger z_link_prospective_account
  after insert on auth.users
  for each row execute function public.link_prospective_account_on_signup();

-- ── Helper: bulk_insert_prospects (admin only) ──────────────────
-- Lets the import script ingest many rows in one shot. Idempotent
-- on (referrer_id, contact_email) — safe to re-run.
create or replace function public.bulk_insert_prospects(
  p_referrer_id uuid,
  p_rows        jsonb     -- array of {organization, account_type, contact_email, contact_phone, country, ...}
) returns int
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_row   jsonb;
  v_count int := 0;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    insert into public.prospective_account (
      referrer_id, organization, account_type,
      contact_name, contact_email, contact_phone, country,
      suggested_markup_pct, notes
    ) values (
      p_referrer_id,
      v_row->>'organization',
      v_row->>'account_type',
      v_row->>'contact_name',
      v_row->>'contact_email',
      v_row->>'contact_phone',
      v_row->>'country',
      nullif(v_row->>'suggested_markup_pct', '')::numeric,
      v_row->>'notes'
    )
    on conflict (referrer_id, contact_email) do update
      set contact_phone = coalesce(excluded.contact_phone, prospective_account.contact_phone),
          contact_name  = coalesce(excluded.contact_name, prospective_account.contact_name),
          country       = coalesce(excluded.country, prospective_account.country),
          notes         = coalesce(excluded.notes, prospective_account.notes),
          updated_at    = now();
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.bulk_insert_prospects(uuid, jsonb)
  to authenticated, service_role;
