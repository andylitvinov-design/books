-- Client-owned personal video masters. Separate from practitioner session/CRM media.
-- Private schema, no Data API grants; owner RLS even for backend role.
begin;
create table if not exists app_private.personal_videos(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  consent_event_id uuid references app.consent_events(id) on delete set null,
  theme text not null check(theme in ('money','relationships','energy','goals')),
  scene_id text not null check(length(scene_id) between 2 and 64 and scene_id ~ '^[a-z0-9-]+$'),
  aspect text not null check(aspect in ('portrait','square','landscape')),
  duration_seconds integer not null check(duration_seconds in (10,20,30,60)),
  mime text not null default 'video/mp4' check(mime='video/mp4'),
  bytes integer not null check(bytes between 1024 and 12000000),
  object_key text not null unique
    check(object_key ~ '^personal-videos/[a-f0-9-]{36}/[a-f0-9-]{36}/master[.]mp4$'),
  status text not null default 'pending'
    check(status in ('pending','ready','deleting','deleted','failed')),
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  deleted_at timestamptz,
  check((status='ready' and ready_at is not null) or status<>'ready')
);
create index if not exists hh_personal_videos_by_owner
  on app_private.personal_videos(account_id,created_at desc)
  where status in ('pending','ready','deleting');
alter table app_private.personal_videos enable row level security;
revoke all on app_private.personal_videos from public,anon,authenticated,hh_app_inbox;
grant select,insert,update on app_private.personal_videos to hh_app_backend;
drop policy if exists hh_personal_videos_account_only on app_private.personal_videos;
create policy hh_personal_videos_account_only on app_private.personal_videos
  for all to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
-- Personal video masters do NOT become a new public storage bucket or session delivery asset.
-- Their signed upload/read URLs must be issued by authenticated app server only.
commit;
