-- 2026-10-17: apply once to project holistichouse (shervdixkaxurnaecioe).
-- The canonical migration is recorded in Supabase's migration history.
-- Only daily counts per public service, NO visitor details, IPs or free text.
create table if not exists app_private.service_funnel_daily (
  service_id uuid not null references app.service_offerings(id) on delete cascade,
  day date not null,
  impressions integer not null default 0 check(impressions>=0),
  order_clicks integer not null default 0 check(order_clicks>=0),
  whatsapp_clicks integer not null default 0 check(whatsapp_clicks>=0),
  telegram_clicks integer not null default 0 check(telegram_clicks>=0),
  updated_at timestamptz not null default now(),
  primary key(service_id,day)
);
alter table app_private.service_funnel_daily enable row level security;
alter table app_private.service_funnel_daily force row level security;
revoke all on app_private.service_funnel_daily from public,anon,authenticated,hh_app_inbox;
do $funnel_roles$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.service_funnel_daily from service_role';
  end if;
end $funnel_roles$;
grant select,insert,update on app_private.service_funnel_daily to hh_app_backend;
create policy service_funnel_backend on app_private.service_funnel_daily
  for all to hh_app_backend using (true) with check (true);
-- Public APIs only accept published service UUIDs; authenticated My Practice
-- reads join to service_offerings with s.practitioner_id=ownedPractitioner.id.
-- Week: previous 7 complete dates by America/Toronto.
