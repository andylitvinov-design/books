-- Add owner-only per-video YouTube title/description and short-lived
-- confirmation stage to the existing private Dot job, no new table or grants.
-- This is NOT public media or a general YouTube edit capability.
alter table app_private.telegram_owner_video_jobs
  add column if not exists youtube_title text
    check(youtube_title is null or
      (length(youtube_title) between 1 and 100 and
       youtube_title !~ '[<>]' and
       youtube_title !~ '[[:cntrl:]]')),
  add column if not exists youtube_description text
    check(youtube_description is null or
      (length(youtube_description)<=3000 and
       octet_length(youtube_description)<=4800 and
       youtube_description !~ '[<>]')),
  add column if not exists metadata_edit_field text
    check(metadata_edit_field is null or metadata_edit_field in ('title','description')),
  add column if not exists metadata_edit_value text
    check(metadata_edit_value is null or
      (length(metadata_edit_value)<=3000 and
       octet_length(metadata_edit_value)<=4800 and
       metadata_edit_value !~ '[<>]')),
  add column if not exists metadata_edit_nonce text
    check(metadata_edit_nonce is null or metadata_edit_nonce ~ '^[a-f0-9]{14}$'),
  add column if not exists metadata_edit_state text
    check(metadata_edit_state is null or metadata_edit_state in ('pending','applying','uncertain')),
  add column if not exists metadata_edit_expires_at timestamptz;
alter table app_private.telegram_owner_video_jobs
  add constraint hh_dot_youtube_metadata_draft_complete
  check (
    (metadata_edit_nonce is null and metadata_edit_field is null and
      metadata_edit_value is null and metadata_edit_state is null and
      metadata_edit_expires_at is null)
    or
    (metadata_edit_nonce is not null and metadata_edit_field is not null and
      metadata_edit_value is not null and metadata_edit_state is not null and
      metadata_edit_expires_at is not null)
  );
-- Retain the existing FORCE RLS and current manager policy.
alter table app_private.telegram_owner_video_jobs enable row level security;
alter table app_private.telegram_owner_video_jobs force row level security;
