import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL(
 '../supabase/functions/agent-commander-pr-completion-v1/index.ts',import.meta.url),'utf8');
test('signed owner command accepts existing Worker completion, but not an arbitrary PR event',()=>{
 assert.match(src,/claims\.iss!=='https:\/\/token\.actions\.githubusercontent\.com'/);
 assert.match(src,/claims\.aud!==AUD/);
 assert.match(src,/claims\.repository!==REPO/);
 assert.match(src,/claims\.ref!=='refs\/heads\/codex\/bootstrap-books'/);
 assert.match(src,/claims\.workflow_ref!==OWNER_WORKFLOW/);
 assert.match(src,/claims\.job_workflow_ref&&claims\.job_workflow_ref!==OWNER_WORKFLOW/);
 assert.match(src,/!\['schedule','workflow_dispatch','workflow_run','push'\]\.includes\(claims\.event_name\)/);
 assert.doesNotMatch(src,/\['schedule','workflow_dispatch','workflow_run','pull_request'\]/);
 assert.match(src,/crypto\.subtle\.verify\(/);
 assert.match(src,/lease_until>now\(\) and dispatch_attempted_at is null/);
});
