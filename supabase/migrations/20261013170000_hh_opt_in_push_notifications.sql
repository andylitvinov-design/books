-- Consent-only, account-owned Web Push. No private result or health text stored.
-- Apply on approved HH Supabase BEFORE deploying endpoints.
begin;
create table app_private.notification_preferences(
  account_id uuid primary key references app.accounts(id) on delete cascade,
  enabled boolean not null default false,
  course_reminders boolean not null default true,
  reminder_hour smallint not null default 19 check(reminder_hour between 8 and 21),
  time_zone text not null default 'UTC' check(char_length(time_zone) between 1 and 90),
  locale text not null default 'en' check(locale in('en','ru')),
  updated_at timestamptz not null default now()
);
create table app_private.push_subscriptions(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  endpoint_hash text not null unique check(endpoint_hash~'^[0-9a-f]{64}$'),
  endpoint text not null check(char_length(endpoint) between 20 and 2048),
  p256dh text not null,
  auth_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_subscription_owner on app_private.push_subscriptions(account_id);
revoke all on table app_private.notification_preferences,app_private.push_subscriptions from public,anon,authenticated,hh_app_inbox;
grant select,insert,update,delete on table app_private.notification_preferences,app_private.push_subscriptions to hh_app_backend;
alter table app_private.notification_preferences enable row level security;
alter table app_private.push_subscriptions enable row level security;
create policy notification_prefs_owner on app_private.notification_preferences for all to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy push_subscriptions_owner on app_private.push_subscriptions for all to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
