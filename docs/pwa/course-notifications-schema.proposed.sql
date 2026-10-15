-- PROPOSAL ONLY. Not an applied migration and deliberately outside supabase/migrations.
-- SUPERSEDED / INACTIVE PR427 DRAFT: do not apply.
-- Canonical notifications use existing app_private tables and dispatcher.
-- See docs/billing/NOTIFICATION-RECONCILIATION.md.
-- Requires explicit owner approval, isolated database tests and least-privilege review.
-- The default ending is ROLLBACK. Do not substitute COMMIT without authorization.
begin;
create table app_private.course_notification_preferences (
  account_id uuid not null references app.accounts(id) on delete cascade,
  environment text not null check(environment in ('sandbox','live')),
  enabled boolean not null default false,
  timezone text not null default 'UTC' check(length(timezone) between 1 and 100),
  locale text not null default 'en' check(locale in ('en','ru','es')),
  daily_at text not null default '10:00' check(daily_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  quiet_hours_enabled boolean not null default true,
  quiet_start text not null default '21:00' check(quiet_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  quiet_end text not null default '09:00' check(quiet_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  updated_at timestamptz not null default now(),
  check(not quiet_hours_enabled or quiet_start <> quiet_end),
  primary key(account_id,environment)
);
create table app_private.course_push_devices (
  id uuid primary key,
  account_id uuid not null references app.accounts(id) on delete cascade,
  environment text not null check(environment in ('sandbox','live')),
  endpoint_hash text unique not null check(endpoint_hash ~ '^[a-f0-9]{64}$'),
  subscription_ciphertext text not null,
  consent_version text not null check(consent_version='course-push-v1'),
  consented_at timestamptz not null,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);
create index course_push_devices_owner_idx on app_private.course_push_devices(account_id);
alter table app_private.course_notification_preferences enable row level security;
alter table app_private.course_notification_preferences force row level security;
alter table app_private.course_push_devices enable row level security;
alter table app_private.course_push_devices force row level security;
revoke all on app_private.course_notification_preferences,app_private.course_push_devices from public,anon,authenticated;
grant select,insert,update,delete on app_private.course_notification_preferences,app_private.course_push_devices to hh_app_backend;
create policy own_course_notification_preferences on app_private.course_notification_preferences for all to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_course_push_devices on app_private.course_push_devices for all to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
-- Enrollment schema only. See separately guarded dispatch proposal for sender schema.
rollback;
