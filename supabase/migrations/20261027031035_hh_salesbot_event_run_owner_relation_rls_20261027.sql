-- Harden already-applied R4 internal-only workflow run access.
-- Initial 20261027021415 migration is already recorded in production: do not edit it.
-- Qualify outer owner IDs inside correlated policy subqueries. Without the
-- qualification PostgreSQL binds "owner_id" to the inner relation, creating
-- tautologies (f.owner_id=f.owner_id and t.owner_id=t.owner_id).
-- No customer message is sent and no public role receives access.
begin;
alter policy crm_salesbot_runs_signed_inbound_insert on app.crm_salesbot_runs
 with check (
   owner_id::text = current_setting('hh.salesbot_event_owner', true)
   and exists (
     select 1 from app.crm_salesbot_flows as f
     where f.id = crm_salesbot_runs.flow_id
       and f.owner_id = crm_salesbot_runs.owner_id
       and f.version = crm_salesbot_runs.flow_version
       and f.status = 'active_internal'
   )
   and exists (
     select 1 from app.crm_msg_threads as t
     where t.id = crm_salesbot_runs.thread_id
       and t.owner_id = crm_salesbot_runs.owner_id
       and t.account_id::text = current_setting('hh.salesbot_event_account', true)
       and t.user_hash = current_setting('hh.salesbot_event_user', true)
       and t.suppressed = false
   )
 );
-- The CRM owner updates only workflow state; no row reassignment.
revoke update on app.crm_salesbot_runs from hh_crm_backend;
grant update (status, payload_ciphertext, revision, updated_at)
  on app.crm_salesbot_runs to hh_crm_backend;
-- The signed inbox can insert only approved encrypted run fields, not revisions.
revoke insert on app.crm_salesbot_runs from hh_app_inbox;
grant insert (id, owner_id, flow_id, thread_id, flow_version,
              event_hash, status, payload_ciphertext)
  on app.crm_salesbot_runs to hh_app_inbox;
commit;
