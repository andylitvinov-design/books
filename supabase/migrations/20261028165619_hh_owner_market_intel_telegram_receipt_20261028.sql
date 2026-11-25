-- Separate private owner-only receipt for the 14:00 market intelligence report.
-- The owner-approved analysis stays in existing GitHub #242; only delivery
-- metadata is stored here. No PII, Telegram tokens or report body.
create table if not exists app_private.owner_daily_market_intelligence_sends (
  report_day date primary key,
  archive_comment_id bigint not null check(archive_comment_id > 0),
  status text not null check(status in ('sending','accepted','failed')),
  claim_token uuid not null,
  attempts integer not null default 1 check(attempts between 1 and 20),
  claimed_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table app_private.owner_daily_market_intelligence_sends enable row level security;
alter table app_private.owner_daily_market_intelligence_sends force row level security;
revoke all on table app_private.owner_daily_market_intelligence_sends
  from public,anon,authenticated,service_role;
grant select,insert,update on table app_private.owner_daily_market_intelligence_sends to hh_app_backend;
drop policy if exists owner_daily_market_intelligence_sends_backend
  on app_private.owner_daily_market_intelligence_sends;
create policy owner_daily_market_intelligence_sends_backend
  on app_private.owner_daily_market_intelligence_sends
  for all to hh_app_backend using (true) with check (true);
