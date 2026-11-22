begin;

alter table app_private.personal_videos
  add column upload_fingerprint text check (upload_fingerprint ~ '^[a-f0-9]{64}$'),
  add column upload_checkpoint text;

-- Scoped by the existing owner RLS. The checkpoint is encrypted by the app.
create unique index hh_personal_video_active_fingerprint
  on app_private.personal_videos (account_id, upload_fingerprint)
  where upload_fingerprint is not null and status in ('pending','ready','deleting');

commit;
