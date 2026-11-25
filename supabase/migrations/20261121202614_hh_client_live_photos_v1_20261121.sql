-- Holistic House: consented, reusable client live-photo MP4s.
-- No public bucket, browser grants, cron, or automatic paid provider activation.
begin;
create table if not exists app_private.client_live_photos_v1 (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  client_request_id uuid not null,
  motion text not null check (motion in ('smile','blink','turn','wave')),
  orientation text not null check (orientation in ('portrait','landscape')),
  subject text not null check (subject in ('self','other')),
  consent_ai boolean not null check (consent_ai),
  consent_subject boolean not null check (consent_subject),
  source_key text not null unique
    check (source_key ~ '^live-photos/[0-9a-f-]{36}/[0-9a-f-]{36}/source[.]jpg$'),
  clip_key text not null unique
    check (clip_key ~ '^live-photos/[0-9a-f-]{36}/[0-9a-f-]{36}/clip[.]mp4$'),
  provider_asset_id text,
  provider_video_id text unique,
  status text not null default 'pending'
    check (status in ('pending','submitting','submitted','finalizing','ready','failed','unknown','deleted')),
  failure_code text,
  bytes integer check (bytes is null or bytes between 1024 and 12000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz,
  deleted_at timestamptz,
  unique (account_id,client_request_id),
  check (status <> 'ready' or (ready_at is not null and bytes is not null and provider_video_id is not null))
);
create index if not exists hh_client_live_photos_owner_idx
  on app_private.client_live_photos_v1(account_id,created_at desc)
  where status <> 'deleted';
alter table app_private.client_live_photos_v1 enable row level security;
alter table app_private.client_live_photos_v1 force row level security;
revoke all on app_private.client_live_photos_v1
  from public,anon,authenticated,hh_app_inbox;
grant select,insert,update,delete on app_private.client_live_photos_v1 to hh_app_backend;
drop policy if exists hh_client_live_photos_owner_v1 on app_private.client_live_photos_v1;
create policy hh_client_live_photos_owner_v1 on app_private.client_live_photos_v1
  for all to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()))
  with check (account_id=(select auth.uid()) and (select app_private.account_active()));
-- Privileged callback path still runs under the *restricted* backend role.
-- It must set the transaction-local worker marker and verify HeyGen by GET.
drop policy if exists hh_client_live_photos_worker_v1 on app_private.client_live_photos_v1;
create policy hh_client_live_photos_worker_v1 on app_private.client_live_photos_v1
  for all to hh_app_backend
  using (current_setting('hh.live_photo_worker',true)='verified')
  with check (current_setting('hh.live_photo_worker',true)='verified');
commit;
