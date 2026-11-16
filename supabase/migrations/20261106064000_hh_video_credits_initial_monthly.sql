-- Holistic House video credits: 1300 non-expiring at first active access;
-- 300 per subsequent UTC calendar month; no external funds or cron.
-- IMPORTANT: deploy only after protected, tested release approval.
create table app_private.video_credit_grants (
  account_id uuid not null references app.accounts(id) on delete cascade,
  grant_key text not null,
  kind text not null check (kind in ('starter','monthly')),
  period_start date,
  credits integer not null,
  created_at timestamptz not null default now(),
  primary key (account_id, grant_key),
  constraint video_credit_grant_fixed check (
    (kind='starter' and grant_key='starter' and credits=1300 and period_start is null) or
    (kind='monthly' and period_start is not null and credits=300 and
      grant_key='monthly:'||to_char(period_start,'YYYY-MM'))
  )
);
create index video_credit_grant_account_date on app_private.video_credit_grants(account_id, created_at desc);
create table app_private.video_credit_charges (
  account_id uuid not null references app.accounts(id) on delete cascade,
  operation_id uuid not null,
  credits integer not null default 10 check(credits=10),
  monthly_used integer not null check(monthly_used between 0 and 10),
  starter_used integer not null check(starter_used between 0 and 10),
  monthly_period date,
  status text not null default 'held' check(status in ('held','completed','released')),
  artifact_bytes integer,
  expires_at timestamptz not null default(now()+interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(account_id,operation_id),
  constraint video_credit_spend_breakdown check(
    starter_used+monthly_used=credits and
    ((monthly_used=0 and monthly_period is null) or
     (monthly_used>0 and monthly_period is not null)) and
    ((status='completed' and artifact_bytes>=1024) or
     (status<>'completed' and artifact_bytes is null))
  )
);
create index video_credit_charge_account_date on app_private.video_credit_charges(account_id,created_at desc);
create index video_credit_charge_expiry on app_private.video_credit_charges(expires_at) where status='held';

alter table app_private.video_credit_grants enable row level security;
alter table app_private.video_credit_grants force row level security;
alter table app_private.video_credit_charges enable row level security;
alter table app_private.video_credit_charges force row level security;
revoke all on app_private.video_credit_grants,app_private.video_credit_charges
  from public,anon,authenticated,service_role,hh_app_inbox,hh_app_backend;
grant select,insert on app_private.video_credit_grants,app_private.video_credit_charges
  to hh_app_backend;
grant update(status,updated_at,artifact_bytes) on app_private.video_credit_charges
  to hh_app_backend;

create policy video_credit_grants_read on app_private.video_credit_grants for select
  to hh_app_backend using(account_id=(select auth.uid()));
create policy video_credit_grants_create on app_private.video_credit_grants for insert
  to hh_app_backend with check(
    account_id=(select auth.uid()) and (select app_private.account_active()) and
    (kind='starter' or (kind='monthly' and
       period_start=date_trunc('month',timezone('UTC',now()))::date))
  );
-- Do not query video_credit_grants from its own INSERT RLS policy:
-- PostgreSQL 17 detects policy recursion, even on starter INSERT.
-- A SECURITY INVOKER trigger can query the owner-scoped SELECT policy safely.
create function app_private.video_credit_grant_due_guard() returns trigger
  language plpgsql security invoker set search_path='' as $$
begin
  if new.kind='monthly' and not exists(
    select 1 from app_private.video_credit_grants g
    where g.account_id=new.account_id and g.grant_key='starter'
      and g.created_at<
        (date_trunc('month',timezone('UTC',now())) at time zone 'UTC')
  ) then
    raise exception 'VIDEO_CREDITS_MONTHLY_NOT_DUE' using errcode='23514';
  end if;
  return new;
end $$;
create trigger video_credit_grant_due before insert on app_private.video_credit_grants
  for each row execute function app_private.video_credit_grant_due_guard();
revoke execute on function app_private.video_credit_grant_due_guard() from public,anon,authenticated;
grant execute on function app_private.video_credit_grant_due_guard() to hh_app_backend;
create policy video_credit_charges_read on app_private.video_credit_charges for select
  to hh_app_backend using(account_id=(select auth.uid()));
create policy video_credit_charges_create on app_private.video_credit_charges for insert
  to hh_app_backend with check(
    account_id=(select auth.uid()) and (select app_private.account_active()) and
    status='held' and monthly_period is not distinct from
      (case when monthly_used>0 then date_trunc('month',timezone('UTC',now()))::date else null end)
  );
create policy video_credit_charges_change on app_private.video_credit_charges for update
  to hh_app_backend
  using(account_id=(select auth.uid()) and status='held')
  with check(account_id=(select auth.uid()) and status in ('completed','released'));
create function app_private.video_credit_immutable_guard() returns trigger
  language plpgsql security invoker set search_path='' as $$
begin
  raise exception 'VIDEO_CREDIT_IMMUTABLE';
end $$;
-- No explicit DELETE trigger: GDPR/account deletion must cascade under the
-- existing app.accounts FK. Backend lacks DELETE privilege, so ordinary
-- client/service ledger tampering remains denied. Administrative deletion
-- requires the separately approved account-deletion process.
create trigger video_credit_grant_immutable before update
  on app_private.video_credit_grants for each row
  execute function app_private.video_credit_immutable_guard();

create function app_private.video_credit_charge_transition_guard() returns trigger
  language plpgsql security invoker set search_path='' as $$
begin
  if old.status<>'held' or new.status not in ('completed','released') or
    row(new.account_id,new.operation_id,new.credits,new.monthly_used,new.starter_used,
        new.monthly_period,new.expires_at,new.created_at)
      is distinct from
    row(old.account_id,old.operation_id,old.credits,old.monthly_used,old.starter_used,
        old.monthly_period,old.expires_at,old.created_at)
    or new.updated_at<old.updated_at
    or (new.status='completed' and (new.artifact_bytes is null or new.artifact_bytes<1024))
    or (new.status='released' and new.artifact_bytes is not null)
  then
    raise exception 'VIDEO_CREDIT_CHARGE_IMMUTABLE';
  end if;
  return new;
end $$;
create trigger video_credit_charge_transition before update
  on app_private.video_credit_charges for each row
  execute function app_private.video_credit_charge_transition_guard();
revoke execute on function app_private.video_credit_immutable_guard() from public,anon,authenticated;
revoke execute on function app_private.video_credit_charge_transition_guard() from public,anon,authenticated;
