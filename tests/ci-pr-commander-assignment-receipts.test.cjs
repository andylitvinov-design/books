'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,
  '../supabase/migrations/20261110171500_commander_ci_executor_assignment_v1.sql'),'utf8');

test('trusted CI event gets a durable concrete executor assignment, not a role-only task',()=>{
  assert.match(source,/ADD COLUMN IF NOT EXISTS assignment_receipt jsonb/);
  assert.match(source,/commander_assign_ci_executor_v1\(p_event uuid\)/);
  assert.match(source,/associated_task_id IS NULL/);
  assert.match(source,/owner_access/);
  assert.match(source,/existing_owner_task_review/i);
  assert.match(source,/HH_CI_EXECUTOR_ASSIGNMENT_V1/);
  assert.match(source,/agent-commander-openrouter-worker/);
  assert.match(source,/nextCheckAt/);
});
test('free read-only diagnosis is bounded, deduped, and cannot inherit code-write permission',()=>{
  assert.match(source,/ci-readonly:/);
  assert.match(source,/ON CONFLICT \(owner_id,chat_id,idempotency_key\) DO NOTHING/);
  assert.match(source,/ONE_ACTIVE_EXECUTOR_PER_PR/);
  assert.match(source,/v_count>=3/);
  assert.match(source,/confirmGitHubWrite',false/);
  assert.match(source,/sourceWriteAuthorized',false/);
  assert.match(source,/sourceFixVerified',false/);
  assert.match(source,/liveVerified',false/);
  assert.doesNotMatch(source,/createWorkflowDispatch|merge_pull_request|GITHUB_TOKEN|provider.*max_price:/i);
});
test('security, access and model failures are assigned to owner without speculative model calls',()=>{
  assert.match(source,/e\.category IN \('SECURITY','ACCESS_CONFIG','AI_EXECUTOR'\)/);
  assert.match(source,/SENSITIVE_OR_PROVIDER_OWNER_ACTION_REQUIRED/);
  assert.match(source,/repository-owner-manual/);
});
test('worker states distinguish accepted, started, read-only completed, and blocked',()=>{
  assert.match(source,/zz_commander_ci_worker_assignment_sync_v1/);
  assert.match(source,/WORKER_STARTED/);
  assert.match(source,/QUEUED_NOT_STARTED/);
  assert.match(source,/DIAGNOSIS_COMPLETED_NOT_SOURCE_REPAIR/);
  assert.match(source,/BLOCKED_EXECUTOR_FAILED/);
  assert.match(source,/zeroCostVerified/);
  assert.match(source,/sourceFixVerified',false/);
  assert.match(source,/REVOKE ALL ON FUNCTION business_brain\.commander_assign_ci_executor_v1/);
});