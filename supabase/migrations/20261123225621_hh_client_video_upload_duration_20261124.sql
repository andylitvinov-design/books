-- Client uploads may have any whole-second duration up to the existing
-- one-minute limit. Keep every saved video, byte quota, grant and RLS policy.
begin;

alter table app_private.personal_videos
  drop constraint personal_videos_duration_seconds_check;

alter table app_private.personal_videos
  add constraint personal_videos_duration_seconds_check
  check (duration_seconds between 1 and 60) not valid;

alter table app_private.personal_videos
  validate constraint personal_videos_duration_seconds_check;

commit;
