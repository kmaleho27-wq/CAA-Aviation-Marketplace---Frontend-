-- Naluka — storage bucket for personnel compliance documents.
--
-- A self-registered aviation professional uploads discipline-specific
-- documents (Part 66 licence, medical certificate, type rating, etc.)
-- before admin can verify them. Files live in a private Supabase
-- Storage bucket; the document table tracks metadata and links files
-- to the personnel row.
--
-- See plan doc §20 (P1 #5). Approved by user 2026-05-04.

-- ── Bucket ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'personnel-docs',
  'personnel-docs',
  false,                                                -- private bucket
  10 * 1024 * 1024,                                     -- 10 MB cap
  array['application/pdf', 'image/png', 'image/jpeg', 'image/heic', 'image/webp']
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── RLS on storage.objects ───────────────────────────────────────
-- Convention: file path is `{auth_user_id}/{filename}`. The first
-- folder segment must equal the caller's auth.uid() so users can only
-- read/write under their own prefix. Admins bypass the prefix check.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'personnel_docs_user_read'
  ) then
    create policy personnel_docs_user_read on storage.objects
      for select to authenticated
      using (
        bucket_id = 'personnel-docs'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or public.is_admin()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'personnel_docs_user_insert'
  ) then
    create policy personnel_docs_user_insert on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'personnel-docs'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'personnel_docs_user_update'
  ) then
    create policy personnel_docs_user_update on storage.objects
      for update to authenticated
      using (
        bucket_id = 'personnel-docs'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'personnel_docs_user_delete'
  ) then
    create policy personnel_docs_user_delete on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'personnel-docs'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or public.is_admin()
        )
      );
  end if;
end$$;

-- ── document.storage_path column ─────────────────────────────────
-- Tracks where the uploaded file lives in the bucket so the frontend
-- can fetch a signed URL. Existing seeded documents are pure metadata
-- (no actual file) and stay null — that's fine.
alter table public.document
  add column if not exists storage_path text;

-- ── document RLS — personnel-self insert + read ──────────────────
-- The existing RLS lets owners (linked through personnel.user_id) read
-- their own docs and admins read all (0001_init.sql). New: allow a
-- user to *insert* document rows for their own personnel record. This
-- is what powers the upload flow — without it, .insert() is denied.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document'
      and policyname = 'document_insert_self_or_admin'
  ) then
    create policy document_insert_self_or_admin on public.document
      for insert to authenticated
      with check (
        public.is_admin()
        or exists (
          select 1 from public.personnel p
          where p.id = personnel_id and p.user_id = auth.uid()
        )
      );
  end if;
end$$;
