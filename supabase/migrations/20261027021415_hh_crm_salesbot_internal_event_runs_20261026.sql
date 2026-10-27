-- Internal-only SalesBot event runner. Approved preview graphs require a SECOND
-- explicit owner activation before future consented Telegram inbound events.
-- No external message, workflow-send privilege, campaign or paid API added.
begin;
alter table app.crm_salesbot_flows drop constraint crm_salesbot_flows_status_check;
alter table app.crm_salesbot_flows add constraint crm_salesbot_flows_status_check
 check (status in ('draft','approved_preview','paused','active_internal'));
alter table app.crm_salesbot_flows drop constraint crm_salesbot_flow_status_snapshot;
alter table app.crm_salesbot_flows add constraint crm_salesbot_flow_status_snapshot
 check ((status='draft' and version=0 and published_ciphertext is null)
   or (status in ('approved_preview','paused','active_internal')
      and version>0 and published_ciphertext is not null));
create unique index crm_salesbot_one_active_internal_flow
 on app.crm_salesbot_flows(owner_id) where status='active_internal';
-- Only the signed Telegram webhook can see an already activated graph,
-- restricted to its precisely resolved owner; no preview or draft visibility.
grant select (id,owner_id,version,published_ciphertext,status)
 on app.crm_salesbot_flows to hh_app_inbox;
create policy crm_salesbot_active_signed_telegram_read
 on app.crm_salesbot_flows for select to hh_app_inbox
 using (status='active_internal'
   and owner_id::text=current_setting('hh.salesbot_event_owner',true));
-- Signed webhook can find only its exact already-consented, unsuppressed thread.
grant select (id,owner_id,account_id,contact_id,user_hash,suppressed)
 on app.crm_msg_threads to hh_app_inbox;
create policy crm_msg_salesbot_signed_inbound_lookup
 on app.crm_msg_threads for select to hh_app_inbox
 using (owner_id::text=current_setting('hh.salesbot_event_owner',true)
   and account_id::text=current_setting('hh.salesbot_event_account',true)
   and user_hash=current_setting('hh.salesbot_event_user',true)
   and suppressed=false);
create table app.crm_salesbot_runs(
 id uuid primary key,
 owner_id uuid not null references app.accounts(id) on delete cascade,
 flow_id uuid not null references app.crm_salesbot_flows(id) on delete cascade,
 thread_id uuid not null references app.crm_msg_threads(id) on delete cascade,
 flow_version integer not null check (flow_version>0),
 event_hash text not null check (event_hash~'^[a-f0-9]{64}$'),
 status text not null check(status in ('waiting_owner','review','completed')),
 payload_ciphertext text not null check(octet_length(payload_ciphertext) between 100 and 65536),
 revision integer not null default 0 check(revision>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id,flow_id,event_hash)
);
create index crm_salesbot_runs_owner_recent
 on app.crm_salesbot_runs(owner_id,created_at desc,id desc);
alter table app.crm_salesbot_runs enable row level security;
alter table app.crm_salesbot_runs force row level security;
revoke all on app.crm_salesbot_runs from public,anon,authenticated,service_role,hh_app_backend,hh_app_inbox,hh_crm_backend;
grant select,update on app.crm_salesbot_runs to hh_crm_backend;
grant insert on app.crm_salesbot_runs to hh_app_inbox;
create policy crm_salesbot_runs_owner_select on app.crm_salesbot_runs
 for select to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_salesbot_runs_owner_update on app.crm_salesbot_runs
 for update to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()))
 with check(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_salesbot_runs_signed_inbound_insert on app.crm_salesbot_runs
 for insert to hh_app_inbox
 with check(owner_id::text=current_setting('hh.salesbot_event_owner',true)
  and exists(select 1 from app.crm_salesbot_flows f
    where f.id=flow_id and f.owner_id=owner_id and f.status='active_internal')
  and exists(select 1 from app.crm_msg_threads t
    where t.id=thread_id and t.owner_id=owner_id and not t.suppressed));
comment on table app.crm_salesbot_runs is
 'Redacted event-hash and AES-GCM owner-only internal workflow trace. No provider send, no autonomous external message.';
commit;