-- Holistic Intelligence Learning Observatory v1.
-- No transcripts, names, account identifiers, prompts, message IDs, IPs, secrets or timestamps per person.
begin;
create table app_private.hi_learning_quality_daily (
  day date not null,
  channel text not null check (channel in ('messenger','services','my_coach','telegram')),
  locale text not null check (locale in ('ru','en','es')),
  signal text not null check (signal in
    ('helpful','unhelpful','correction','no_advice','topic_change','unresolved','order_completed','order_failed')),
  algorithm_version text not null check (
    algorithm_version in ('hi-messenger-router-mixed-v1','hi-services-router-mixed-v1',
      'hi-my-coach-external-model-unattributed-v1','hi-telegram-business-script-v1')),
  event_count bigint not null default 0 check (event_count >= 0),
  refreshed_at timestamptz not null default now(),
  primary key (day,channel,locale,signal,algorithm_version)
);
revoke all on app_private.hi_learning_quality_daily
  from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant select,insert,update on app_private.hi_learning_quality_daily to hh_app_backend;
alter table app_private.hi_learning_quality_daily enable row level security;
alter table app_private.hi_learning_quality_daily force row level security;
create policy hi_learning_daily_read on app_private.hi_learning_quality_daily
  for select to hh_app_backend using (true);
create policy hi_learning_daily_insert on app_private.hi_learning_quality_daily
  for insert to hh_app_backend with check (true);
create policy hi_learning_daily_update on app_private.hi_learning_quality_daily
  for update to hh_app_backend using (true) with check (true);
comment on table app_private.hi_learning_quality_daily is
 'Explicitly volunteered anonymous daily counts only. Algorithm cohorts do not assert the model used for an individual answer. Access only via owner-vetted server endpoints.';

create table app_private.hi_learning_release_decisions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  candidate_version text not null check (candidate_version ~ '^hh-native-intent-(ru|en)-research-v[0-9]+-[a-z0-9-]+$'),
  baseline_version text not null,
  evaluation_sha256 text not null check (evaluation_sha256 ~ '^[a-f0-9]{64}$'),
  decision text not null check (decision in ('blocked','eligible_for_review','protected_merged','live_verified','rolled_back')),
  pr_number integer check (pr_number is null or pr_number > 0),
  deployment_sha text check (deployment_sha is null or deployment_sha ~ '^[a-f0-9]{40}$'),
  note_code text check (note_code is null or note_code in
    ('no_improvement','ru_regression','en_regression','es_regression',
     'safety_regression','coverage_missing','human_review','live_smoke')),
  unique (candidate_version,evaluation_sha256,decision)
);
revoke all on app_private.hi_learning_release_decisions
  from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant select on app_private.hi_learning_release_decisions to hh_app_backend;
alter table app_private.hi_learning_release_decisions enable row level security;
alter table app_private.hi_learning_release_decisions force row level security;
create policy hi_learning_release_owner_read on app_private.hi_learning_release_decisions
  for select to hh_app_backend using (true);
comment on table app_private.hi_learning_release_decisions is
 'Owner-controlled, verifiable, non-automatic release receipts. Never populated from chat or client feedback. Existing protected merge/deploy remains authoritative.';
commit;
