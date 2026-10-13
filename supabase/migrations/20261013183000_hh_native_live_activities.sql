-- Opted-in native ActivityKit APNs tokens, scoped to an actual account-owned cycle.
-- No clinical data on Lock Screen; tokens never exposed through PostgREST.
begin;
create table app_private.live_activity_tokens(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  cycle_id uuid not null,
  activity_id text not null unique check(char_length(activity_id) between 8 and 160),
  token_hash text not null unique check(token_hash~'^[0-9a-f]{64}$'),
  push_token text not null check(push_token~'^[0-9a-f]{64}$'),
  locale text not null check(locale in ('en','ru')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(cycle_id,account_id) references app_private.growth_cycles(id,account_id) on delete cascade
);
create index live_activity_tokens_owner_cycle on app_private.live_activity_tokens(account_id,cycle_id);
revoke all on table app_private.live_activity_tokens from public,anon,authenticated,hh_app_inbox;
grant select,insert,update,delete on table app_private.live_activity_tokens to hh_app_backend;
alter table app_private.live_activity_tokens enable row level security;
create policy live_activity_owner on app_private.live_activity_tokens for all to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
