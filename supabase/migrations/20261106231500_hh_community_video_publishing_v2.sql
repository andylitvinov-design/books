-- Community video publishing V2: NO PUBLIC MEDIA BUCKET, NO AUTO-UPLOAD.
-- This migration must be reviewed and applied separately after protected merge.
-- Account/privacy erasure: source-video deletion must cascade to publication
-- metadata; RESTRICT here would block deletion of the owner's account.
-- Live YouTube uploads remain disabled until provider takedown-on-erasure exists.
begin;

create table app_private.community_video_authors (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  public_slug uuid not null unique default gen_random_uuid(),
  display_name text not null check(length(display_name) between 1 and 100),
  public_profile_consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app_private.community_video_publications (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references app.accounts(id) on delete cascade,
  source_video_id uuid not null unique references app_private.personal_videos(id) on delete cascade,
  source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
  source_bytes integer not null check(source_bytes between 1024 and 12000000),
  source_mime text not null default 'video/mp4' check(source_mime='video/mp4'),
  source_aspect text not null check(source_aspect in ('portrait','square','landscape')),
  source_duration_seconds integer not null check(source_duration_seconds between 10 and 60),
  source_kind text not null default 'personal_video' check(source_kind='personal_video'),
  branding_variant text not null default 'not_verified'
    check(branding_variant in ('not_verified','free_watermarked','pro_clear')),
  branding_verified_at timestamptz,
  branding_verified_by uuid,
  title text not null check(length(title) between 1 and 100),
  description text not null check(length(description)<=5000),
  author_display_name text not null check(length(author_display_name) between 1 and 100),
  author_profile_url text not null check(length(author_profile_url)<=300),
  audio_language text not null check(audio_language in ('en','ru','es')),
  visibility text not null default 'link_only' check(visibility in ('link_only','public_catalog')),
  contains_synthetic_media boolean not null,
  made_for_kids text not null check(made_for_kids in ('yes','no','needs_review')),
  metadata_hash text not null check(metadata_hash ~ '^[a-f0-9]{64}$'),
  consent_policy_version text not null check(consent_policy_version='hh-community-youtube-v2'),
  rights_confirmed_at timestamptz not null,
  privacy_reviewed_at timestamptz not null,
  youtube_consent_at timestamptz not null,
  catalog_consent_at timestamptz,
  moderation_state text not null default 'pending'
    check(moderation_state in ('pending','approved','rejected','withdrawn')),
  moderation_decided_at timestamptz,
  moderation_decided_by uuid,
  moderation_reason text,
  provider_state text not null default 'none'
    check(provider_state in ('none','claimed','initiating','sending','uncertain','processing','processed','manual_review','takedown_pending','takedown_confirmed')),
  youtube_channel_id text check(youtube_channel_id is null or youtube_channel_id ~ '^UC[A-Za-z0-9_-]{22}$'),
  youtube_video_id text unique check(youtube_video_id is null or youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  youtube_privacy_readback text,
  youtube_upload_status_readback text,
  youtube_confirmed_at timestamptz,
  site_hidden_at timestamptz,
  takedown_requested_at timestamptz,
  takedown_confirmed_at timestamptz,
  last_error_code text,
  version integer not null default 1 check(version>0),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((visibility='link_only' and catalog_consent_at is null) or
         (visibility='public_catalog' and catalog_consent_at is not null)),
  check (provider_state<>'processed' or
    (youtube_video_id is not null and youtube_channel_id is not null and
     youtube_confirmed_at is not null and youtube_privacy_readback='unlisted' and
     youtube_upload_status_readback='processed')),
  check(takedown_confirmed_at is null or takedown_requested_at is not null)
);
create index hh_community_publications_by_owner on app_private.community_video_publications
 (owner_account_id,requested_at desc);
create index hh_community_publications_queue on app_private.community_video_publications
 (moderation_state,provider_state,requested_at);
create index hh_community_public_projection on app_private.community_video_publications
 (youtube_confirmed_at desc) where moderation_state='approved' and provider_state='processed'
 and visibility='public_catalog' and catalog_consent_at is not null and site_hidden_at is null;

create table app_private.community_video_upload_attempts (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null unique references app_private.community_video_publications(id) on delete cascade,
  source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
  session_ciphertext text,
  google_receipt_video_id text check(google_receipt_video_id is null or google_receipt_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  bytes_sent integer not null default 0 check(bytes_sent>=0),
  state text not null default 'claimed' check(state in ('claimed','initiating','session_created','sending','uncertain','processing','processed','manual_review')),
  claimed_at timestamptz not null default now(),
  last_checked_at timestamptz,
  created_by uuid,
  closed_at timestamptz
);

create table app_private.community_youtube_oauth (
  channel_id text primary key check(channel_id ~ '^UC[A-Za-z0-9_-]{22}$'),
  encrypted_refresh_token text not null,
  scopes text[] not null,
  created_at timestamptz not null default now(),
  connected_by uuid,
  revoked_at timestamptz
);

create table app_private.community_video_audit (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid references app_private.community_video_publications(id) on delete cascade,
  action text not null check(length(action) between 3 and 90),
  actor_account_id uuid,
  previous_state text,
  next_state text,
  created_at timestamptz not null default now()
);

-- All five private tables are inaccessible via Supabase's anonymous/user Data API.
-- Manager context is set only by authenticated admin routes or dedicated server-only
-- public projection. Never expose this PostgreSQL role or connection client-side.
do $$
declare t text;
begin
 foreach t in array array['community_video_authors','community_video_publications',
   'community_video_upload_attempts','community_youtube_oauth','community_video_audit'] loop
  execute format('alter table app_private.%I enable row level security',t);
  execute format('alter table app_private.%I force row level security',t);
  execute format('revoke all on app_private.%I from public,anon,authenticated,hh_app_inbox',t);
  execute format('grant select,insert,update on app_private.%I to hh_app_backend',t);
  execute format('create policy community_manager on app_private.%I for all to hh_app_backend using (current_setting(''hh.community_video_manager'',true)=''1'') with check (current_setting(''hh.community_video_manager'',true)=''1'')',t);
 end loop;
end $$;

create policy community_author_own_select on app_private.community_video_authors
 for select to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy community_author_own_insert on app_private.community_video_authors
 for insert to hh_app_backend
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy community_publication_own_select on app_private.community_video_publications
 for select to hh_app_backend
 using(owner_account_id=(select auth.uid()) and (select app_private.account_active()));
create policy community_publication_own_insert on app_private.community_video_publications
 for insert to hh_app_backend
 with check(owner_account_id=(select auth.uid()) and (select app_private.account_active()));
-- The existing owner-protected source MP4 must remain readable to the single
-- authenticated owner-admin and the server-only public projection. This policy
-- applies only to SELECT; no new storage Data API grants are created.
create policy hh_personal_videos_community_review_read on app_private.personal_videos
 for select to hh_app_backend
 using(current_setting('hh.community_video_manager',true)='1');

-- No UPDATE permission through owner RLS: all transitions are server-CAS with manager flag.
-- Existing source is protected separately by its own account-only RLS.
commit;
