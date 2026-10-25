-- Private personal talismans. These are not public listings, medical claims or products.
-- The browser is only allowed to upload the exact file reserved by the verified API.
create table app.support_talismans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  category text not null check (category in ('protection','energy','harmony','prosperity','wisdom','other')),
  storage_path text not null unique,
  state text not null default 'uploading' check (state in ('uploading','ready')),
  created_at timestamptz not null default now(),
  constraint talisman_path_owner check (
    storage_path = account_id::text || '/' || id::text || '.jpg'
  )
);
create index support_talismans_owner_created_idx
  on app.support_talismans (account_id,created_at desc);
alter table app.support_talismans enable row level security;
alter table app.support_talismans force row level security;
revoke all on app.support_talismans from public, anon, authenticated, hh_app_inbox;
grant select on app.support_talismans to authenticated;
grant select,insert,update,delete on app.support_talismans to hh_app_backend;

create policy support_talismans_owner_read on app.support_talismans
  for select to authenticated,hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.session_active()));
create policy support_talismans_backend_insert on app.support_talismans
  for insert to hh_app_backend
  with check (account_id=(select auth.uid()) and (select app_private.session_active()));
create policy support_talismans_backend_update on app.support_talismans
  for update to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.session_active()))
  with check (account_id=(select auth.uid()) and (select app_private.session_active()));
create policy support_talismans_backend_delete on app.support_talismans
  for delete to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.session_active()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('hh-support-talismans','hh-support-talismans',false,1500000,array['image/jpeg'])
on conflict (id) do nothing;

-- A signed-in user cannot bypass the API quota to upload arbitrary objects.
-- Upload is allowed only for an unexpired reservation created by hh_app_backend.
create policy hh_support_talismans_reserved_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id='hh-support-talismans'
    and (storage.foldername(name))[1]=(select auth.uid())::text
    and exists (
      select 1 from app.support_talismans t
       where t.storage_path=name and t.account_id=(select auth.uid())
         and t.state='uploading' and t.created_at>now()-interval '15 minutes'
    )
  );
create policy hh_support_talismans_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id='hh-support-talismans'
    and exists (
      select 1 from app.support_talismans t
       where t.storage_path=name and t.account_id=(select auth.uid()) and t.state='ready'
    )
  );
create policy hh_support_talismans_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id='hh-support-talismans'
    and exists (
      select 1 from app.support_talismans t
       where t.storage_path=name and t.account_id=(select auth.uid())
    )
  );
