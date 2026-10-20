-- Public promotional videos only. Client-private recordings and storage stay separate.
-- Upload tokens are minted by the authenticated backend; the bucket grants
-- public READ but not anonymous INSERT/UPDATE/DELETE.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('hh-practitioner-presentations','hh-practitioner-presentations',true,25000000,
  ARRAY['video/mp4','video/quicktime']::text[])
on conflict (id) do nothing;

create table if not exists app_private.practitioner_presentation_uploads (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references app.practitioners(id) on delete cascade,
  owner_auth_user_id uuid not null,
  object_key text not null unique,
  mime text not null check (mime in ('video/mp4','video/quicktime')),
  expected_bytes bigint not null check (expected_bytes between 128 and 25000000),
  status text not null default 'pending' check (status in ('pending','ready')),
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  constraint practitioner_presentation_path_check check (
    object_key = owner_auth_user_id::text || '/' || id::text || case when mime='video/mp4' then '.mp4' else '.mov' end
  )
);
create index if not exists practitioner_presentation_uploads_owner_idx
  on app_private.practitioner_presentation_uploads (practitioner_id,status,created_at desc);
alter table app_private.practitioner_presentation_uploads enable row level security;
revoke all on app_private.practitioner_presentation_uploads from PUBLIC,anon,authenticated;
grant select,insert,update on app_private.practitioner_presentation_uploads to hh_app_backend;
drop policy if exists practitioner_presentation_owner on app_private.practitioner_presentation_uploads;
create policy practitioner_presentation_owner on app_private.practitioner_presentation_uploads
  for all to hh_app_backend
  using ((select auth.uid()) = owner_auth_user_id and (select app_private.account_active()))
  with check ((select auth.uid()) = owner_auth_user_id and (select app_private.account_active()));

-- Deliberately NO write policy on storage.objects for this bucket:
-- service-side signed uploads only; public consumers are read-only.
