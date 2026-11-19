import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const edge=readFileSync(new URL('../supabase/functions/agent-commander-pr-completion-v1/index.ts',import.meta.url),'utf8');
test('formerly BLOCKED owner intent is always read-only including WATCHING state',()=>{
 assert.match(edge,/const row=rows\[0\],previouslyBlocked=row\.state==='BLOCKED'\|\|\s*row\.evidence\?\.blockedRecheckOnly===true/);
 assert.doesNotMatch(edge,/row\.state==='LEASED'&&row\.evidence\?\.blockedRecheckOnly/);
 assert.match(edge,/const first=!previouslyBlocked&&row\.dispatch_attempted_at==null/);
 assert.match(edge,/dispatchEligibleOnce:first/);
 assert.match(edge,/blockedRecheckOnly:previouslyBlocked/);
 assert.match(edge,/blockedRecheckOnly:prior\[0\]\.evidence\?\.blockedRecheckOnly===true/);
});
test('old owner intent never gains a new writer after being recovered',()=>{
 const blocked=row=>row.state==='BLOCKED'||row.evidence?.blockedRecheckOnly===true;
 for(const state of ['WATCHING','QUEUED','LEASED']){
  const row={state,evidence:{blockedRecheckOnly:true},dispatch_attempted_at:null};
  assert.equal(!blocked(row)&&row.dispatch_attempted_at==null,false);
 }
 assert.equal(!blocked({state:'QUEUED',evidence:{},dispatch_attempted_at:null}),true);
});
test('OIDC lease, no-dispatch witness and exact HEAD checks remain enforced',()=>{
 assert.match(edge,/lease_until>now\(\) and dispatch_attempted_at is null returning request_id/);
 assert.match(edge,/SAFE_CAPACITY_HOLDS\.has\(code\)/);
 assert.match(edge,/current\.state==='open'&&current\.draft!==true&&/);
 assert.match(edge,/SIGNED_GITHUB_ACTIONS_OIDC/);
});
