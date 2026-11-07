import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url),f=p=>readFileSync(new URL(p,base),'utf8');
const migration=f('supabase/migrations/20261107150000_hh_command_center_project_management_v1.sql');
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
 assert.doesNotMatch(route,/workflow_dispatch|rerun_failed|create_pull_request|new cron/i);
});
test('chosen plan uses existing tasks, milestones, DAG and no automation',()=>{
 assert.match(store,/INSERT INTO app_private\.cc_tasks/);
 assert.match(store,/INSERT INTO app_private\.cc_milestones/);
 assert.match(store,/INSERT INTO app_private\.cc_task_dependencies/);
 assert.match(store,/false,'planned'/);
 assert.match(store,/pg_advisory_xact_lock/);
 assert.match(store,/FOR UPDATE/);
});