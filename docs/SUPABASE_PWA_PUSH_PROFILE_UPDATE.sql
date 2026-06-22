-- GMC Geology Department Welfare v1.0.3
-- PWA Push Notifications + Profile Photos setup.
-- Run in Supabase SQL Editor after the original schema setup.

create table if not exists public.push_subscriptions (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
drop policy if exists push_subscriptions_insert on public.push_subscriptions;
drop policy if exists push_subscriptions_update on public.push_subscriptions;
drop policy if exists push_subscriptions_delete on public.push_subscriptions;

create policy push_subscriptions_select
on public.push_subscriptions
for select
to authenticated
using (public.is_admin() or data->>'userId' = auth.uid()::text);

create policy push_subscriptions_insert
on public.push_subscriptions
for insert
to authenticated
with check (data->>'userId' = auth.uid()::text or public.is_admin());

create policy push_subscriptions_update
on public.push_subscriptions
for update
to authenticated
using (data->>'userId' = auth.uid()::text or public.is_admin())
with check (data->>'userId' = auth.uid()::text or public.is_admin());

create policy push_subscriptions_delete
on public.push_subscriptions
for delete
to authenticated
using (data->>'userId' = auth.uid()::text or public.is_admin());

-- Storage bucket for member passport/profile pictures.
insert into storage.buckets (id, name, public)
values ('profile-pictures', 'profile-pictures', false)
on conflict (id) do nothing;

drop policy if exists profile_pictures_read on storage.objects;
drop policy if exists profile_pictures_insert on storage.objects;
drop policy if exists profile_pictures_update on storage.objects;
drop policy if exists profile_pictures_delete on storage.objects;

create policy profile_pictures_read
on storage.objects
for select
to authenticated
using (bucket_id = 'profile-pictures');

create policy profile_pictures_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'profile-pictures');

create policy profile_pictures_update
on storage.objects
for update
to authenticated
using (bucket_id = 'profile-pictures')
with check (bucket_id = 'profile-pictures');

create policy profile_pictures_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'profile-pictures' and public.is_admin());

-- Secure function: lets a member update only their own photo fields on their member record.
-- This avoids granting members general update rights to the members table.
create or replace function public.update_my_profile_photo(p_bucket text, p_path text, p_url text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id text;
  v_member_doc_id text;
begin
  select data->>'memberId', data->>'memberDocId'
    into v_member_id, v_member_doc_id
  from public.users
  where id = auth.uid()::text;

  update public.members
  set data = data || jsonb_build_object(
    'photoBucket', p_bucket,
    'photoPath', p_path,
    'photoUrl', p_url,
    'photoUpdatedAt', now()::text
  )
  where id = v_member_doc_id
     or data->>'memberId' = v_member_id
     or lower(coalesce(data->>'email','')) = lower(auth.email());
end;
$$;

grant execute on function public.update_my_profile_photo(text, text, text) to authenticated;
