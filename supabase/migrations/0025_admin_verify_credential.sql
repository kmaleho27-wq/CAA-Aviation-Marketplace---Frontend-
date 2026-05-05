-- Naluka — admin verify/reject for secondary personnel credentials.
--
-- Mirror of approve_personnel / reject_personnel for personnel_credential.
-- Each licence a person holds gets its own ✓/✕ in the admin queue,
-- because a Cat B1 engineer rating verifies separately from an ATPL
-- pilot licence — different SACAA Parts, different documents,
-- different signatories.

create or replace function public.verify_personnel_credential(
  p_credential_id uuid
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_cred public.personnel_credential;
  v_personnel public.personnel;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select * into v_cred from public.personnel_credential where id = p_credential_id;
  if v_cred.id is null then
    raise exception 'credential % not found', p_credential_id;
  end if;

  update public.personnel_credential
     set status = 'verified', updated_at = now()
   where id = p_credential_id;

  -- Notify the personnel that their additional credential is now verified
  select * into v_personnel from public.personnel where id = v_cred.personnel_id;
  if v_personnel.user_id is not null then
    insert into public.notification (user_id, type, title, body, unread)
    values (
      v_personnel.user_id,
      'success',
      'Credential verified',
      'Your ' || v_cred.discipline::text || ' credential has been verified by Naluka admin. It is now visible to operators on the marketplace.',
      true
    );
  end if;
end;
$$;

create or replace function public.reject_personnel_credential(
  p_credential_id uuid,
  p_reason        text default null
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_cred public.personnel_credential;
  v_personnel public.personnel;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select * into v_cred from public.personnel_credential where id = p_credential_id;
  if v_cred.id is null then
    raise exception 'credential % not found', p_credential_id;
  end if;

  update public.personnel_credential
     set status = 'rejected', updated_at = now()
   where id = p_credential_id;

  select * into v_personnel from public.personnel where id = v_cred.personnel_id;
  if v_personnel.user_id is not null then
    insert into public.notification (user_id, type, title, body, unread)
    values (
      v_personnel.user_id,
      'warning',
      'Credential not verified',
      'Your ' || v_cred.discipline::text || ' credential could not be verified.' ||
        case when p_reason is not null and length(p_reason) > 0
             then ' Reason: ' || p_reason || '.'
             else '' end ||
        ' You can edit it in your profile and re-submit.',
      true
    );
  end if;
end;
$$;

grant execute on function public.verify_personnel_credential(uuid) to authenticated;
grant execute on function public.reject_personnel_credential(uuid, text) to authenticated;

-- Admin queue helper: list pending personnel credentials with the
-- person's name + email so reviewers see context without joining
-- in the client.
create or replace function public.list_pending_personnel_credentials()
  returns table (
    id              uuid,
    personnel_id    uuid,
    personnel_name  text,
    personnel_email text,
    discipline      public.sacaa_discipline,
    sacaa_part      smallint,
    licence_subtype text,
    license         text,
    medical_class   public.medical_class,
    expires         timestamptz,
    created_at      timestamptz
  )
  language sql
  security definer
  set search_path = public
as $$
  select pc.id, pc.personnel_id, p.name, prof.email,
         pc.discipline, pc.sacaa_part, pc.licence_subtype, pc.license,
         pc.medical_class, pc.expires, pc.created_at
    from public.personnel_credential pc
    join public.personnel p on p.id = pc.personnel_id
    left join public.profile prof on prof.id = p.user_id
   where pc.status = 'pending'
     and public.is_admin()
   order by pc.created_at asc;
$$;

grant execute on function public.list_pending_personnel_credentials() to authenticated;
