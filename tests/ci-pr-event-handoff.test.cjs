'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {confirmedCoreEvent,run}=require('../scripts/ci-pr-event-handoff.cjs');
const event=()=>({
 repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_run',
 payload:{workflow_run:{
  id:100,run_attempt:1,name:'HH PR core release gate',
  path:'.github/workflows/hh-pr-core-release.yml@refs/pull/1/merge',
  head_sha:'b'.repeat(40),head_branch:'codex/pr-source',
  event:'pull_request',status:'completed',conclusion:'failure',
  repository:{full_name:'andylitvinov-design/books'},
  head_repository:{full_name:'andylitvinov-design/books'},
  pull_requests:[{number:3162}]
 }}
});
test('only a trusted completed failed Core event can wake source repair',()=>{
 const good=event();
 assert.equal(confirmedCoreEvent(good),true);
 for(const fields of [
  {name:'Other workflow'},{status:'in_progress'},{conclusion:'success'},
  {path:'.github/workflows/untrusted.yml'},{event:'push'},
  {head_sha:'not-a-sha'},{run_attempt:0},
  {head_repository:{full_name:'outsider/books'}}
 ]){
  const bad=event();Object.assign(bad.payload.workflow_run,fields);
  assert.equal(confirmedCoreEvent(bad),false,JSON.stringify(fields));
 }
 const other=event();other.ref='refs/heads/untrusted';
 assert.equal(confirmedCoreEvent(other),false);
});
test('event verifies causal source failure, then dispatches only verified PR in one call',async()=>{
 const calls=[];
 const evidence={eventPrNumber:3162,verifiedSourceFailures:1,conflictLabelsQueued:0};
 const result=await run({context:event(),github:{},core:{},
  reconcileRun:async args=>{calls.push(['reconcile',args]);return evidence;},
  dispatchRun:async args=>{calls.push(['dispatch',args]);return {dispatchAccepted:1,reason:'DISPATCH_ACCEPTED'};}
 });
 assert.equal(result.outcome,'DISPATCH_ACCEPTED');
 assert.equal(result.dispatchAccepted,1);
 assert.equal(calls.length,2);
 assert.equal(calls[0][1].eventFastPath,true);
 assert.equal(calls[0][1].hasMergeToken,false);
 assert.equal(calls[1][1].focusPrNumber,3162);
});
test('no speculative dispatch for policy, incomplete evidence or stale association',async()=>{
 for(const evidence of [
  {eventPrNumber:3162,coreFailures:1,releaseGateOnly:1},
  {eventPrNumber:3162,coreFailureUnverified:1},
  {eventPrNumber:null,verifiedSourceFailures:1},
  {eventPrNumber:3162,verifiedSourceFailures:1,apiRateLimited:true}
 ]){
  let dispatched=0;
  const r=await run({context:event(),github:{},core:{},
   reconcileRun:async()=>evidence,
   dispatchRun:async()=>{dispatched++;return {dispatchAccepted:1};}});
  assert.equal(dispatched,0);
  assert.notEqual(r.outcome,'DISPATCH_ACCEPTED');
 }
});
test('cron remains a real independent backstop; Core event uses same writer lease',()=>{
 const yaml=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 const contract=fs.readFileSync('.github/workflows/hh-pr-watchdog-contract-ci.yml','utf8');
 assert.match(yaml,/cron: '6,16,26,36,46,56 \* \* \* \*'/);
 assert.match(yaml,/  failed-core-event-handoff:/);
 assert.match(yaml,/HH_CORE_EVENT_HANDOFF/);
 assert.match(yaml,/group: hh-control-tower-single-writer/);
 assert.match(yaml,/  direct-handoff:/);
 assert.match(yaml,/needs: reconcile/);
 assert.match(contract,/node --test .*ci-pr-event-handoff\.test\.cjs/);
});
