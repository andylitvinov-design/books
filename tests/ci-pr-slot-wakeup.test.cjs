'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {trustedEvent,hasDurableBacklog,run}=require('../scripts/ci-pr-slot-wakeup.cjs');
const REPO='andylitvinov-design/books';
const event={eventName:'workflow_run',ref:'refs/heads/codex/bootstrap-books',
 repo:{owner:'andylitvinov-design',repo:'books'},payload:{workflow_run:{
  name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',
  event:'pull_request',status:'completed',conclusion:'success',
  repository:{full_name:REPO},head_repository:{full_name:REPO},
  id:1234,run_attempt:2,head_branch:'fix/example',head_sha:'a'.repeat(40)}}};
const variant=delta=>({...event,payload:{workflow_run:{...event.payload.workflow_run,...delta}}});
const core={info(){},warning(){},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}};
const empty={ci:{nodes:[]},repair:{nodes:[]},conflict:{nodes:[]}};
function fixture(backlog=empty,dispatchResult={}){
 const calls={queries:0,dispatch:0,watchdog:0};
 const github={graphql:async()=>{calls.queries++;return backlog},
  rest:{actions:{createWorkflowDispatch:async()=>{calls.watchdog++;throw Error('WATCHDOG_HOP_FORBIDDEN')}}}};
 const dispatchRun=async args=>{
  calls.dispatch++;assert.equal(args.github,github);assert.equal(args.context,event);
  assert.equal(args.dryRun,false);
  assert.deepEqual(Object.keys(args).sort(),['context','core','dryRun','github']);
  return {schema:'HH_CONTROL_DISPATCH_V1',dispatchAccepted:1,dispatchReceiptsConfirmed:1,
   reason:'DISPATCH_ACCEPTED',blocked:{},...dispatchResult};
 };
 return {calls,github,dispatchRun};
}
test('only trusted protected-branch completed same-repository Core success signals a refill',()=>{
 assert.equal(trustedEvent(event),true);
 for(const bad of [variant({conclusion:'failure'}),variant({status:'in_progress'}),
  variant({path:'untrusted.yml'}),variant({head_repository:{full_name:'external/repo'}}),
  variant({head_repository:null}),variant({id:0}),variant({run_attempt:0}),
  variant({head_sha:'bad'}),{...event,ref:'refs/heads/untrusted'},
  {...event,eventName:'pull_request_target'}])assert.equal(trustedEvent(bad),false);
});
test('successful Core with a durable backlog dispatches immediately in the same job',async()=>{
 const f=fixture({...empty,repair:{nodes:[{number:42}]}});
 const outcome=await run({...f,core,context:event});
 assert.equal(outcome.decision,'DIRECT_DISPATCH_ACCEPTED');
 assert.equal(outcome.dispatched,1);assert.equal(outcome.receiptsConfirmed,1);
 assert.equal(outcome.core_run_id,1234);assert.equal(outcome.core_run_attempt,2);
 assert.deepEqual(f.calls,{queries:1,dispatch:1,watchdog:0});
});
test('idle queue or invalid backlog creates no work',async()=>{
 const f=fixture();assert.equal(await hasDurableBacklog(f.github,'andylitvinov-design','books'),false);
 assert.equal((await run({...f,core,context:event})).decision,'NO_ACTIONABLE_BACKLOG');
 assert.equal(f.calls.dispatch,0);assert.equal(f.calls.watchdog,0);
 const invalid=fixture({ci:{nodes:[]}});
 assert.equal((await run({...invalid,core,context:event})).decision,'BACKLOG_UNVERIFIED_WATCHDOG_FALLBACK');
 assert.deepEqual(invalid.calls,{queries:1,dispatch:0,watchdog:0});
});
test('actual dispatcher capacity or hold is preserved without a duplicate CI or Watchdog wake',async()=>{
 const f=fixture({...empty,ci:{nodes:[{number:42}]}},{dispatchAccepted:0,
  dispatchReceiptsConfirmed:0,reason:'NO_SAFE_DISPATCH',blocked:{WORKER_BUSY:1}});
 const outcome=await run({...f,core,context:event});
 assert.equal(outcome.decision,'NO_SAFE_DISPATCH_WATCHDOG_FALLBACK');
 assert.equal(outcome.dispatched,0);assert.deepEqual(outcome.blocked,{WORKER_BUSY:1});
 assert.deepEqual(f.calls,{queries:1,dispatch:1,watchdog:0});
});
test('ambiguous dispatcher delivery is never automatically retried',async()=>{
 const f=fixture({...empty,repair:{nodes:[{number:42}]}});
 let n=0;const outcome=await run({...f,core,context:event,dispatchRun:async()=>{n++;throw Error('ambiguous')}});
 assert.equal(outcome.decision,'DIRECT_HANDOFF_UNVERIFIED_WATCHDOG_FALLBACK');
 assert.equal(n,1);assert.equal(f.calls.watchdog,0);
});
test('foreign event does not query or dispatch',async()=>{
 const f=fixture({...empty,ci:{nodes:[{number:42}]}});
 assert.equal((await run({...f,core,context:variant({repository:{full_name:'external/repo'}})})).decision,'UNTRUSTED_OR_UNRELATED_EVENT');
 assert.deepEqual(f.calls,{queries:0,dispatch:0,watchdog:0});
});
test('canonical dispatcher admits strict green event only as a live queue refill',async()=>{
 const {trustedContext,run:dispatch}=require('../scripts/ci-pr-queue-dispatcher.cjs');
 assert.equal(trustedContext(event),true);
 assert.equal(trustedContext(variant({path:'untrusted.yml'})),false);
 for(const options of [{focusPrNumber:42},{manualTarget:{prNumber:42,expectedSha:'a'.repeat(40)}},
  {inventorySnapshot:[]},{ownerProof:{}},{watchdogEvidence:{}}]){
  const outcome=await dispatch({github:{},core,context:event,...options});
  assert.equal(outcome.reason,'CORE_SUCCESS_REFILL_MUST_USE_LIVE_QUEUE');
  assert.equal(outcome.dispatchAccepted,0);
 }
});
test('same existing Core listener, shared writer and scheduled recovery',()=>{
 const fs=require('node:fs');
 const native=fs.readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 const slot=native.split('\n  core-slot-wakeup:\n')[1].split('\n  recover-interrupted-core:\n')[0];
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 assert.match(slot,/group: hh-control-tower-single-writer/);
 assert.match(slot,/Refill durable PR queue directly on successful Core completion/);
 assert.match(slot,/scripts\/ci-pr-slot-wakeup\.cjs/);
 assert.doesNotMatch(slot,/createWorkflowDispatch|HH_AUTOMERGE_TOKEN|contents: write/);
 assert.match(watchdog,/schedule:/);
 assert.doesNotMatch(watchdog,/- 'HH PR core release gate'/);
});
