-- Additive release preparation for HeyGen v3 Video 1 direct provider.
-- Does NOT enable generation, move existing client content or publish media.
begin;
alter table app_private.video_generation_jobs
  drop constraint video_generation_jobs_model_check;
alter table app_private.video_generation_jobs
  add constraint video_generation_jobs_model_check
  check(model in ('heygen-video-1','heygen/heygen-video-1'));
alter table app_private.video_generation_jobs
  add column if not exists storage_state text not null default 'none'
    check(storage_state in ('none','uploading','ready','failed')),
  add column if not exists storage_path text
    check(storage_path is null or
     storage_path ~ '^ai-videos/[a-f0-9-]{36}/[a-f0-9-]{36}/master[.]mp4$'),
  add column if not exists asset_bytes integer
    check(asset_bytes is null or asset_bytes between 1024 and 25000000),
  add column if not exists asset_sha256 text
    check(asset_sha256 is null or asset_sha256 ~ '^[0-9a-f]{64}$'),
  add column if not exists stored_at timestamptz;
create unique index if not exists video_generation_jobs_asset_unique
  on app_private.video_generation_jobs(storage_path)
  where storage_path is not null;
grant update(storage_state,storage_path,asset_bytes,asset_sha256,stored_at)
  on app_private.video_generation_jobs to hh_app_backend;
commit;