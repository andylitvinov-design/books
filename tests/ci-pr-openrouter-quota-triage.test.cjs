'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('supabase/migrations/20261110174500_commander_openrouter_rate_limit_triage.sql','utf8');
test('confirmed OpenRouter Free rate-limit has a deterministic zero-spend no-retry strategy',()=>{
 assert.match(sql,/OPENROUTER_RATE_LIMITED/);
 assert.match(sql,/OPENROUTER_HTTP_429/);
 assert.match(sql,/WAIT_QUOTA_NO_AUTO_RETRY/);
 assert.match(sql,/owner_role := 'free-provider-quota-owner'/);
 assert.match(sql,/strategy := 'WAIT_QUOTA_NO_AUTO_RETRY'/);
 assert.match(sql,/source_write_authorized',false/);
 assert.match(sql,/max_auto_retries',0/);
});
test('executor incident task keeps verified parent PR and next check',()=>{
 assert.match(sql,/NEW\.task_id AND t\.owner_id=NEW\.owner_id/);
 assert.match(sql,/'relatedPr',coalesce\(linked_prs,'\[\]'::jsonb\)/);
 assert.match(sql,/'nextCheckAt',now\(\)\+interval '1 hour'/);
 assert.match(sql,/JOIN business_brain\.commander_execution_runs r/);
 assert.match(sql,/r\.status='FAILED'/);
 assert.match(sql,/f\.payload->>'runIncidentKey'/);
 assert.doesNotMatch(sql,/createWorkflowDispatch|merge_pull_request|secret_key|service_role|http_post/i);
});
