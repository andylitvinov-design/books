-- Extend the existing verified-owner Dot video workflow to choose RU/EN YouTube.
-- Migration is additive to jobs and preserves any RU encrypted grants.
-- Never expose credentials or the media ledger to anon/authenticated/CRM.
alter table app_private.telegram_owner_video_jobs
  add column if not exists youtube_target text;
alter table app_private.telegram_owner_video_jobs
  drop constraint if exists telegram_owner_video_jobs_youtube_target_check;
alter table app_private.telegram_owner_video_jobs
  add constraint telegram_owner_video_jobs_youtube_target_check
  check (youtube_target is null or youtube_target in ('ru','en'));

-- A single verified owner may authorize each separate Google channel once.
-- Existing RU grant, if present, remains RU. No token is decrypted/replaced here.
alter table app_private.telegram_owner_video_oauth
  add column if not exists target text not null default 'ru';
alter table app_private.telegram_owner_video_oauth
  drop constraint if exists telegram_owner_video_oauth_target_check;
alter table app_private.telegram_owner_video_oauth
  add constraint telegram_owner_video_oauth_target_check
  check(target in ('ru','en'));
alter table app_private.telegram_owner_video_oauth
  drop constraint if exists telegram_owner_video_oauth_channel_id_check;
alter table app_private.telegram_owner_video_oauth
  add constraint telegram_owner_video_oauth_channel_id_check
  check((target='ru' and channel_id='UCjWq6NHZTQkUr3bC3WbXXcw')
    or (target='en' and channel_id ~ '^UC[A-Za-z0-9_-]{22}$'));
alter table app_private.telegram_owner_video_oauth
  drop constraint if exists telegram_owner_video_oauth_pkey;
alter table app_private.telegram_owner_video_oauth
  add constraint telegram_owner_video_oauth_pkey primary key(practitioner_id,target);

alter table app_private.telegram_owner_video_jobs enable row level security;
alter table app_private.telegram_owner_video_jobs force row level security;
alter table app_private.telegram_owner_video_oauth enable row level security;
alter table app_private.telegram_owner_video_oauth force row level security;
