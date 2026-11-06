-- Add AFTER 20261030233000_hh_xp_rewards_and_video_reservations.sql.
-- Idempotent 1300 starter and 300 non-rollover monthly credits.
-- Zero new services, checkout rails, cron or client-granted privileges.
create table app_private.xp_plan_grants (
  account_id uuid not null references app.accounts(id) on delete cascade,
  grant_key text not null,
  kind text not null check(kind in ('starter','monthly')),
  period_start date,
  points integer not null,
  created_at timestamptz not null default now(),
  primary key(account_id,grant_key),
  constraint xp_plan_grant_fixed check(
    (kind='starter' and grant_key='starter'
      and period_start is null and points=1300) or
    (kind='monthly' and period_start is not null and points=300 and
      grant_key=('monthly:'||to_char(period_start,'YYYY-MM')))
  )
);
create index xp_plan_grants_account_date
  on app_private.xp_plan_grants(account_id,created_at desc);
create table app_private.xp_monthly_spends (
  account_id uuid not null,
  operation_id uuid not null,
  period_start date not null,
  points integer not null check(points between 1 and 300),
  created_at timestamptz not null default now(),
  primary key(account_id,operation_id),
  foreign key(account_id,operation_id)
    references app_private.xp_charges(account_id,operation_id)
);
create index xp_monthly_spends_period
  on app_private.xp_monthly_spends(account_id,period_start);
alter table app_private.xp_plan_grants enable row level security;
alter table app_private.xp_plan_grants force row level security;
alter table app_private.xp_monthly_spends enable row level security;
alter table app_private.xp_monthly_spends force row level security;
revoke all on app_private.xp_plan_grants,app_private.xp_monthly_spends
  from public,anon,authenticated,service_role,hh_app_inbox,hh_app_backend;
grant select,insert on app_private.xp_plan_grants,app_private.xp_monthly_spends
  to hh_app_backend;
create policy xp_plan_read on app_private.xp_plan_grants for select
  to hh_app_backend using(account_id=(select auth.uid()));
create policy xp_plan_insert on app_private.xp_plan_grants for insert
  to hh_app_backend with check(
    account_id=(select auth.uid())
    and (select app_private.account_active())
    and current_setting('hh.xp_plan_grant',true)='1'
    and (kind='starter' or
      (kind='monthly' and
        period_start=date_trunc('month',timezone('UTC',now()))::date
        and exists (
          select 1 from app_private.xp_plan_grants g
          where g.account_id=(select auth.uid()) and g.grant_key='starter'
            and g.created_at<
              (date_trunc('month',timezone('UTC',now())) at time zone 'UTC')
        )))
  );
create policy xp_month_spend_read on app_private.xp_monthly_spends
  for select to hh_app_backend
  using(account_id=(select auth.uid()));
create policy xp_month_spend_insert on app_private.xp_monthly_spends
  for insert to hh_app_backend
  with check(account_id=(select auth.uid())
    and (select app_private.account_active())
    and period_start=date_trunc('month',timezone('UTC',now()))::date);
create trigger xp_plan_immutable before update or delete
  on app_private.xp_plan_grants for each row
  execute function app_private.xp_immutable_guard();
create trigger xp_monthly_spend_immutable before update or delete
  on app_private.xp_monthly_spends for each row
  execute function app_private.xp_immutable_guard();
