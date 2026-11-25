-- Production applied and read back via Supabase migration 20261027174939.
-- Backwards-compatible expansion: up to 15 photos plus 15 audio items per owner job.
-- No auth, FORCE RLS, owner policies, storage, or existing data are changed.
alter table app_private.telegram_owner_video_jobs
  drop constraint telegram_owner_video_jobs_items_check,
  add constraint telegram_owner_video_jobs_items_check
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 30);
