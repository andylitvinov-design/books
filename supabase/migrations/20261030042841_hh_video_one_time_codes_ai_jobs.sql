-- Only site backend (not anon/authenticated/service_role) may access these
-- payment codes. No provider call or financial charge is triggered by DDL.
begin;
create table app_private.video_generation_codes (
  id uuid primary key,
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  tier text not null check (tier in ('smart','pro')),
  kind text not null check (kind in ('paid','gift')),
  payment_channel text not null check (payment_channel in ('square','paypal','wise','gift')),
  payment_reference text,
  price_cents integer not null check (price_cents in (0,200,990)),
  owner_verified_at timestamptz not null,
  issued_by uuid not null references app.accounts(id),
  gift_recipient_id uuid references app.accounts(id),
  status text not null default 'issued' check(status in ('issued','claimed','revoked')),
  claimed_by uuid references app.accounts(id),
  claimed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint hh_video_code_payment_integrity check (
    (kind='paid' and payment_channel<>'gift' and payment_reference is not null
      and length(payment_reference)>=6 and gift_recipient_id is null
      and ((tier='smart' and price_cents=200) or (tier='pro' and price_cents=990)))
    or
    (kind='gift' and tier='smart' and payment_channel='gift'
      and payment_reference is null and price_cents=0 and gift_recipient_id is not null)
  ),
  constraint hh_video_code_claim_integrity check (
    (status='issued' and claimed_by is null and claimed_at is null)
    or (status='claimed' and claimed_by is not null and claimed_at is not null)
    or status='revoked'
  )
);
create unique index hh_video_code_paid_receipt_unique
 on app_private.video_generation_codes(payment_channel,payment_reference) where kind='paid';
create unique index hh_video_code_first_gift_unique
 on app_private.video_generation_codes(gift_recipient_id) where kind='gift';
create index hh_video_code_expire on app_private.video_generation_codes(expires_at);

create table app_private.video_generation_jobs (
  id uuid primary key,
  code_id uuid not null unique references app_private.video_generation_codes(id),
  owner_id uuid not null references app.accounts(id),
  tier text not null check(tier in ('smart','pro')),
  request_hash text not null check(request_hash ~ '^[0-9a-f]{64}$'),
  model text not null check(model='heygen/heygen-video-1'),
  estimate_cents integer not null check(estimate_cents>0 and estimate_cents<=500),
  limit_cents integer not null check(limit_cents>0 and limit_cents<=550),
  external_id text unique check(external_id is null or length(external_id) between 8 and 128),
  status text not null default 'submitting'
    check(status in ('submitting','pending','in_progress','completed','failed','cancelled','expired','unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index hh_video_job_owner_recent
  on app_private.video_generation_jobs(owner_id,created_at desc,id);

alter table app_private.video_generation_codes enable row level security;
alter table app_private.video_generation_codes force row level security;
alter table app_private.video_generation_jobs enable row level security;
alter table app_private.video_generation_jobs force row level security;

revoke all on app_private.video_generation_codes
  from public,anon,authenticated,service_role,hh_app_backend,hh_app_inbox;
revoke all on app_private.video_generation_jobs
  from public,anon,authenticated,service_role,hh_app_backend,hh_app_inbox;
grant select,insert on app_private.video_generation_codes to hh_app_backend;
grant update(status,claimed_by,claimed_at) on app_private.video_generation_codes to hh_app_backend;
grant select,insert on app_private.video_generation_jobs to hh_app_backend;
grant update(external_id,status,updated_at,completed_at)
  on app_private.video_generation_jobs to hh_app_backend;

create policy hh_video_codes_backend_only on app_private.video_generation_codes
  for all to hh_app_backend
  using((select auth.uid()) is not null)
  with check((select auth.uid()) is not null);
create policy hh_video_jobs_backend_only on app_private.video_generation_jobs
  for all to hh_app_backend
  using(owner_id=(select auth.uid()))
  with check(owner_id=(select auth.uid()));
commit;