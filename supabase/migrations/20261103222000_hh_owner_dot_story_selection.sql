-- Add plot selection to the EXISTING owner-private Dot video job.
-- No new role, exposed schema, bot, storage bucket, API or paid worker.
-- Deploy migration before enabling the story callback path.
alter table app_private.telegram_owner_video_jobs
  add column if not exists video_mode text not null default 'slideshow'
    check (video_mode in ('slideshow','story')),
  add column if not exists story_session text
    check (story_session is null or story_session ~ '^[a-f0-9]{12}$'),
  add column if not exists story_revision integer not null default 0
    check (story_revision between 0 and 1679615),
  add column if not exists story_selection jsonb not null default '{}'::jsonb
    check (jsonb_typeof(story_selection)='object' and
      length(story_selection::text)<2048),
  add column if not exists story_taxonomy_version text
    check (story_taxonomy_version is null or
      length(story_taxonomy_version) between 1 and 96);
-- Retain existing owner-only RLS and the trusted hh.owner_video_manager
-- transaction guard. Public/anon/authenticated users get NO row access.
alter table app_private.telegram_owner_video_jobs enable row level security;
alter table app_private.telegram_owner_video_jobs force row level security;
revoke all on app_private.telegram_owner_video_jobs from public, anon, authenticated;
