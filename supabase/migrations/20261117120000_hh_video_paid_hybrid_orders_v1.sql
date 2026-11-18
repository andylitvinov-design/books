-- 30-second hybrid orders: extend the existing video_generation_jobs, never replace
-- prior HeyGen data. No credit/paid launch is enabled by this migration.
begin;
create table app_private.video_paid_orders_v1(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  operation_id uuid not null,
  tier text not null check(tier in ('extra','pro')),
  theme text not null check(theme in ('energy','money','relationships','goals','life','health')),
  locale text not null check(locale in ('ru','en','es')),
  aspect_ratio text not null check(aspect_ratio in ('16:9','9:16')),
  price_eur_minor integer not null,
  ai_seconds integer not null,
  library_seconds integer not null,
  provider_budget_usd_cents integer not null,
  status text not null default 'requested'
    check(status in ('requested','payment_verified','generating','qa_pending','delivered','cancelled')),
  receipt_digest text unique check(receipt_digest is null or receipt_digest~'^[a-f0-9]{64}$'),
  verified_at timestamptz,
  reviewer_id uuid references app.accounts(id),
  final_video_id uuid references app_private.personal_videos(id),
  qa_manifest_sha256 text check(qa_manifest_sha256 is null or qa_manifest_sha256~'^[a-f0-9]{64}$'),
  qa_at timestamptz,
  revision integer not null default 0 check(revision between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,operation_id),
  check((tier='extra' and price_eur_minor=300 and ai_seconds=6 and library_seconds=24 and provider_budget_usd_cents=30)
    or (tier='pro' and price_eur_minor=500 and ai_seconds=12 and library_seconds=18 and provider_budget_usd_cents=60)),
  check((status='requested' and receipt_digest is null and verified_at is null and reviewer_id is null)
    or status='cancelled'
    or (status in ('payment_verified','generating','qa_pending','delivered')
      and receipt_digest is not null and verified_at is not null and reviewer_id is not null)),
  check((status='delivered' and final_video_id is not null and qa_at is not null and qa_manifest_sha256 is not null)
    or (status<>'delivered' and final_video_id is null and qa_at is null and qa_manifest_sha256 is null))
);
create index video_paid_orders_account_idx on app_private.video_paid_orders_v1(account_id,created_at desc);
create index video_paid_orders_review_idx on app_private.video_paid_orders_v1(status,created_at desc);
alter table app_private.video_paid_orders_v1 enable row level security;
alter table app_private.video_paid_orders_v1 force row level security;
revoke all on app_private.video_paid_orders_v1 from public,anon,authenticated,service_role,hh_app_inbox,hh_app_backend;
grant select,insert on app_private.video_paid_orders_v1 to hh_app_backend;
grant update(status,receipt_digest,verified_at,reviewer_id,final_video_id,qa_manifest_sha256,qa_at,revision,updated_at)
  on app_private.video_paid_orders_v1 to hh_app_backend;
create policy video_paid_order_read on app_private.video_paid_orders_v1 for select to hh_app_backend
  using(account_id=(select auth.uid()) or current_setting('hh.moderator',true)='1');
create policy video_paid_order_insert on app_private.video_paid_orders_v1 for insert to hh_app_backend
  with check(account_id=(select auth.uid()) and (select app_private.account_active()) and status='requested');
create policy video_paid_order_admin_change on app_private.video_paid_orders_v1 for update to hh_app_backend
  using(current_setting('hh.moderator',true)='1')
  with check(current_setting('hh.moderator',true)='1');

-- A hybrid shot is keyed to its order, not a legacy one-use HeyGen code.
alter table app_private.video_generation_jobs alter column code_id drop not null;
alter table app_private.video_generation_jobs
  add column paid_order_id uuid references app_private.video_paid_orders_v1(id),
  add column shot_index integer check(shot_index between 1 and 5),
  add column provider_asset_ref text check(provider_asset_ref is null or
    provider_asset_ref~'^gs://[a-z0-9][a-z0-9._-]{2,62}/[a-zA-Z0-9/_-]+[.]mp4$');
alter table app_private.video_generation_jobs drop constraint video_generation_jobs_model_check;
alter table app_private.video_generation_jobs add constraint video_generation_jobs_model_check
  check(model in ('heygen-video-1','heygen/heygen-video-1','veo-3.1-lite-generate-001'));
alter table app_private.video_generation_jobs drop constraint video_generation_jobs_tier_check;
alter table app_private.video_generation_jobs add constraint video_generation_jobs_tier_check
  check(tier in ('smart','pro','extra'));
alter table app_private.video_generation_jobs drop constraint video_generation_jobs_external_id_check;
alter table app_private.video_generation_jobs add constraint video_generation_jobs_external_id_check
  check(external_id is null or length(external_id) between 8 and 512);
alter table app_private.video_generation_jobs add constraint video_generation_jobs_source_exclusive
  check((code_id is not null and paid_order_id is null and shot_index is null) or
    (code_id is null and paid_order_id is not null and shot_index is not null
     and model='veo-3.1-lite-generate-001' and estimate_cents=30 and limit_cents=30));
create unique index video_generation_paid_shot_unique on app_private.video_generation_jobs(paid_order_id,shot_index)
  where paid_order_id is not null;
grant update(provider_asset_ref) on app_private.video_generation_jobs to hh_app_backend;
create policy hh_video_paid_job_moderator on app_private.video_generation_jobs for all to hh_app_backend
  using(current_setting('hh.moderator',true)='1')
  with check(current_setting('hh.moderator',true)='1');
create function app_private.video_paid_job_update_guard() returns trigger
 language plpgsql security invoker set search_path='' as $$
begin
 if old.paid_order_id is not null then
  if current_setting('hh.moderator',true) is distinct from '1' or
    row(new.id,new.code_id,new.paid_order_id,new.shot_index,new.owner_id,new.tier,new.request_hash,
      new.model,new.estimate_cents,new.limit_cents,new.created_at) is distinct from
    row(old.id,old.code_id,old.paid_order_id,old.shot_index,old.owner_id,old.tier,old.request_hash,
      old.model,old.estimate_cents,old.limit_cents,old.created_at)
  then raise exception 'VIDEO_PAID_JOB_IMMUTABLE' using errcode='23514'; end if;
 end if;
 return new;
end $$;
create function app_private.video_paid_job_insert_guard() returns trigger
 language plpgsql security invoker set search_path='' as $$
begin
 if new.paid_order_id is not null and
    current_setting('hh.moderator',true) is distinct from '1'
 then raise exception 'VIDEO_PAID_JOB_NOT_AUTHORIZED' using errcode='42501'; end if;
 return new;
end $$;
create trigger video_paid_job_insert before insert on app_private.video_generation_jobs
 for each row execute function app_private.video_paid_job_insert_guard();
revoke execute on function app_private.video_paid_job_insert_guard() from public,anon,authenticated,service_role;
grant execute on function app_private.video_paid_job_insert_guard() to hh_app_backend;
create trigger video_paid_job_update before update on app_private.video_generation_jobs
 for each row execute function app_private.video_paid_job_update_guard();
revoke execute on function app_private.video_paid_job_update_guard() from public,anon,authenticated,service_role;
grant execute on function app_private.video_paid_job_update_guard() to hh_app_backend;
-- Scope moderator read to ONE approved QA order and ONE target video ID, never all client videos.
create policy hh_video_paid_qa_exact_asset_read on app_private.personal_videos
 for select to hh_app_backend using (
   current_setting('hh.moderator',true)='1'
   and id=nullif(current_setting('hh.video_paid_qa_video_id',true),'')::uuid
   and exists (
     select 1 from app_private.video_paid_orders_v1 paid
     where paid.id=nullif(current_setting('hh.video_paid_qa_order_id',true),'')::uuid
       and paid.account_id=personal_videos.account_id
       and paid.status='qa_pending'
   )
 );
commit;
