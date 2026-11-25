-- Applied to Holistic House production Supabase, version 20261020124443.
-- Private Council archive delivery receipts only. No bot token or client data.
create table if not exists app_private.council_telegram_deliveries (
  report_day date primary key,
  archive_comment_id bigint not null,
  status text not null check(status in ('sending','accepted','failed')),
  claim_token uuid not null,
  attempts integer not null default 1 check(attempts between 1 and 10000),
  claimed_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table app_private.council_telegram_deliveries enable row level security;
alter table app_private.council_telegram_deliveries force row level security;
revoke all on app_private.council_telegram_deliveries
  from public, anon, authenticated, hh_app_inbox;
do $roles$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.council_telegram_deliveries from service_role';
  end if;
end $roles$;
grant select,insert,update on app_private.council_telegram_deliveries to hh_app_backend;
create policy council_telegram_backend
  on app_private.council_telegram_deliveries
  for all to hh_app_backend using (true) with check (true);
