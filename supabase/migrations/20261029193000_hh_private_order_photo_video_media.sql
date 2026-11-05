-- Authenticated Holistic House order conversations: private photo and short video
-- in the EXISTING participant-only, encrypted-message media pipeline.
-- Existing RLS/FORCE, hh_app_backend grants, message idempotency and 20 MB limit remain.
begin;
do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id='hh-member-direct-media' and public is false and file_size_limit=20000000
  ) then
    raise exception 'Private member media bucket configuration is unsafe';
  end if;
end $$;

alter table app.practitioner_request_media
  drop constraint practitioner_request_media_mime_check,
  add constraint practitioner_request_media_mime_check check(mime in (
    'audio/mp4','audio/webm','audio/ogg','audio/wav','audio/mpeg',
    'image/jpeg','image/png','image/webp',
    'video/mp4','video/webm','video/quicktime'
  ));

update storage.buckets
set allowed_mime_types=array(
  select distinct m from unnest(
    coalesce(allowed_mime_types,'{}'::text[]) ||
    array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']::text[]
  ) as m order by m
)
where id='hh-member-direct-media' and public is false and file_size_limit=20000000;
commit;
