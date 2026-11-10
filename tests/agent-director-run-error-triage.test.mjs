import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sql=fs.readFileSync(path.join(process.cwd(),
  'supabase/migrations/20261110150000_agent_director_run_error_triage_v1.sql'),'utf8');
test('all known failure classes have a deterministic policy and safe UNKNOWN fallback',()=>{
  for(const code of [
    'OWNED_MODEL_RUNTIME_NOT_CONFIGURED','OWNED_MODEL_FREE_RATE_LIMIT',
    'OWNED_MODEL_COST_UNVERIFIED','OWNED_MODEL_PROVIDER_UNAVAILABLE',
    'FREE_AI_OPENROUTER_PATCH_RESPONSE_INVALID','STALE_SHA',
    'MERGE_CONFLICT','CI_ROUTING_FAILURE','DEPLOY_FAILURE',
    'OWNED_MODEL_SENSITIVE_CONTENT_REJECTED','OWNED_GITHUB_APP_NOT_CONFIGURED'
  ])assert.ok(sql.includes("'"+code+"'"),code);
  for(const strategy of [
    'OWNER_ACTION_REQUIRED','WAIT_QUOTA_NO_AUTO_RETRY','NO_SAFE_AUTO_ACTION',
    'REPAIR_SOURCE_AFTER_REVIEW','REBASE_RECHECK','FIX_ROUTING','INVESTIGATE_DEPLOY','INVESTIGATE'
  ])assert.ok(sql.includes("'"+strategy+"'"),strategy);
  assert.match(sql,/category text := 'UNKNOWN'/);
  assert.match(sql,/strategy text := 'INVESTIGATE'/);
  assert.match(sql,/'max_auto_retries',0/);
});
test('run failures produce one owner-scoped existing task and one original-chat event, not a new queue',()=>{
  assert.match(sql,/NEW\.owner_id/);
  assert.match(sql,/o\.can_read=true AND o\.can_write=true/);
  assert.match(sql,/commander_one_run_incident_task_v1/);
  assert.match(sql,/ON CONFLICT \(task_id\) DO UPDATE/);
  assert.match(sql,/IS DISTINCT FROM code/);
  assert.match(sql,/commander_chat_events/);
  assert.match(sql,/'note',event_payload,false/);
  assert.match(sql,/NEW\.chat_id,NEW\.owner_id/);
  assert.match(sql,/NEW\.status IN \('BLOCKED','FAILED'\)/);
  assert.doesNotMatch(sql,/\bworkflow_dispatch\b|\bhttps?:\/\/|\bcreate_pull_request\b/);
});
test('every classified failure remains no-write and does not claim auto-repair',()=>{
  assert.match(sql,/'source_write_authorized',false/);
  assert.match(sql,/'agent_started_by_triage',false/);
  assert.match(sql,/'executionAuthorized',false/);
  assert.match(sql,/'sourceWriteAuthorized',false/);
  assert.match(sql,/'proofLevel','ERROR_OBSERVED_NOT_REPAIRED'/);
  assert.match(sql,/REVOKE ALL ON FUNCTION/);
});
