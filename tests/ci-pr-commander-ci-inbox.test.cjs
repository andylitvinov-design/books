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
 assert.match(bridge,/classifyRedCiError\(\{ pr, jobs, failureMessage \}\)/);
 assert.match(bridge,/validatedJobEvidence,isActualBaseAdvancedLog/);
 assert.match(bridge,/verifiedFailureHint===/);
 assert.match(bridge,/BASE_ADVANCED: PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED/);
 assert.match(bridge,/HH_CI_ERROR_CLASSIFICATION_V1/);
 assert.match(bridge,/source_write_authorized: decision\.source_write_authorized/);
 assert.match(bridge,/execution_authorized: decision\.execution_authorized/);
});


test('Commander dispatch queues first-party cloud OpenRouter runs read-only with no false execution receipt',()=>{
 const start=edge.indexOf('if(action==="commander_start_run")');
 const end=edge.indexOf('if(action==="commander_list_ci_events")',start);
 assert.ok(start>=0&&end>start,'dispatcher block exists');
 const handler=edge.slice(start,end);
 assert.ok(handler.includes('const canDispatch=(executor==="local"||executor==="openrouter")&&!writeConfirmed&&openRouterReady'));
 assert.match(handler,/OPENROUTER_WORKER_QUEUED/);
 assert.match(handler,/OPENROUTER_API_KEY_NOT_CONFIGURED/);
 assert.match(edge,/HH_PM_OPENROUTER_API_KEY/);
 assert.match(edge,/receiveCommanderCiRoute\(req,origin\)/);
 assert.match(edge,/route_receipt/);
 assert.match(handler,/status:"QUEUED"/);
 assert.match(handler,/dispatchAttempted:false,agentStarted:false,executionVerified:false/);
 assert.match(handler,/GITHUB_WRITE_REQUIRES_SEPARATE_APPROVAL/);
 assert.match(handler,/EXTERNAL_HERMES_SERVICE_DISABLED_FIRST_PARTY_ONLY/);
 assert.match(edge,/value\.sourceWrite!==null/);
 assert.doesNotMatch(handler,/ownedDirectorCall\(req|trustedOwnedDirectorReceipt\(remote/);
 assert.doesNotMatch(handler,/confirmGitHubWrite:true|sourceWriteAuthorized:true/);
});

const autotaskMigration=fs.readFileSync(path.join(root,'supabase/migrations/20261110140500_commander_ci_autotask_v1.sql'),'utf8');

test('verified CI event creates one active review-only Commander task and linked chat',()=>{
 assert.match(autotaskMigration,/AFTER INSERT ON business_brain\.commander_ci_event_inbox/);
 assert.match(autotaskMigration,/oidc_workflow_ref <> 'andylitvinov-design\/books\/\.github\/workflows\/hh-pr-direct-core-failure\.yml@refs\/heads\/codex\/bootstrap-books'/);
 assert.match(autotaskMigration,/can_read = true AND can_write = true/);
 assert.match(autotaskMigration,/project_key = 'agent-commander'/);
 assert.match(autotaskMigration,/\(task_id,owner_id,project_key,title,payload,state,revision\)/);
 assert.match(autotaskMigration,/'queued_review',1/);
 assert.match(autotaskMigration,/INSERT INTO business_brain\.commander_chats/);
 assert.match(autotaskMigration,/'AWAITING_EXECUTOR_NOT_DISPATCHED'/);
 assert.match(autotaskMigration,/'executionAuthorized',false/);
 assert.match(autotaskMigration,/'sourceWriteAuthorized',false/);
 assert.match(autotaskMigration,/'agentStarted',false/);
});

test('CI task creation is idempotent, preserves existing tasks and blocks ambiguous ownership',()=>{
 assert.match(autotaskMigration,/CREATE UNIQUE INDEX IF NOT EXISTS commander_ci_one_active_autotask_per_pr/);
 assert.match(autotaskMigration,/payload->>'ciIncidentKey'/);
 assert.match(autotaskMigration,/state NOT IN \('completed','superseded'\)/);
 assert.match(autotaskMigration,/ORDER BY updated_at DESC LIMIT 2/);
 assert.match(autotaskMigration,/'AMBIGUOUS_TASKS'/);
 assert.match(autotaskMigration,/ON CONFLICT DO NOTHING/);
 assert.match(autotaskMigration,/ON CONFLICT \(task_id\) DO NOTHING/);
 assert.match(autotaskMigration,/associated_task_id=v_task/);
 assert.doesNotMatch(autotaskMigration,/github\.rest\.|workflow_dispatch|rerun-failed-jobs/);
});

const autotaskV2Migration=fs.readFileSync(path.join(root,'supabase/migrations/20261110152000_commander_ci_autotask_reconcile_v2.sql'),'utf8');

test('CI classification always creates or links one owner-assigned Commander task and chat',()=>{
 assert.match(autotaskV2Migration,/AFTER INSERT OR UPDATE OF classification,category,pr_number,head_sha/);
 assert.match(autotaskV2Migration,/commander_ci_event_autotask_v1/);
 assert.match(autotaskV2Migration,/assignedRole/);
 assert.match(autotaskV2Migration,/'queued_review'/);
 assert.match(autotaskV2Migration,/'AWAITING_EXECUTOR_NOT_DISPATCHED'/);
 assert.match(autotaskV2Migration,/INSERT INTO business_brain\.commander_chat_events/);
 assert.match(autotaskV2Migration,/md5\('HH_COMMANDER_CI_EVENT_V1:'/);
 assert.match(autotaskV2Migration,/AUTO_TASK_CREATED_NOT_DISPATCHED/);
 assert.match(autotaskV2Migration,/TASK_ASSIGNED_CHAT_RECORDED_NOT_DISPATCHED/);
 assert.match(autotaskV2Migration,/executionAuthorized',false/);
 assert.match(autotaskV2Migration,/sourceWriteAuthorized',false/);
 assert.match(autotaskV2Migration,/agentStarted',false/);
});
test('task/chat reconciliation backfills unmatched legacy inbox rows idempotently',()=>{
 assert.match(autotaskV2Migration,/WHERE association_status IN \('UNMATCHED','MATCHED_TASK_NO_CHAT','AMBIGUOUS_TASKS'\)/);
 assert.match(autotaskV2Migration,/ON CONFLICT \(event_id\) DO NOTHING/);
 assert.match(autotaskV2Migration,/ON CONFLICT \(task_id\) DO NOTHING/);
 assert.match(autotaskV2Migration,/GITHUB_OIDC_AND_EXACT_PR_HEAD/);
 assert.match(autotaskV2Migration,/AMBIGUOUS_TASKS/);
 assert.doesNotMatch(autotaskV2Migration,/workflow_dispatch|rerun-failed-jobs|github\.rest\./);
});

test('queued OpenRouter execution never writes a non-CHECK chat status and preserves worker checkpoints',()=>{
 const start=edge.indexOf('if(action==="commander_start_run")');
 const end=edge.indexOf('if(action==="commander_list_ci_events")',start);
 const action=edge.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.ok(action.includes('const firstStatus=canDispatch?"QUEUED":"BLOCKED"'));
 assert.ok(action.includes('[canDispatch?"AWAITING_EXECUTOR_NOT_DISPATCHED":"BLOCKED",ownerId,chat.chat_id]'));
 assert.ok(!action.includes('[firstStatus,ownerId,chat.chat_id]'));
 assert.ok(edge.includes('worker_checkpoint,worker_next_attempt_at,actual_model_id'));
 assert.ok(edge.includes('commanderCiChatExecutionState(p.state)'));
 assert.ok(edge.includes('p.dispatchAcknowledged'));
 assert.ok(edge.includes('p.workerTaskKey'));
 assert.ok(edge.includes('p.errorTaskId'));
});


const triageMigration=fs.readFileSync(path.join(root,'supabase/migrations/20261110182500_commander_ci_triage_disposition_backfill_v1.sql'),'utf8');
test('every authenticated Core error retains a separate durable classification disposition',()=>{
 assert.match(triageMigration,/CREATE TRIGGER commander_ci_triage_on_insert_v1/);
 assert.match(triageMigration,/BEFORE INSERT ON business_brain\.commander_ci_event_inbox/);
 assert.match(triageMigration,/UPDATE business_brain\.commander_ci_event_inbox/);
 assert.match(triageMigration,/triage_receipt IS NULL/);
 assert.match(triageMigration,/EXISTING_AUTHENTICATED_INBOX_BACKFILL/);
 assert.match(triageMigration,/OIDC_TRUSTED_CI_INBOX_INSERT/);
 assert.match(triageMigration,/RECORDED_CI_CLASSIFICATION_ONLY_NOT_DISPATCH/);
 assert.match(triageMigration,/'dispatchVerified',false/);
 assert.match(triageMigration,/'workerStartVerified',false/);
 assert.match(triageMigration,/'sourceCommitVerified',false/);
 assert.match(triageMigration,/'liveVerified',false/);
 assert.doesNotMatch(triageMigration,/createWorkflowDispatch|actions\/runs\/\{run_id\}\/rerun|source_published',true/);
});
test('classification is present for all 13 error families, including UNKNOWN, without executor claims',()=>{
 for(const cat of categories){
  assert.match(triageMigration,new RegExp("'"+cat+"'"));
 }
 const edge=fs.readFileSync(path.join(root,'supabase/functions/agent-commander-private-store-v1/index.ts'),'utf8');
 assert.match(edge,/triage_receipt,triage_recorded_at,historical_pr_readback/);
 assert.match(edge,/where inbox_owner_id=\$3::uuid/);
 assert.match(edge,/route_receipt,route_recorded_at,triage_receipt/);
});
