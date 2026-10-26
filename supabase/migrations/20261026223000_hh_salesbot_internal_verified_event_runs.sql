-- Minimal internal-only SalesBot trigger: one approved graph → owner task.
-- No external dispatch, marketing, waits, payments, AI calls or extra CRM data.
begin;
alter table app.crm_salesbot_flows
  drop constraint if exists crm_salesbot_flows_status_check;
alter table app.crm_salesbot_flows add constraint crm_salesbot_flows_status_check
  check(status in ('draft','approved_preview','active_internal','paused'));
alter table app.crm_salesbot_flows
  drop constraint if exists crm_salesbot_flow_status_snapshot;
alter table app.crm_salesbot_flows add constraint crm_salesbot_flow_status_snapshot
  check ((status='draft' and version=0 and published_ciphertext is null) or
    (status in ('approved_preview','active_internal','paused') and version>0 and published_ciphertext is not null));
create unique index if not exists crm_salesbot_one_active_internal
  on app.crm_salesbot_flows(owner_id) where status='active_internal';

create table if not exists app.crm_salesbot_runs (
  id uuid primary key,
  owner_id uuid not null references app.accounts(id) on delete cascade,
  flow_id uuid not null references app.crm_salesbot_flows(id) on delete cascade,
  thread_id uuid not null references app.crm_msg_threads(id) on delete cascade,
  version integer not null check(version>0),
  state text not null default 'completed' check(state in ('completed','ignored')),
  trace_ciphertext text not null check(octet_length(trace_ciphertext) between 40 and 65536),
  created_at timestamptz not null default now(),
  unique(owner_id,flow_id,thread_id,version)
);
create index if not exists crm_salesbot_runs_owner_created
  on app.crm_salesbot_runs(owner_id,created_at desc);
alter table app.crm_salesbot_runs enable row level security;
alter table app.crm_salesbot_runs force row level security;
revoke all on app.crm_salesbot_runs from public,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;
grant select on app.crm_salesbot_runs to hh_crm_backend;
grant select,insert on app.crm_salesbot_runs to hh_app_inbox;
create policy crm_salesbot_runs_owner_read on app.crm_salesbot_runs for select to hh_crm_backend
  using (owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_salesbot_runs_worker_select on app.crm_salesbot_runs for select to hh_app_inbox
  using(owner_id::text=current_setting('hh.salesbot_owner',true)
    and thread_id::text=current_setting('hh.salesbot_thread',true));
create policy crm_salesbot_runs_worker_insert on app.crm_salesbot_runs for insert to hh_app_inbox
  with check(owner_id::text=current_setting('hh.salesbot_owner',true)
    and thread_id::text=current_setting('hh.salesbot_thread',true)
    and state='completed');

-- Signed webhook reads only the sole intentionally enabled internal graph.
grant select(id,owner_id,status,version,published_ciphertext)
  on app.crm_salesbot_flows to hh_app_inbox;
create policy crm_salesbot_active_worker_read on app.crm_salesbot_flows for select to hh_app_inbox
  using(status='active_internal' and owner_id::text=current_setting('hh.salesbot_owner',true));

-- Narrow RLS: signed webhooks may locate the exact already-consented owner CRM
-- thread, never enumerate all contacts or decrypt unrelated messages.
grant select(id,owner_id,account_id,user_hash,contact_id)
  on app.crm_msg_threads to hh_app_inbox;
create policy crm_salesbot_exact_thread_lookup on app.crm_msg_threads for select to hh_app_inbox
  using(owner_id::text=current_setting('hh.salesbot_owner',true)
    and account_id::text=current_setting('hh.salesbot_account',true)
    and user_hash=current_setting('hh.salesbot_user_hash',true));

-- The only permitted automatic side effect is one owner reply follow-up from
-- a newly committed internal run; no provider call or client message.
grant insert(id,owner_id,contact_id,kind,due_on) on app.crm_followups to hh_app_inbox;
create policy crm_salesbot_owner_followup_insert on app.crm_followups for insert to hh_app_inbox
  with check(owner_id::text=current_setting('hh.salesbot_owner',true)
    and contact_id::text=current_setting('hh.salesbot_contact',true)
    and kind='reply'
    and exists (select 1 from app.crm_salesbot_runs r
      where r.owner_id=crm_followups.owner_id
      and r.thread_id::text=current_setting('hh.salesbot_thread',true)
      and r.state='completed' and r.created_at>now()-interval '1 minute'));
comment on table app.crm_salesbot_runs is
  'Encrypted, owner-only audit of internal CRM workflow runs. No external automation sends.';
commit;
