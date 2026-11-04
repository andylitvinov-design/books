'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {conflictEventTarget,runConflictEvent}=require('../scripts/ci-pr-conflict-event-handoff.cjs');
const SHA='a'.repeat(40);
const event=()=>({
 repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/public-book-library',eventName:'pull_request_target',
 payload:{action:'synchronize',pull_request:{number:3500,state:'open',draft:false,
  base:{ref:'codex/public-book-library'},
  head:{sha:SHA,repo:{full_name:'andylitvinov-design/books'}}}}
});
test('production PR event is a single exact-head target',()=>{
 assert.deepEqual(conflictEventTarget(event()),{pr_number:3500,head_sha:SHA,action:'synchronize'});
 for(const broken of [
  {eventName:'workflow_dispatch'}, {ref:'refs/heads/codex/bootstrap-books'},
  {payload:{...event().payload,action:'labeled'}},
  {payload:{...event().payload,pull_request:{...event().payload.pull_request,draft:true}}},
  {payload:{...event().payload,pull_request:{...event().payload.pull_request,
    head:{sha:SHA,repo:{full_name:'untrusted/fork'}}}}}
 ]){
  assert.equal(conflictEventTarget({...event(),...broken}),null);
 }
});
test('conflict event reuses one trusted dispatcher without a second PR inventory',async()=>{
 let n=0;
 const r=await runConflictEvent({github:{},core:{},context:event(),
  dispatchRun:async opts=>{n++;
   assert.equal(opts.focusConflictPrNumber,3500);
   assert.equal(opts.context.payload.pull_request.head.sha,SHA);
   return {manualConflictHandoffs:1,reason:'CONFLICT_HANDOFF_ACCEPTED'};}});
 assert.equal(n,1);assert.equal(r.status,'CONFLICT_ROUTED');
 assert.equal(r.manual_handoffs,1);
});
test('unknown mergeability and policy holds do not count as routed',async()=>{
 for(const reason of ['CONFLICT_MERGEABILITY_PENDING','CONFLICT_EVENT_POLICY_HOLD']){
  const r=await runConflictEvent({github:{},core:{},context:event(),
   dispatchRun:async()=>({manualConflictHandoffs:0,reason})});
  assert.equal(r.status,reason);assert.equal(r.manual_handoffs,0);
 }
});
test('untrusted payload has no API calls',async()=>{
 let called=0;const context=event();context.payload.action='labeled';
 const r=await runConflictEvent({context,dispatchRun:async()=>{called++;}});
 assert.equal(called,0);assert.equal(r.status,'IGNORED_EVENT');
});