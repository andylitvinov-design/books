-- Explicit, encrypted, owner-only text transcripts. Never store microphone bytes.
-- Apply only after protected code review and privacy/RLS checks. Disabled by default.
begin;
create table if not exists app_private.agent_chat_history_consent(
 account_id uuid primary key references app.accounts(id) on delete cascade,
 accepted boolean not null default false,
 policy_version text not null default 'hh-agent-chat-history-v1'
  check(policy_version='hh-agent-chat-history-v1'),
 updated_at timestamptz not null default now()
);
create table if not exists app_private.agent_chat_history_pairs(
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references app.accounts(id) on delete cascade,
 client_turn_id uuid not null,
 payload_ciphertext text not null check(length(payload_ciphertext) between 20 and 50000),
 created_at timestamptz not null default now(),
 unique(account_id,client_turn_id)
);
create index if not exists agent_chat_history_pairs_owner_time
 on app_private.agent_chat_history_pairs(account_id,created_at desc,id desc);
revoke all on app_private.agent_chat_history_consent,app_private.agent_chat_history_pairs
 from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant select,insert,update,delete
 on app_private.agent_chat_history_consent,app_private.agent_chat_history_pairs to hh_app_backend;
alter table app_private.agent_chat_history_consent enable row level security;
alter table app_private.agent_chat_history_consent force row level security;
alter table app_private.agent_chat_history_pairs enable row level security;
alter table app_private.agent_chat_history_pairs force row level security;
create policy hh_agent_chat_consent_select on app_private.agent_chat_history_consent
 for select to hh_app_backend using
 (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy hh_agent_chat_consent_insert on app_private.agent_chat_history_consent
 for insert to hh_app_backend with check
 (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy hh_agent_chat_consent_update on app_private.agent_chat_history_consent
 for update to hh_app_backend using
 (account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy hh_agent_chat_consent_delete on app_private.agent_chat_history_consent
 for delete to hh_app_backend using
 (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy hh_agent_chat_pairs_select on app_private.agent_chat_history_pairs
 for select to hh_app_backend using
 (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy hh_agent_chat_pairs_insert on app_private.agent_chat_history_pairs
 for insert to hh_app_backend with check
 (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy hh_agent_chat_pairs_delete on app_private.agent_chat_history_pairs
 for delete to hh_app_backend using
 (account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
