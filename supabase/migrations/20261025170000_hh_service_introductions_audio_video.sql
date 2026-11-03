-- Permits short public practitioner service introductions from cameras, microphones
-- and iPhone/Android media uploads. No private client bucket or RLS changes.
update storage.buckets
  set allowed_mime_types=ARRAY[
    'video/mp4','video/quicktime','video/webm',
    'audio/mp4','audio/mpeg','audio/webm'
  ]::text[]
  where id='hh-practitioner-presentations' and public=true;

alter table app_private.practitioner_presentation_uploads
  drop constraint if exists practitioner_presentation_uploads_mime_check;
alter table app_private.practitioner_presentation_uploads
  add constraint practitioner_presentation_uploads_mime_check
  check (mime in ('video/mp4','video/quicktime','video/webm','audio/mp4','audio/mpeg','audio/webm'));

alter table app_private.practitioner_presentation_uploads
  drop constraint if exists practitioner_presentation_path_check;
alter table app_private.practitioner_presentation_uploads
  add constraint practitioner_presentation_path_check
  check (
    object_key=owner_auth_user_id::text||'/'||id::text||
      case mime
        when 'video/mp4' then '.mp4'
        when 'video/quicktime' then '.mov'
        when 'video/webm' then '.webm'
        when 'audio/mp4' then '.m4a'
        when 'audio/mpeg' then '.mp3'
        when 'audio/webm' then '.webm'
        else '.invalid'
      end
  );
