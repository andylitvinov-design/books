import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../../supabase/functions/agent-commander-private-store-v1/index.ts',import.meta.url),'utf8');

test('private report attachment accepts only trusted Holistic House issue receipts, including Repair Worker inbox',()=>{
 assert.ok(source.includes('(1419|3128|3890)#issuecomment-'));
 assert.ok(source.includes('REPORT_PROVENANCE_UNVERIFIED'));
 assert.ok(source.includes('githubPublic("/issues/comments/"+m[2])'));
 assert.ok(source.includes('comment.issue_url!=='));
 assert.ok(!source.includes('issues/(\\d+)#issuecomment-'));
});
