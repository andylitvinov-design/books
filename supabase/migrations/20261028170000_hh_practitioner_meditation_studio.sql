-- Practitioner-guided meditations. This is a private editorial queue, NOT a public video catalog.
-- Files are uploaded only via short-lived, server-minted signed URLs; never via anon storage RLS.
begin;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('hh-practitioner-meditation-drafts','hh-practitioner-meditation-drafts',false,45000000,
 array['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav',
       'video/mp4','video/quicktime','video/webm']::text[])
on conflict (id) do nothing;

create table if not exists app_private.practitioner_meditation_drafts (
 id uuid primary key default gen_random_uuid(),
 practitioner_id uuid not null references app.practitioners(id) on delete cascade,
 owner_auth_user_id uuid not null references app.accounts(id) on delete cascade,
 title text not null default '' check(length(title)<=120),
 description text not null default '' check(length(description)<=600),
 language text not null default 'en' check(language in ('en','ru')),
 kind text not null check(kind in ('audio','video')),
 source_mime text not null check(source_mime in
 ('audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','video/mp4','video/quicktime','video/webm')),
 source_path text not null unique,
 source_bytes integer not null check(source_bytes between 128 and 45000000),
 source_ready boolean not null default false,
 video_mime text check(video_mime in ('video/webm','video/mp4','video/quicktime')),
 video_path text unique,
 video_bytes integer check(video_bytes between 128 and 45000000),
 video_ready boolean not null default false,
 music text not null default 'none' check(music in ('none','harmony','meditation','energy','love','prosperity')),
 scene text not null default 'none' check(scene in ('none','cosmic-flow','dreams','abundance-tree','path-to-goals')),
 mode text not null default 'free' check(mode in ('free','ai_quote','original')),
 rights_confirmed boolean not null default false,
 status text not null default 'draft' check(status in
 ('draft','submitted','changes_requested','approved','uploading','upload_uncertain','uploaded','rejected')),
 review_note text not null default '' check(length(review_note)<=500),
 youtube_video_id text unique check(youtube_video_id is null or youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
 youtube_channel_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 submitted_at timestamptz,
 approved_at timestamptz,
 published_at timestamptz,
 constraint meditation_video_pair check ((video_path is null and video_mime is null and video_bytes is null and not video_ready)
   or (video_path is not null and video_mime is not null and video_bytes is not null)),
 constraint meditation_source_path check(source_path like owner_auth_user_id::text||'/'||id::text||'/source.%'),
 constraint meditation_video_path check(video_path is null or video_path like owner_auth_user_id::text||'/'||id::text||'/video.%'),
 constraint meditation_submission_ready check(status not in
 ('submitted','approved','uploading','upload_uncertain','uploaded') or (source_ready and rights_confirmed and length(title)>0)),
 constraint meditation_uploaded_confirmed check(status<>'uploaded' or
  (youtube_video_id is not null and youtube_channel_id is not null and published_at is not null))
);
create index if not exists practitioner_meditation_owner_idx on app_private.practitioner_meditation_drafts
 (owner_auth_user_id,created_at desc);
create index if not exists practitioner_meditation_queue_idx on app_private.practitioner_meditation_drafts
 (status,submitted_at asc) where status in ('submitted','approved','uploading','upload_uncertain');
alter table app_private.practitioner_meditation_drafts enable row level security;
alter table app_private.practitioner_meditation_drafts force row level security;
revoke all on app_private.practitioner_meditation_drafts from public,anon,authenticated,service_role,hh_app_inbox;
grant select,insert,update on app_private.practitioner_meditation_drafts to hh_app_backend;
drop policy if exists meditation_owner_read on app_private.practitioner_meditation_drafts;
create policy meditation_owner_read on app_private.practitioner_meditation_drafts for select to hh_app_backend
 using ((owner_auth_user_id=(select auth.uid()) and (select app_private.account_active()))
        or current_setting('hh.moderator',true)='1');
drop policy if exists meditation_owner_insert on app_private.practitioner_meditation_drafts;
create policy meditation_owner_insert on app_private.practitioner_meditation_drafts for insert to hh_app_backend
 with check(owner_auth_user_id=(select auth.uid()) and (select app_private.account_active()));
drop policy if exists meditation_owner_update on app_private.practitioner_meditation_drafts;
create policy meditation_owner_update on app_private.practitioner_meditation_drafts for update to hh_app_backend
 using ((owner_auth_user_id=(select auth.uid()) and (select app_private.account_active()))
        or current_setting('hh.moderator',true)='1')
 with check ((owner_auth_user_id=(select auth.uid()) and (select app_private.account_active()))
        or current_setting('hh.moderator',true)='1');
-- The application prevents self-approval even though the DB owner can edit draft fields.
-- Moderation/publishing transitions must go through the admin route with server-side authority.
commit;
