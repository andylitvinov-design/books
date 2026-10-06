-- Durable, server-owned multi-instrument plans. No focus/filter/visual state is stored here.
begin;

create table app_private.assessment_plans(
  id uuid primary key default gen_random_uuid(),
  account_id uuid references app.accounts(id) on delete cascade,
  guest_session_id uuid references app_private.guest_sessions(id) on delete cascade,
  status text not null default 'active' check(status in ('active','completed','cancelled')),
  definition_ids uuid[] not null,
  completed_run_ids uuid[] not null default '{}',
  current_index integer not null default 0 check(current_index >= 0),
  revision integer not null default 0 check(revision >= 0),
  operation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,
  check ((account_id is null) <> (guest_session_id is null)),
  check (cardinality(definition_ids) between 1 and 12),
  check (cardinality(completed_run_ids) <= cardinality(definition_ids)),
  check (current_index <= cardinality(definition_ids))
);

create unique index assessment_plans_account_operation
  on app_private.assessment_plans(account_id,operation_id)
  where account_id is not null;
create unique index assessment_plans_guest_operation
  on app_private.assessment_plans(guest_session_id,operation_id)
  where guest_session_id is not null;
create unique index assessment_plans_one_active_account
  on app_private.assessment_plans(account_id)
  where account_id is not null and status='active';
create unique index assessment_plans_one_active_guest
  on app_private.assessment_plans(guest_session_id)
  where guest_session_id is not null and status='active';
create index assessment_plans_account_active
  on app_private.assessment_plans(account_id,updated_at desc)
  where account_id is not null and status='active';
create index assessment_plans_guest_active
  on app_private.assessment_plans(guest_session_id,updated_at desc)
  where guest_session_id is not null and status='active';

revoke all on table app_private.assessment_plans from public, anon, authenticated, hh_app_inbox;
grant select, insert, update on table app_private.assessment_plans to hh_app_backend;

commit;
