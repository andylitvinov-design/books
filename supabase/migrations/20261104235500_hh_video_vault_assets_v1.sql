-- HH VIDEO VAULT 500. Internal raw-footage inventory; NEVER a YouTube
-- meditation catalog, client media bucket, or public stock mirror.
-- Apply only as part of an authorized release; table is empty at creation.
create table if not exists app.video_vault_assets_v1 (
  asset_id text primary key check (asset_id ~ '^[a-z][a-z0-9-]{2,63}$'),
  source_provider text not null,
  source_asset_id text not null,
  filmed_master_id text not null unique,
  source_url text not null,
  creator text not null,
  license_id text not null,
  license_url text,
  license_evidence text not null,
  attribution_text text not null default '',
  rights_checked_at timestamptz not null,
  commercial_use_ok boolean not null default false,
  derivative_edit_ok boolean not null default false,
  raw_client_delivery_ok boolean not null default false,
  subject_release_status text not null default 'unknown'
    check (subject_release_status in ('cleared','not_applicable','unknown')),
  subject_release_evidence text,
  owner_review_status text not null default 'pending'
    check (owner_review_status in ('pending','approved','rejected')),
  visual_review_score integer not null default 0
    check (visual_review_score between 0 and 5),
  human_reviewer text not null,
  type text not null default 'real_footage' check (type='real_footage'),
  category text not null check(category in ('nature','water','people','heritage','work','relationships')),
  tags text[] not null default '{}',
  goals text[] not null default '{}',
  motifs text[] not null default '{}',
  languages text[] not null default '{}',
  pace text not null check(pace in ('slow','moderate','upbeat')),
  aspect_ratio text not null check(aspect_ratio in ('landscape','portrait')),
  width integer not null check(width in (1920,1080)),
  height integer not null check(height in (1920,1080)),
  fps integer not null check(fps between 24 and 30),
  duration_ms integer not null check(duration_ms between 5000 and 15000),
  codec text not null check(codec='h264'),
  file_bytes bigint not null check(file_bytes between 10000 and 16000000),
  raw_sha256 text not null check(raw_sha256 ~ '^[a-f0-9]{64}$'),
  sha256 text not null unique check(sha256 ~ '^[a-f0-9]{64}$'),
  perceptual_hash text not null check(perceptual_hash ~ '^[a-f0-9]{16}$'),
  r2_bucket text not null,
  r2_object_key text not null unique
    check(r2_object_key ~ '^masters/[a-z][a-z0-9-]{2,63}/[a-f0-9]{64}\.mp4$'),
  poster_object_key text not null
    check(poster_object_key ~ '^posters/[a-z][a-z0-9-]{2,63}/[a-f0-9]{64}\.jpg$'),
  r2_readback_sha256 text not null check(r2_readback_sha256 ~ '^[a-f0-9]{64}$'),
  technical_verified_at timestamptz not null,
  r2_head_checked_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  status text not null default 'generator_eligible'
    check(status in ('discovered','metadata_ready','rights_checked',
      'visual_approved','ingest_approved','normalized','r2_verified',
      'generator_eligible','blocked_source_permission','blocked_cost',
      'blocked_license','blocked_people_release','failed_technical','rejected','retired')),
  rejection_reason text,
  batch_id text not null,
  constraint video_vault_source_unique unique(source_provider,source_asset_id),
  constraint video_vault_source_hash_unique unique(raw_sha256),
  constraint video_vault_ready_proof check (
    status <> 'generator_eligible' or
    (owner_review_status='approved' and visual_review_score>=4 and
     commercial_use_ok and derivative_edit_ok and
     subject_release_status in ('cleared','not_applicable') and
     r2_readback_sha256=sha256 and
     ((width=1920 and height=1080) or (width=1080 and height=1920)))
  )
);
comment on table app.video_vault_assets_v1 is
  'PRIVATE, real physical footage only. No candidate URL, procedural clip, or raw publicly downloadable stock assets. R2 readback/rights required.';
create index if not exists video_vault_ready_filter_idx
 on app.video_vault_assets_v1(status,category,aspect_ratio,pace);
create index if not exists video_vault_tags_idx
 on app.video_vault_assets_v1 using gin(tags);
create index if not exists video_vault_goals_idx
 on app.video_vault_assets_v1 using gin(goals);
create index if not exists video_vault_motifs_idx
 on app.video_vault_assets_v1 using gin(motifs);
alter table app.video_vault_assets_v1 enable row level security;
alter table app.video_vault_assets_v1 force row level security;
revoke all on app.video_vault_assets_v1 from public,anon,authenticated;
grant select,insert on app.video_vault_assets_v1 to hh_app_backend;

-- Current backend application sessions never set this operator-only marker.
-- No client, anon or authenticated grants exist even if app is API-exposed.
drop policy if exists hh_video_vault_ready_read on app.video_vault_assets_v1;
create policy hh_video_vault_ready_read on app.video_vault_assets_v1
 for select to hh_app_backend using (
  status='generator_eligible' and owner_review_status='approved'
  and commercial_use_ok and derivative_edit_ok and visual_review_score>=4
  and r2_readback_sha256=sha256
);
drop policy if exists hh_video_vault_operator_insert on app.video_vault_assets_v1;
create policy hh_video_vault_operator_insert on app.video_vault_assets_v1
 for insert to hh_app_backend with check (
   current_setting('hh.video_vault_ingest',true)='approved'
   and status='generator_eligible' and owner_review_status='approved'
   and r2_readback_sha256=sha256
 );

create table if not exists app.video_vault_asset_events_v1 (
  id bigint generated by default as identity primary key,
  asset_id text not null references app.video_vault_assets_v1(asset_id),
  batch_id text not null,
  actor text not null,
  previous_status text,
  next_status text not null,
  reason text not null,
  source_evidence_uri text,
  sha256 text,
  occurred_at timestamptz not null default now()
);
alter table app.video_vault_asset_events_v1 enable row level security;
alter table app.video_vault_asset_events_v1 force row level security;
revoke all on app.video_vault_asset_events_v1 from public,anon,authenticated;
grant select,insert on app.video_vault_asset_events_v1 to hh_app_backend;
grant usage,select on sequence app.video_vault_asset_events_v1_id_seq to hh_app_backend;
drop policy if exists hh_video_vault_events_read on app.video_vault_asset_events_v1;
create policy hh_video_vault_events_read on app.video_vault_asset_events_v1
 for select to hh_app_backend using (
   current_setting('hh.video_vault_ingest',true)='approved'
 );
drop policy if exists hh_video_vault_events_insert on app.video_vault_asset_events_v1;
create policy hh_video_vault_events_insert on app.video_vault_asset_events_v1
 for insert to hh_app_backend with check (
   current_setting('hh.video_vault_ingest',true)='approved'
 );
