-- Opt-in learning for the public Home guide. No visitor text, health data, 
-- identifiers, IPs, transcripts or account references are stored here.
-- All operations are server only through the existing restricted hh_app_backend.
create table if not exists app_private.home_guide_quality_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  category text not null check (category in ('energy','love','business','courses','site','other')),
  locale text not null check (locale in ('en','ru','es')),
  signal text not null check (signal in ('clarified','unresolved','helpful','unhelpful'))
);
create index if not exists idx_home_guide_quality_events_created
  on app_private.home_guide_quality_events (created_at desc);

create table if not exists app_private.home_guide_quality_daily (
  report_day date not null,
  category text not null check (category in ('energy','love','business','courses','site','other')),
  locale text not null check (locale in ('en','ru','es')),
  signal text not null check (signal in ('clarified','unresolved','helpful','unhelpful')),
  event_count integer not null check (event_count between 1 and 100000000),
  refreshed_at timestamptz not null default now(),
  primary key (report_day, category, locale, signal)
);

alter table app_private.home_guide_quality_events enable row level security;
alter table app_private.home_guide_quality_events force row level security;
alter table app_private.home_guide_quality_daily enable row level security;
alter table app_private.home_guide_quality_daily force row level security;

revoke all on app_private.home_guide_quality_events from public, anon, authenticated, service_role, hh_app_inbox;
revoke all on app_private.home_guide_quality_daily from public, anon, authenticated, service_role, hh_app_inbox;
grant select, insert, delete on app_private.home_guide_quality_events to hh_app_backend;
grant select, insert, update, delete on app_private.home_guide_quality_daily to hh_app_backend;
grant usage on sequence app_private.home_guide_quality_events_id_seq to hh_app_backend;
revoke all on sequence app_private.home_guide_quality_events_id_seq from public, anon, authenticated, service_role, hh_app_inbox;

create policy home_guide_quality_events_backend on app_private.home_guide_quality_events
  for all to hh_app_backend using (true) with check (true);
create policy home_guide_quality_daily_backend on app_private.home_guide_quality_daily
  for all to hh_app_backend using (true) with check (true);

comment on table app_private.home_guide_quality_events is
  'Temporary, opt-in, structured public guide usability feedback; no visitor free text, device identifiers or medical data; retained 14 days.';
comment on table app_private.home_guide_quality_daily is
  'Coarse daily category counts for safe clarification ordering; retained 60 days; at least 5 samples needed for public use.';
