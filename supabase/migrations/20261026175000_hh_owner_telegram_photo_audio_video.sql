-- Owner-only Telegram photos + audio -> private MP4 draft -> RU YouTube.
-- No public/authenticated direct table access. Existing client conversations stay separate.
create table if not exists app_private.telegram_owner_video_jobs (
  practitioner_id uuid primary key references app.practitioners(id) on delete cascade,
  job_id uuid not null default gen_random_uuid(),
  state text not null default 'collecting'
    check(state in ('collecting','rendering','preview','publishing','uploaded','failed','cancelled','uncertain')),
  started_update_id bigint not null check(started_update_id>=0),
  last_update_id bigint not null check(last_update_id>=started_update_id),
  items jsonb not null default '[]'::jsonb
    check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=10),
  expires_at timestamptz not null,
  title text not null default 'Видео из Telegram' check(length(title) between 1 and 100),
  storage_path text check(storage_path is null or
    storage_path ~ '^telegram-slides/[0-9a-f-]{36}\.mp4$'),
  video_bytes integer check(video_bytes is null or video_bytes between 1024 and 50000000),
  youtube_video_id text check(youtube_video_id is null or youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  error_code text check(error_code is null or length(error_code)<=80),
  processing_started_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table app_private.telegram_owner_video_jobs enable row level security;
alter table app_private.telegram_owner_video_jobs force row level security;
revoke all on app_private.telegram_owner_video_jobs from public, anon, authenticated, hh_app_inbox;
do $roles$ begin
 if exists(select 1 from pg_roles where rolname='service_role') then
   execute 'revoke all on app_private.telegram_owner_video_jobs from service_role';
 end if;
end $roles$;
grant select, insert, update on app_private.telegram_owner_video_jobs to hh_app_backend;
drop policy if exists telegram_owner_video_backend on app_private.telegram_owner_video_jobs;
create policy telegram_owner_video_backend on app_private.telegram_owner_video_jobs
 for all to hh_app_backend
 using(current_setting('hh.owner_video_manager',true)='1')
 with check(current_setting('hh.owner_video_manager',true)='1');

-- Refresh tokens are AES-256-GCM sealed with existing HH app encryption key.
-- The bot never reads a browser access token or another practitioner's tokens.
create table if not exists app_private.telegram_owner_video_oauth (
  practitioner_id uuid primary key references app.practitioners(id) on delete cascade,
  channel_id text not null check(channel_id='UCjWq6NHZTQkUr3bC3WbXXcw'),
  token_ciphertext text not null check(length(token_ciphertext) between 80 and 8192),
  updated_at timestamptz not null default now()
);
alter table app_private.telegram_owner_video_oauth enable row level security;
alter table app_private.telegram_owner_video_oauth force row level security;
revoke all on app_private.telegram_owner_video_oauth from public, anon, authenticated, hh_app_inbox;
do $roles$ begin
 if exists(select 1 from pg_roles where rolname='service_role') then
   execute 'revoke all on app_private.telegram_owner_video_oauth from service_role';
 end if;
end $roles$;
grant select, insert, update, delete on app_private.telegram_owner_video_oauth to hh_app_backend;
drop policy if exists telegram_owner_video_oauth_backend on app_private.telegram_owner_video_oauth;
create policy telegram_owner_video_oauth_backend on app_private.telegram_owner_video_oauth
 for all to hh_app_backend
 using(current_setting('hh.owner_video_manager',true)='1')
 with check(current_setting('hh.owner_video_manager',true)='1');

-- Durable private drafts, never public or Unlisted storage for client recordings.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hh-owner-video-drafts','hh-owner-video-drafts',false,50000000,array['video/mp4']::text[])
on conflict(id) do nothing;
