-- Anonymous public-page acquisition aggregates (consent required by API).
-- Counts only: no IP, user/session/cookie IDs, full referrer, query, payload,
-- health data, CRM content, paid click IDs or stored campaign details.
create table if not exists app_private.public_page_source_daily (
  day date not null,
  page_path varchar(140) not null
    check (page_path ~ '^/[a-z0-9/-]*$' and page_path not like '%//%'),
  source varchar(32) not null
    check (source in (
      'direct','google-organic','google-paid','bing-organic',
      'facebook-organic','facebook-paid','instagram-organic','instagram-paid',
      'youtube','telegram','whatsapp','partner','referral','unknown'
    )),
  landings integer not null default 0 check (landings>=0),
  page_views integer not null default 0 check (page_views>=0),
  action_clicks integer not null default 0 check (action_clicks>=0),
  updated_at timestamptz not null default now(),
  primary key(day,page_path,source)
);
create index if not exists public_page_source_daily_page_idx
  on app_private.public_page_source_daily(page_path,day desc);
alter table app_private.public_page_source_daily enable row level security;
alter table app_private.public_page_source_daily force row level security;
revoke all on table app_private.public_page_source_daily
  from public,anon,authenticated,hh_app_inbox;
do $private_stats_roles$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on table app_private.public_page_source_daily from service_role';
  end if;
end $private_stats_roles$;
grant select,insert,update,delete on app_private.public_page_source_daily to hh_app_backend;
create policy public_page_source_backend
  on app_private.public_page_source_daily
  for all to hh_app_backend using (true) with check (true);
-- Query through trusted server endpoints only; never expose via PostgREST.
-- Daily housekeeping removes aggregates older than 90 days.
