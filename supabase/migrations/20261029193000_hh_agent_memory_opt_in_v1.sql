-- Holistic Mind v3: only explicit, owner-scoped, encrypted AI conversational
-- preferences. NEVER store raw conversations, source test scores, health or CRM
-- data in this table. Empty until the user consents in the UI.
-- Source-only migration until reviewed on an isolated database. 
begin;

create table if not exists app_private.agent_memory_consent (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  accepted boolean not null default false,
  policy_version text not null default 'hh-agent-memory-v1'
    check(policy_version = 'hh-agent-memory-v1'),
  updated_at timestamptz not null default now()
);

create table if not exists app_private.agent_memory_item (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  kind text not null check(kind in (
    'preferred_name','communication_style','response_length',
    'avoid_format','personal_accent'
  )),
  value_ciphertext text not null check(length(value_ciphertext) between 8 and 2500),
  policy_version text not null default 'hh-agent-memory-v1'
    check(policy_version = 'hh-agent-memory-v1'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,kind)
);
create index if not exists agent_memory_item_owner_idx
  on app_private.agent_memory_item(account_id,updated_at desc);

-- Server-authenticated application operations only. Client Data API roles
-- cannot SELECT any ciphertext, much less cleartext.
revoke all on app_private.agent_memory_item from public,anon,authenticated;
revoke all on app_private.agent_memory_consent from public,anon,authenticated;
grant select,insert,update,delete on app_private.agent_memory_item to hh_app_backend;
grant select,insert,update,delete on app_private.agent_memory_consent to hh_app_backend;

alter table app_private.agent_memory_item enable row level security;
alter table app_private.agent_memory_item force row level security;
alter table app_private.agent_memory_consent enable row level security;
alter table app_private.agent_memory_consent force row level security;

create policy agent_memory_item_owner_select on app_private.agent_memory_item
  for select to hh_app_backend using (
    account_id = (select auth.uid()) and (select app_private.account_active())
  );
create policy agent_memory_item_owner_insert on app_private.agent_memory_item
  for insert to hh_app_backend with check (
    account_id = (select auth.uid()) and (select app_private.account_active())
  );
create policy agent_memory_item_owner_update on app_private.agent_memory_item
  for update to hh_app_backend using (
    account_id = (select auth.uid()) and (select app_private.account_active())
  ) with check (
    account_id = (select auth.uid()) and (select app_private.account_active())
  );
create policy agent_memory_item_owner_delete on app_private.agent_memory_item
  for delete to hh_app_backend using (
    account_id = (select auth.uid()) and (select app_private.account_active())
  );

create policy agent_memory_consent_owner_select on app_private.agent_memory_consent
  for select to hh_app_backend using (
    account_id = (select auth.uid()) and (select app_private.account_active())
  );
create policy agent_memory_consent_owner_insert on app_private.agent_memory_consent
  for insert to hh_app_backend with check (
    account_id = (select auth.uid()) and (select app_private.account_active())
  );
create policy agent_memory_consent_owner_update on app_private.agent_memory_consent
  for update to hh_app_backend using (
    account_id = (select auth.uid()) and (select app_private.account_active())
  ) with check (
    account_id = (select auth.uid()) and (select app_private.account_active())
  );
create policy agent_memory_consent_owner_delete on app_private.agent_memory_consent
  for delete to hh_app_backend using (
    account_id = (select auth.uid()) and (select app_private.account_active())
  );
commit;
