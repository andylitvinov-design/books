-- Multi-course support: preserve legacy owner-scoped journals and cycles.
-- Billing is server-owned; no client can edit entitlements or raw Stripe fields.
begin;
alter table app_private.growth_courses drop constraint if exists growth_courses_account_id_key;
alter table app_private.growth_courses drop constraint if exists growth_courses_status_check;
alter table app_private.growth_courses add constraint growth_courses_status_check
  check (status in ('active','paused','completed','archived','locked'));
alter table app_private.growth_courses
  add column if not exists is_primary boolean not null default false,
  add column if not exists finished_at timestamptz;
-- Locked courses are read-only but keep encrypted notes and progress for resubscription.
-- Previously finished cycles did not mark their parent courses as completed.
update app_private.growth_courses c set status='completed',finished_at=coalesce(
  (select max(finished_at) from app_private.growth_cycles v where v.course_id=c.id and v.status='completed'), now())
where c.stage=4 and not exists (
  select 1 from app_private.growth_cycles v where v.course_id=c.id and v.status in ('active','paused')
) and exists (select 1 from app_private.growth_cycles v where v.course_id=c.id and v.status='completed');
update app_private.growth_courses set is_primary=true where status in ('active','paused');
create unique index if not exists growth_courses_one_active_primary
  on app_private.growth_courses(account_id) where is_primary and status in ('active','paused');
create index if not exists growth_courses_active_owner
  on app_private.growth_courses(account_id,updated_at desc) where status in ('active','paused');
-- Every course has its own independently running 14-day cycle.
drop index if exists app_private.growth_one_current_cycle;
create unique index if not exists growth_one_current_cycle_per_course
  on app_private.growth_cycles(course_id) where status in ('active','paused');

create table if not exists app_private.course_billing (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','start','advanced','premium')),
  stripe_status text not null default 'inactive',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_event_created bigint not null default 0,
  updated_at timestamptz not null default now()
);
revoke all on app_private.course_billing from public,anon,authenticated,hh_app_inbox;
grant select,insert,update on app_private.course_billing to hh_app_backend;
alter table app_private.course_billing enable row level security;
create policy course_billing_owner_read on app_private.course_billing
  for select to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy course_billing_owner_insert on app_private.course_billing
  for insert to hh_app_backend
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy course_billing_owner_update on app_private.course_billing
  for update to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));

create table if not exists app_private.course_billing_events (
  event_id text primary key,
  account_id uuid not null references app.accounts(id) on delete cascade,
  event_type text not null,
  event_created bigint not null,
  received_at timestamptz not null default now()
);
revoke all on app_private.course_billing_events from public,anon,authenticated,hh_app_inbox;
grant select,insert on app_private.course_billing_events to hh_app_backend;
alter table app_private.course_billing_events enable row level security;
create policy course_billing_events_owner_read on app_private.course_billing_events
  for select to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy course_billing_events_owner_insert on app_private.course_billing_events
  for insert to hh_app_backend
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
