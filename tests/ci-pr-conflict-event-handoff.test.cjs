'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {trustedConflictEvent,currentDirty,run}=require('../scripts/ci-pr-conflict-event-handoff.cjs');
const {laneOf}=require('../scripts/ci-pr-task-state.cjs');
const SHA='a'.repeat(40),BASE='b'.repeat(40);
const source=(labels=[],extra={})=>({
 number:3162,title:'fix: dirty production merge',state:'open',draft:false,
 user:{login:'andylitvinov-design'},
 base:{ref:'codex/public-book-library',sha:BASE},
 head:{ref:'codex/pr-source',sha:SHA,repo:{full_name:'andylitvinov-design/books'}},
 mergeable:false,mergeable_state:'dirty',
 labels:labels.map(name=>({name})),...extra
});
const event=()=>({repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',eventName:'pull_request_target',
 runId:111,payload:{action:'synchronize',pull_request:source()}});
const core={info(){},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}};
test('only exact same-repo production PR event permits dirty conflict handoff',()=>{
 assert.equal(trustedConflictEvent(event()),true);
 for(const change of [
  c=>c.ref='refs/heads/codex/public-book-library',
  c=>c.payload.pull_request.head.repo.full_name='attacker/books',
  c=>c.payload.pull_request.base.ref='codex/bootstrap-books',
  c=>c.eventName='workflow_dispatch',
  c=>c.payload.action='labeled',
  c=>c.payload.pull_request.draft=true
 ]){
  const c=event();change(c);assert.equal(trustedConflictEvent(c),false);
 }
 const c=event();assert.equal(currentDirty(source(),c.payload.pull_request),true);
 assert.equal(currentDirty(source([],{head:{...source().head,sha:'c'.repeat(40)}}),
  c.payload.pull_request),false);
});
test('verified dirty conflict creates a single label and passes one snapshot to single writer',async()=>{
 let current=source(),reads=0,labels=0,dispatches=0;
 const github={rest:{pulls:{get:async()=>{
  reads++;return {data:current};
 }},issues:{addLabels:async args=>{
  labels++;assert.deepEqual(args.labels,['hh:conflict-repair-needed']);
  current=source(['hh:conflict-repair-needed','hh:repair-needed']);
  return {data:{}};
 }}}};
 const result=await run({github,core,context:event(),
  dispatchRun:async args=>{
   dispatches++;
   assert.equal(args.focusPrNumber,3162);
   assert.equal(args.focusPrSnapshot,current);
   assert.equal(args.context.eventName,'pull_request_target');
   return {manualConflictHandoffs:1,dispatchAccepted:0,reason:'CONFLICT_HANDOFF_ACCEPTED'};
  }});
 assert.equal(result.outcome,'MANUAL_CONFLICT_HANDOFF');
 assert.equal(labels,1);assert.equal(reads,2);assert.equal(dispatches,1);
 assert.equal(laneOf(current),'conflict','dirty conflict outranks stale repair labels');
});
test('already-labeled dirty conflict reuses fresh snapshot without duplicate label write',async()=>{
 const current=source(['hh:conflict-repair-needed']);let writes=0;
 const github={rest:{pulls:{get:async()=>({data:current})},
  issues:{addLabels:async()=>{writes++;}}}};
 const result=await run({github,core,context:event(),
  dispatchRun:async()=>({manualConflictHandoffs:1})});
 assert.equal(result.outcome,'MANUAL_CONFLICT_HANDOFF');assert.equal(writes,0);
});
test('unknown mergeability, stale HEAD and held PR fail closed without dispatch',async()=>{
 for(const p of [
  source([],{mergeable:null,mergeable_state:'unknown'}),
  source([],{head:{...source().head,sha:'c'.repeat(40)}}),
  source(['hh:hold'])
 ]){
  let dispatched=0,written=0;
  const github={rest:{pulls:{get:async()=>({data:p})},
   issues:{addLabels:async()=>{written++;}}}};
  const r=await run({github,core,context:event(),
   dispatchRun:async()=>{dispatched++;return {manualConflictHandoffs:1};}});
  assert.notEqual(r.outcome,'MANUAL_CONFLICT_HANDOFF');
  assert.equal(dispatched,0);assert.equal(written,0);
 }
});
test('single event workflow never falls into full Watchdog inventory scan',()=>{
 const fs=require('node:fs');
 const y=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 assert.match(y,/pull_request_target:/);
 assert.match(y,/  conflict-event-handoff:/);
 assert.match(y,/github.event_name != 'pull_request_target'/);
 assert.match(y,/group: hh-control-tower-single-writer/);
 assert.match(y,/ci-pr-conflict-event-handoff\.cjs/);
});
