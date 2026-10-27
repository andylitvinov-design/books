-- Internal, owner-initiated SalesBot executions on an existing consented CRM lead.
-- Explicit manual event only. No Telegram/Meta send, subscriber campaign or
-- transfer of health/private user answers to external providers.
begin;
create table app.crm_salesbot_runs (
 id uuid primary key,
 owner_id uuid not null references app.accounts(id) on delete cascade,
 flow_id uuid not null references app.crm_salesbot_flows(id) on delete cascade,
 thread_id uuid not null references app.crm_msg_threads(id) on delete cascade,
 contact_id uuid not null references app.crm_contacts(id) on delete cascade,
 operation_id uuid not null,
 source_event text not null default 'owner_manual_verified_lead'
   check (source_event='owner_manual_verified_lead'),
 flow_version integer not null check (flow_version>0),
 status text not null check (status in ('waiting_for_choice','completed')),
 revision integer not null default 0 check (revision>=0),
 input_ciphertext text not null check(octet_length(input_ciphertext) between 60 and 32000),
 trace_ciphertext text not null check(octet_length(trace_ciphertext) between 60 and 256000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id,flow_id,operation_id)
);
create index crm_salesbot_runs_owner_latest
 on app.crm_salesbot_runs(owner_id,created_at desc,id desc);
alter table app.crm_salesbot_runs enable row level security;
alter table app.crm_salesbot_runs force row level security;
revoke all on app.crm_salesbot_runs from public,anon,authenticated,service_role,
 hh_app_backend,hh_app_inbox,hh_crm_backend;
grant select,insert,update on app.crm_salesbot_runs to hh_crm_backend;
create policy crm_salesbot_runs_owner_read on app.crm_salesbot_runs
 for select to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_salesbot_runs_owner_insert on app.crm_salesbot_runs
 for insert to hh_crm_backend
 with check(owner_id=(select auth.uid()) and (select app_private.account_active())
  and status in ('waiting_for_choice','completed') and revision=0);
create policy crm_salesbot_runs_owner_update on app.crm_salesbot_runs
 for update to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()))
 with check(owner_id=(select auth.uid()) and (select app_private.account_active()));
comment on table app.crm_salesbot_runs is
 'Encrypted owner-only safe simulations bound to an existing lead. Manual trigger; durable waits and a local owner followup only, never provider dispatch.';
commit;
