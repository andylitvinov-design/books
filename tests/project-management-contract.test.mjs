import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url),f=p=>readFileSync(new URL(p,base),'utf8');
const migration=f('supabase/migrations/20261107150000_hh_command_center_project_management_v1.sql');
const permissions=f('supabase/migrations/20261107153000_hh_command_center_pm_backend_permissions_v1.sql');
const store=f('lib/project-management/store.mjs');const route=f('app/api/admin/project-management/route.js');
test('private schema and no public data API grant',()=>{
 assert.match(migration,/CREATE TABLE IF NOT EXISTS app_private\.cc_pm_epics/);
 assert.match(migration,/ALTER TABLE app_private\.cc_pm_epics ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/REVOKE ALL ON app_private\.cc_pm_epics/);
 assert.doesNotMatch(migration,/GRANT\s+.*\b(?:anon|authenticated)\b/i);
 assert.doesNotMatch(migration,/CREATE (?:TRIGGER|EXTENSION)|cron\.schedule|pg_net/);
});
test('mutations owner gated and same origin, no new scheduler or CI',()=>{
 assert.match(route,/ownerMaterialRequest\(request/);
 assert.match(route,/CROSS_ORIGIN_DENIED/);
 assert.match(route,/consumeRate/);
 assert.match(route,/uuid\(data\.requestId\)/);
 assert.doesNotMatch(route,/rerun_failed|create_pull_request|new cron/i);
 assert.match(route,/actions\/workflows\/.*?\/dispatches/);
 assert.match(route,/reservePmExecution/);
 assert.match(route,/HH_PM_GITHUB_ACTIONS_WRITE_TOKEN/);
 assert.doesNotMatch(route,/hh-pr-repair-worker\.yml.*?\/dispatches/);
});
test('chosen plan uses existing tasks, milestones, DAG and no automation',()=>{
 assert.match(store,/INSERT INTO app_private\.cc_tasks/);
 assert.match(store,/INSERT INTO app_private\.cc_milestones/);
 assert.match(store,/INSERT INTO app_private\.cc_task_dependencies/);
 assert.match(store,/false,'planned'/);
 assert.match(store,/pg_advisory_xact_lock/);
 assert.match(store,/FOR UPDATE/);
});

test('existing private backend has RLS policy and least-privilege grants for PM tables',()=>{
 assert.match(permissions,/GRANT SELECT, INSERT, UPDATE ON TABLE[\s\S]*TO hh_app_backend/);
 for(const name of ['epics','options','task_links','pr_links','events']){
  assert.match(permissions,new RegExp('CREATE POLICY cc_pm_backend_'+name+' ON app_private\\.cc_pm_'+name));
  assert.match(permissions,new RegExp('ALTER TABLE app_private\\.cc_pm_'+name+' FORCE ROW LEVEL SECURITY'));
 }
 assert.doesNotMatch(permissions,/GRANT[^;]+TO\s+(?:PUBLIC|anon|authenticated)/i);
 assert.doesNotMatch(permissions,/GRANT\s+ALL|CREATE TRIGGER|cron\.schedule/i);
});
test('execution gateway reuses private event ledger, not public monitor or second worker',()=>{
 const execution=f('lib/project-management/execution.mjs');
 const migration=f('supabase/migrations/20261107183000_hh_pm_execution_gateway_v3.sql');
 const client=f('app/admin/project-management/project-management-client.jsx');
 const style=f('app/admin/project-management/project-management.module.css');
 assert.match(execution,/executionAdmission/);
 assert.match(execution,/buildChatgptHandoff/);
 assert.match(execution,/pm_request_id/);
 assert.match(store,/pg_advisory_xact_lock/);
 assert.match(store,/DISPATCH_PENDING/);
 assert.match(store,/EXECUTION_ALREADY_RESERVED_OR_ATTEMPTED/);
 assert.match(migration,/ALTER TABLE app_private\.cc_pm_events/);
 assert.doesNotMatch(migration,/CREATE TABLE|GRANT .*\b(?:anon|authenticated)\b|cron\.schedule/i);
 for(const action of ['prepare_execution','launch_execution','retry_execution',
   'cancel_future_attempts','prepare_chatgpt_handoff','execution_status'])
  assert.ok(route.includes(action));
 assert.match(client,/window\.confirm/);
 assert.match(client,/ChatGPT Work/);
 assert.match(style,/max-width:390px/);
 assert.doesNotMatch(route,/HH_AUTOMERGE_TOKEN|OPENROUTER_FREE_API_KEY/);
});
