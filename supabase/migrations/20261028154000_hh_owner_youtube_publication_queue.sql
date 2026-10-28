-- Owner's Russian YouTube publishing queue for explicitly permissioned promotional media.
-- Third-party practitioner videos enter only with the creator's per-video consent.
-- The actual provider publication requires separate authenticated owner approval.
-- No client-session media, anonymous direct reads, or new Google credentials.
create table if not exists app_private.youtube_owner_publication_requests (
 id uuid primary key default gen_random_uuid(),
 source_type text not null check(source_type in ('owner_material','practitioner_presentation')),
 source_id uuid not null,
 practitioner_id uuid references app.practitioners(id) on delete restrict,
 source_owner_auth_user_id uuid,
 title text not null check(length(title) between 1 and 100),
 mime text not null check(mime in ('video/mp4','video/quicktime','video/webm')),
 expected_bytes bigint not null check(expected_bytes between 1024 and 50000000),
 state text not null default 'requested'
   check(state in ('requested','approved','publishing','uncertain','uploaded','declined')),
 creator_consented_at timestamptz not null,
 owner_approved_at timestamptz,
 youtube_video_id text check(youtube_video_id is null or
   youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
 error_code text check(error_code is null or length(error_code)<=80),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(source_type,source_id),
 constraint youtube_owner_request_author_check check (
   (source_type='owner_material' and practitioner_id is null and
    source_owner_auth_user_id is null) or
   (source_type='practitioner_presentation' and practitioner_id is not null and
    source_owner_auth_user_id is not null)
 )
);
create index if not exists hh_youtube_owner_request_state
 on app_private.youtube_owner_publication_requests(state,created_at);
alter table app_private.youtube_owner_publication_requests enable row level security;
alter table app_private.youtube_owner_publication_requests force row level security;
revoke all on app_private.youtube_owner_publication_requests
 from public,anon,authenticated,hh_app_inbox;
do $roles$ begin
 if exists(select 1 from pg_roles where rolname='service_role') then
   execute 'revoke all on app_private.youtube_owner_publication_requests from service_role';
 end if;
end $roles$;
grant select,insert,update on app_private.youtube_owner_publication_requests to hh_app_backend;
drop policy if exists hh_youtube_owner_request_backend
 on app_private.youtube_owner_publication_requests;
create policy hh_youtube_owner_request_backend
 on app_private.youtube_owner_publication_requests
 for all to hh_app_backend
 using(current_setting('hh.youtube_publication_manager',true)='1')
 with check(current_setting('hh.youtube_publication_manager',true)='1');

-- The existing practitioner-presentation table is owner-only. Allow a narrowly
-- scoped moderator read of a creator-consented asset, never a bulk listing.
-- Direct anon/authenticated access and existing owner-only policy stay unchanged.
drop policy if exists hh_youtube_owner_consented_presentation
 on app_private.practitioner_presentation_uploads;
create policy hh_youtube_owner_consented_presentation
 on app_private.practitioner_presentation_uploads
 for select to hh_app_backend
 using(
   current_setting('hh.youtube_publication_manager',true)='1' and
   exists(
     select 1 from app_private.youtube_owner_publication_requests r
     where r.source_type='practitioner_presentation'
       and r.source_id=practitioner_presentation_uploads.id
       and r.source_owner_auth_user_id=owner_auth_user_id
       and r.state in ('requested','approved','publishing','uncertain','uploaded')
   )
 );
