-- GMC Geology Department Welfare v1.0.3
-- Run this in Supabase SQL Editor to enable Media / Document Uploads.
-- It assumes you already created the public.is_admin() helper from the main setup.

create table if not exists public.documents (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

drop policy if exists documents_select on public.documents;
drop policy if exists documents_admin_insert on public.documents;
drop policy if exists documents_admin_update on public.documents;
drop policy if exists documents_admin_delete on public.documents;

create policy documents_select
on public.documents
for select
to authenticated
using (
  public.is_admin()
  or coalesce(data->>'visibility','members') = 'members'
);

create policy documents_admin_insert
on public.documents
for insert
to authenticated
with check (public.is_admin());

create policy documents_admin_update
on public.documents
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy documents_admin_delete
on public.documents
for delete
to authenticated
using (public.is_admin());

-- Storage bucket for uploaded files.
insert into storage.buckets (id, name, public)
values ('welfare-documents', 'welfare-documents', false)
on conflict (id) do nothing;

-- Storage policies for files in the welfare-documents bucket.
drop policy if exists welfare_documents_storage_read on storage.objects;
drop policy if exists welfare_documents_storage_insert on storage.objects;
drop policy if exists welfare_documents_storage_update on storage.objects;
drop policy if exists welfare_documents_storage_delete on storage.objects;

create policy welfare_documents_storage_read
on storage.objects
for select
to authenticated
using (bucket_id = 'welfare-documents');

create policy welfare_documents_storage_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'welfare-documents' and public.is_admin());

create policy welfare_documents_storage_update
on storage.objects
for update
to authenticated
using (bucket_id = 'welfare-documents' and public.is_admin())
with check (bucket_id = 'welfare-documents' and public.is_admin());

create policy welfare_documents_storage_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'welfare-documents' and public.is_admin());
