-- Master Network listing publication: keep public data as a moderated, immutable snapshot.
-- Draft data remains in service_offerings.draft_copy until an administrator approves.
alter table app.service_offerings
  add column if not exists display_locales jsonb not null default '["en","ru"]'::jsonb,
  add column if not exists photos jsonb not null default '[]'::jsonb,
  add column if not exists contact_channels jsonb not null default '{}'::jsonb;

alter table app.service_offerings drop constraint if exists service_offerings_display_locales_check;
alter table app.service_offerings add constraint service_offerings_display_locales_check
  check (jsonb_typeof(display_locales)='array'
    and jsonb_array_length(display_locales) between 1 and 3
    and display_locales <@ '["en","ru","es"]'::jsonb);
alter table app.service_offerings drop constraint if exists service_offerings_photos_check;
alter table app.service_offerings add constraint service_offerings_photos_check
  check (jsonb_typeof(photos)='array' and jsonb_array_length(photos)<=5);
alter table app.service_offerings drop constraint if exists service_offerings_contact_channels_check;
alter table app.service_offerings add constraint service_offerings_contact_channels_check
  check (jsonb_typeof(contact_channels)='object');
create index if not exists service_offerings_display_locales_idx
  on app.service_offerings using gin(display_locales);

-- Public marketing pictures ONLY. Never reuse the confidential client delivery bucket.
-- Images are normalized to JPEG without EXIF on the server, capped at 2.5 MB.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hh-service-photos','hh-service-photos',true,2500000,array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists hh_service_photos_practitioner_insert on storage.objects;
create policy hh_service_photos_practitioner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id='hh-service-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}[.]jpg$'
  and exists (
    select 1 from app.practitioners p
    where p.trusted_auth_user_id=(select auth.uid())
    and p.status not in ('suspended','rejected','archived')
  )
);
-- No overwrite/delete/list policy: photos are opaque immutable upload keys.
-- Public reads are served by the public Storage bucket; no privileged key in browsers.
