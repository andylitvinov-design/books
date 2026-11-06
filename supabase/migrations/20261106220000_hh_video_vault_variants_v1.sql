-- HH Video Vault aspect edits. No object uploads or existing master-row changes.
-- Apply only after protected PR checks, operator consent and RLS review.
-- IMPORTANT: 410 private staging previews remain RESEARCH_ONLY until physically
-- R2-verified, legally approved and parent master is generator-eligible.
create table if not exists app.video_vault_variants_v1 (
 variant_id text primary key check (variant_id ~ '^[a-z][a-z0-9-]{2,63}$'),
 master_asset_id text not null references app.video_vault_assets_v1(asset_id) on delete restrict,
 take_index integer not null check (take_index between 1 and 4),
 aspect_ratio text not null check (aspect_ratio in ('landscape','portrait')),
 width integer not null, height integer not null,
 codec text not null default 'h264' check (codec='h264'),
 fps integer not null check (fps between 24 and 30),
 duration_ms integer not null check (duration_ms between 4800 and 16000),
 file_bytes bigint not null check (file_bytes between 10001 and 16000000),
 sha256 text not null unique check (sha256 ~ '^[a-f0-9]{64}$'),
 r2_readback_sha256 text not null check (r2_readback_sha256 ~ '^[a-f0-9]{64}$'),
 r2_bucket text not null,
 r2_object_key text not null unique
  check (r2_object_key ~ '^masters/[a-z][a-z0-9-]{2,63}/[a-f0-9]{64}\.mp4$'),
 poster_object_key text not null
  check (poster_object_key ~ '^posters/[a-z][a-z0-9-]{2,63}/[a-f0-9]{64}\.jpg$'),
 technical_verified_at timestamptz,
 r2_head_checked_at timestamptz,
 owner_review_status text not null default 'pending'
  check (owner_review_status in ('pending','approved','rejected')),
 visual_review_score integer not null default 0 check (visual_review_score between 0 and 5),
 human_reviewer text not null check (char_length(btrim(human_reviewer)) between 3 and 180),
 owner_approved_at timestamptz,
 raw_client_delivery_ok boolean not null default false,
 status text not null default 'pending'
  check (status in ('pending','r2_verified','generator_eligible','retired')),
 batch_id text not null,
 created_at timestamptz not null default now(),
 constraint hh_video_vault_variant_take_aspect_unique
  unique (master_asset_id,take_index,aspect_ratio),
 constraint hh_video_vault_variant_object_identity check (
  r2_object_key='masters/'||variant_id||'/'||sha256||'.mp4' and
  poster_object_key='posters/'||variant_id||'/'||sha256||'.jpg'
 ),
 constraint hh_video_vault_variant_geometry_valid check (
  (aspect_ratio='landscape' and
   ((width=1280 and height=720) or (width=1920 and height=1080))) or
  (aspect_ratio='portrait' and
   ((width=720 and height=1280) or (width=1080 and height=1920)))
 ),
 constraint hh_video_vault_variant_ready_evidence check (
  status<>'generator_eligible' or
  (owner_review_status='approved' and visual_review_score>=4
   and raw_client_delivery_ok and sha256=r2_readback_sha256
   and owner_approved_at is not null
   and technical_verified_at is not null and r2_head_checked_at is not null)
 )
);
comment on table app.video_vault_variants_v1 is
 'PRIVATE derivative MP4 variants/takes; never an independent filmed original, no automatic CC0/PD/subject rights.';
create index if not exists hh_video_vault_variant_ready_idx
 on app.video_vault_variants_v1(master_asset_id,aspect_ratio,status);
alter table app.video_vault_variants_v1 enable row level security;
alter table app.video_vault_variants_v1 force row level security;
revoke all on app.video_vault_variants_v1 from public,anon,authenticated;
grant select,insert on app.video_vault_variants_v1 to hh_app_backend;
drop policy if exists hh_video_vault_variant_ready_read on app.video_vault_variants_v1;
create policy hh_video_vault_variant_ready_read on app.video_vault_variants_v1
 for select to hh_app_backend using (
   status='generator_eligible' and owner_review_status='approved'
   and visual_review_score>=4 and raw_client_delivery_ok
   and owner_approved_at is not null
   and sha256=r2_readback_sha256
   and exists (
    select 1 from app.video_vault_assets_v1 m
    where m.asset_id=master_asset_id
      and m.status='generator_eligible'
      and m.owner_review_status='approved'
      and m.commercial_use_ok and m.derivative_edit_ok
      and m.raw_client_delivery_ok and m.r2_bucket=video_vault_variants_v1.r2_bucket
   )
 );
drop policy if exists hh_video_vault_variant_operator_insert on app.video_vault_variants_v1;
create policy hh_video_vault_variant_operator_insert on app.video_vault_variants_v1
 for insert to hh_app_backend with check (
   current_setting('hh.video_vault_ingest',true)='approved'
   and status='generator_eligible'
   and owner_review_status='approved'
   and visual_review_score>=4 and raw_client_delivery_ok
   and owner_approved_at is not null
   and sha256=r2_readback_sha256
   and exists (
    select 1 from app.video_vault_assets_v1 m
    where m.asset_id=master_asset_id
      and m.status='generator_eligible'
      and m.owner_review_status='approved'
      and m.commercial_use_ok and m.derivative_edit_ok
      and m.raw_client_delivery_ok and m.r2_bucket=video_vault_variants_v1.r2_bucket
   )
 );
