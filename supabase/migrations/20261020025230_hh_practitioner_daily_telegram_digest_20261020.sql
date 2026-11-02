-- Applied to Supabase holistichouse on 2026-10-20, migration version 20261020025230.
-- Immutable private owner-digest claims only; no visitor IDs, contact data or message text.
create table if not exists app_private.practitioner_daily_digest_sends (
  practitioner_id uuid not null references app.practitioners(id) on delete cascade,
  report_day date not null,
  status text not null check (status in ('sending','accepted','failed')),
  attempts integer not null default 1 check (attempts between 1 and 10000),
  claim_token uuid not null,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (practitioner_id,report_day)
);
alter table app_private.practitioner_daily_digest_sends enable row level security;
alter table app_private.practitioner_daily_digest_sends force row level security;
revoke all on app_private.practitioner_daily_digest_sends
  from public,anon,authenticated,hh_app_inbox;
do $roles$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.practitioner_daily_digest_sends from service_role';
  end if;
end $roles$;
grant select,insert,update on app_private.practitioner_daily_digest_sends to hh_app_backend;
create policy practitioner_daily_digest_backend
  on app_private.practitioner_daily_digest_sends
  for all to hh_app_backend using (true) with check (true);
