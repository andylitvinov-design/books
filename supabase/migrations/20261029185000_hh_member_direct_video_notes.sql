-- Holistic House native Messenger: private, bounded short video attachments.
-- Additive extension of the existing encrypted-chat / participant-only media pipeline.
-- Keep the bucket PRIVATE, retain the existing 20 MB cap and all RLS policies.
begin;
do $$
begin
  if not exists (
    select 1 from storage.buckets
    where id='hh-member-direct-media' and public is false and file_size_limit=20000000
  ) then
    raise exception 'Member direct-media bucket is absent, public, or over limit';
  end if;
end $$;

alter table app.practitioner_direct_assets
  drop constraint practitioner_direct_assets_kind_check,
  add constraint practitioner_direct_assets_kind_check
    check(kind in ('image','audio','video'));

alter table app.practitioner_direct_assets
  drop constraint practitioner_direct_assets_mime_check,
  add constraint practitioner_direct_assets_mime_check
    check(mime in ('image/jpeg','image/png','image/webp',
      'audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav',
      'video/mp4','video/webm','video/quicktime'));

alter table app.practitioner_direct_assets
  drop constraint practitioner_direct_assets_key,
  add constraint practitioner_direct_assets_key check(
    object_key = uploader_account_id::text || '/' || id::text ||
      case mime when 'image/jpeg' then '.jpg' when 'image/png' then '.png'
        when 'image/webp' then '.webp' when 'audio/mpeg' then '.mp3'
        when 'audio/mp4' then '.m4a' when 'audio/webm' then '.webm'
        when 'audio/ogg' then '.ogg' when 'audio/wav' then '.wav'
        when 'video/mp4' then '.mp4' when 'video/webm' then '.webm'
        when 'video/quicktime' then '.mov'
        else '.invalid' end
  );

update storage.buckets
  set allowed_mime_types = array(
    select distinct mime from unnest(
      coalesce(allowed_mime_types,'{}'::text[]) ||
      array['video/mp4','video/webm','video/quicktime']::text[]
    ) as mime order by mime
  )
  where id='hh-member-direct-media' and public is false and file_size_limit=20000000;
commit;
