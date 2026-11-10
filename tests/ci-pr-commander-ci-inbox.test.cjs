'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const edge=fs.readFileSync(path.join(root,'supabase/functions/agent-commander-private-store-v1/index.ts'),'utf8');
const bridge=fs.readFileSync(path.join(root,'scripts/ci-pr-hermes-event-bridge.cjs'),'utf8');
const inboxMigration=fs.readFileSync(path.join(root,'supabase/migrations/20261109200000_commander_ci_event_inbox.sql'),'utf8');
const taxonomyMigration=fs.readFileSync(path.join(root,'supabase/migrations/20261110124500_commander_ci_inbox_classifier_taxonomy_v2_20261110.sql'),'utf8');
const receiptMigration=fs.readFileSync(path.join(root,'supabase/migrations/20261110125000_commander_ci_inbox_classification_receipt_v1_20261110.sql'),'utf8');

const categories=['SECURITY','ACCESS_CONFIG','MERGE_CONFLICT','BASE_ADVANCED','BASE_OR_CI_ROUTING',
 'INFRASTRUCTURE','AUTOMATION_PROCESS','AI_EXECUTOR','INTEGRATION','TYPESCRIPT','TEST_FAILURE','SOURCE_CODE','UNKNOWN'];

test('Commander CI inbox accepts the complete shared 13-category taxonomy',()=>{
 for(const category of categories)assert.ok(edge.includes('"'+category+'"'),category);
 for(const category of categories)assert.ok(taxonomyMigration.includes("'"+category+"'"),category);
 assert.match(edge,/classification,failed_jobs,failed_steps/);
 assert.match(edge,/schema: incoming.schema/);
 assert.match(edge,/incoming.status !== "DIAGNOSTIC_ONLY"/);
 assert.match(edge,/incoming.source_write_authorized !== false/);
 assert.match(edge,/incoming.execution_authorized !== false/);
});

test('JSONB arrays and objects are encoded once as TEXT before explicit JSONB cast',()=>{
 assert.match(edge,/function jsonbText\(value\)/);
 assert.match(edge,/\$15::text::jsonb/);
 assert.match(edge,/jsonbText\(event\.failed_jobs\)/);
 assert.match(edge,/jsonbText\(event\.failed_steps\)/);
 assert.match(edge,/jsonbText\(chatEvent\)/);
 assert.doesNotMatch(edge,/\$15::jsonb/);
 assert.match(inboxMigration,/failed_jobs jsonb/);
 assert.match(inboxMigration,/jsonb_typeof\(failed_jobs\)\s*=\s*'array'/);
});

test('duplicate webhook delivery recovers task/chat association without duplicate chat events',()=>{
 const receiver=edge.slice(edge.indexOf('async function receiveGitHubWorkflowRun'),edge.indexOf('\nasync function handler(req)'));
 assert.match(receiver,/duplicate=true/);
 assert.match(receiver,/CI_EVENT_IDEMPOTENCY_READBACK_MISSING/);
 assert.match(receiver,/Re-run task\/chat association after an idempotent insert/);
 assert.match(receiver,/github-ci:/);
 assert.match(receiver,/on conflict\(event_id\) do nothing/);
 assert.match(receiver,/where ci_event_id=\$4::uuid/);
 assert.match(receiver,/duplicate\?"ALREADY_RECORDED":"RECORDED"/);
});

test('Commander private API returns the detailed classification receipt',()=>{
 const api=edge.slice(edge.indexOf('if(action==="commander_list_ci_events")'));
 assert.match(api,/category,classification,failed_jobs,failed_steps/);
 assert.match(receiptMigration,/add column if not exists classification jsonb/);
 assert.match(receiptMigration,/jsonb_typeof\(classification\) = 'object'/);
});

test('OIDC event bridge uses the same versioned classifier and carries its diagnostic-only receipt',()=>{
 assert.match(bridge,/require\('\.\/ci-pr-red-ci-classifier\.cjs'\)/);
 assert.match(bridge,/classifyRedCiError\(\{ pr, jobs \}\)/);
 assert.match(bridge,/HH_CI_ERROR_CLASSIFICATION_V1/);
 assert.match(bridge,/source_write_authorized: decision\.source_write_authorized/);
 assert.match(bridge,/execution_authorized: decision\.execution_authorized/);
});


test('Commander execution verifies live zero pricing before dispatch and rejects write approval from non-Hermes executors',()=>{
 const start=edge.indexOf('if(action==="commander_start_run")');
 const end=edge.indexOf('if(action==="commander_list_ci_events")',start);
 assert.ok(start>=0&&end>start,'dispatcher block exists');
 const handler=edge.slice(start,end);
 assert.match(handler,/if\(writeConfirmed&&executor!==\"hermes\"\)return reply\(403,\{error:\"GITHUB_WRITE_REQUIRES_HERMES_EXECUTOR\"\}/);
 assert.match(handler,/await verifyFreeModel\(modelId\)/);
 assert.match(handler,/const canDispatch=Boolean\(canUseHermes&&config&&validModel&&modelVerified\)/);
 assert.ok(handler.indexOf('await verifyFreeModel(modelId)')<handler.indexOf('await db.begin'),
  'current live catalog is checked before any dispatch ledger or remote side effect');
 assert.match(handler,/!modelVerified\?modelVerificationReason/);
});

test('CI inbox associates to the real Agent Commander task project key, never the legacy Holistic House key',()=>{
 assert.match(edge,/where project_key='agent-commander' and state not in/);
 assert.doesNotMatch(edge,/where project_key='holistic-house'/);
});
