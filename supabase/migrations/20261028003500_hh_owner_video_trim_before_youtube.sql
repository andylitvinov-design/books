-- Existing owner-only Dot video job: non-destructive reviewed start trim.
-- Original MP4 in telegram_owner_video_drafts is immutable and still private.
-- Keep FORCE RLS, existing backend-only policy and zero new direct grants.
alter table app_private.telegram_owner_video_jobs
 add column if not exists source_seconds integer not null default 0
   check(source_seconds between 0 and 1800),
 add column if not exists trim_start_seconds integer not null default 0
   check(trim_start_seconds between 0 and 1799);

-- Existing completed previews predate source_seconds. Their trusted server
-- title has the form 'Видео · N фото · N аудио · N сек'.
update app_private.telegram_owner_video_jobs
 set source_seconds=least(1800,coalesce(
   (regexp_match(title,'· ([0-9]{1,4}) сек$'))[1]::integer,0))
 where source_seconds=0 and title ~ '· [0-9]{1,4} сек$';

alter table app_private.telegram_owner_video_jobs
 drop constraint if exists telegram_owner_video_jobs_state_check;
alter table app_private.telegram_owner_video_jobs
 add constraint telegram_owner_video_jobs_state_check
 check(state in ('collecting','rendering','trimming','preview','publishing',
                 'uploaded','failed','cancelled','uncertain'));

alter table app_private.telegram_owner_video_jobs
 drop constraint if exists telegram_owner_video_jobs_storage_path_check;
alter table app_private.telegram_owner_video_jobs
 add constraint telegram_owner_video_jobs_storage_path_check
 check(storage_path is null or storage_path ~
   '^telegram-slides/[0-9a-f-]{36}([.]mp4|-cut-[0-9a-f-]{36}[.]mp4)$');

-- The untrimmed original stays under the original strict drafts-table path.
alter table app_private.telegram_owner_video_jobs enable row level security;
alter table app_private.telegram_owner_video_jobs force row level security;
