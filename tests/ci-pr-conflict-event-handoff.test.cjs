'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {trustedConflictEvent,currentDirty,publishReadyStage,run}=require('../scripts/ci-pr-conflict-event-handoff.cjs');
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
 const native=fs.readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 assert.match(native,/pull_request_target:/);
 assert.match(native,/  conflict-event-handoff:/);
 assert.doesNotMatch(watchdog,/^  pull_request_target:/m,'only one trusted PR-target workflow starts');
 assert.doesNotMatch(watchdog,/^  conflict-event-handoff:/m);
 const eventJob=native.split('  conflict-event-handoff:\n')[1]?.split('\n  prune-head:')[0];
 assert.ok(eventJob,'the single native conflict-event job must exist');
 assert.match(eventJob,/group: hh-conflict-event-pr-\$\{\{ github\.event\.pull_request\.number \|\| github\.run_id \}\}/);
 assert.doesNotMatch(eventJob,/group: hh-control-tower-single-writer/,
   'PR-local hint must not consume the shared Watchdog source-writer queue');
 assert.match(eventJob,/run\(\{github,core,context,dryRun:false,queueOnly:true\}\)/);
 assert.match(watchdog,/group: hh-control-tower-single-writer/,
   'real Watchdog/Control Tower still preserves its global writer lease');
 assert.match(native,/ci-pr-conflict-event-handoff\.cjs/);
});

test('Ready timestamps share trusted PR-event runner and preserve HEAD',async()=>{
 for(const action of ['opened','ready_for_review']){
  const ctx=event();ctx.payload.action=action;
  ctx.payload.pull_request.created_at='2026-11-14T10:00:00.000Z';
  let calls=0,reads=0,body='';
  const github={rest:{pulls:{get:async()=>{reads++;return {data:source()};}},
   issues:{createComment:async args=>{
    calls++;body=args.body;assert.equal(args.issue_number,3162);
    return {data:{id:947}};
   }}}};
  const receipt=await publishReadyStage({github,context:ctx});
  assert.equal(receipt.status,'RECORDED');assert.equal(reads,1);assert.equal(calls,1);
  assert.match(body,/HH_PR_STAGE_V1/);assert.match(body,/"stage":"ready"/);
  assert.match(body,/"head_sha":"a{40}"/);
  assert.match(body,new RegExp('"source":"'+(action==='opened'?'pr_opened_ready':'ready_event_observed')+'"'));
  assert.match(body,/not CI-green or merge proof/);
  if(action==='opened')assert.match(body,/"at":"2026-11-14T10:00:00.000Z"/);
 }
});
test('stale, foreign, held, and non-Ready contexts cannot issue telemetry',async()=>{
 for(const action of ['synchronize','reopened']){
  const ctx=event();ctx.payload.action=action;
  assert.equal((await publishReadyStage({context:ctx,github:{rest:{}}})).status,'SKIPPED');
 }
 for(const change of [
  p=>{p.head.sha='c'.repeat(40);},
  p=>{p.user.login='attacker';},
  p=>{p.state='closed';},
  p=>{p.draft=true;},
  p=>{p.base.ref='codex/bootstrap-books';}
 ]){
  const ctx=event();ctx.payload.action='ready_for_review';
  const live=source();change(live);let writes=0;
  const github={rest:{pulls:{get:async()=>({data:live})},
   issues:{createComment:async()=>{writes++;return {data:{id:5}};}}}};
  assert.equal((await publishReadyStage({github,context:ctx})).status,'SKIPPED');
  assert.equal(writes,0);
 }
});
test('Ready telemetry coalescing preserves actual protected Core and conflict event routing',()=>{
 const fs=require('node:fs');
 const native=fs.readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 const watchdog=fs.readFileSync('.github/workflows/hh-pr-ten-minute-watchdog.yml','utf8');
 assert.match(native,/types: \[opened, reopened, synchronize, ready_for_review\]/);
 assert.doesNotMatch(native,/types: \[synchronize\]/,'ready/conflict event must use existing native wrapper');
 assert.match(native,/pull_request_review:/);assert.match(native,/workflow_run:/);
 assert.match(native,/Verify live PR and completed exact-head CI/);
 assert.match(native,/Enable native auto-merge for this exact head/);
 assert.doesNotMatch(watchdog,/^  pull_request_target:/m);
 assert.match(native,/publishReadyStage\(\{github,context\}\)/);
 assert.match(native,/ci-pr-conflict-event-handoff\.cjs/);
});

test('manual DIRTY conflict with an existing queue hint remains eligible only for read-only triage',async()=>{
 const current=source(['hh:repair-manual','hh:conflict-repair-needed']);
 const {validReadOnlyConflict}=require('../scripts/ci-pr-queue-dispatcher.cjs');
 assert.equal(laneOf(current),'conflict');
 assert.equal(validReadOnlyConflict(current),true);
 assert.equal(validReadOnlyConflict(source(['hh:hold','hh:repair-manual','hh:conflict-repair-needed'])),false);
 assert.equal(validReadOnlyConflict(source(['hh:repair-manual','hh:conflict-repair-needed'],{
  mergeable:true,mergeable_state:'clean'})),false);
 let dispatched=0,wrote=0;
 const github={rest:{pulls:{get:async()=>({data:current})},
  issues:{addLabels:async()=>{wrote++;}}}};
 const r=await run({github,core,context:event(),dispatchRun:async args=>{
  dispatched++;assert.equal(args.focusPrSnapshot,current);
  return {manualConflictHandoffs:0,dispatchAccepted:0,blocked:{CONFLICT_ALREADY_HANDED_OFF:1},
   reason:'AWAITING_SEMANTIC_CONFLICT_REPAIR'};
 }});
 assert.equal(dispatched,1);assert.equal(wrote,0);
 assert.equal(r.outcome,'CONFLICT_QUEUE_PENDING_OR_BLOCKED');
 assert.equal(r.reason,'AWAITING_SEMANTIC_CONFLICT_REPAIR');
 assert.equal(r.nextAction,'SEMANTIC_OWNER_REPAIR_AND_EXACT_HEAD_CI');
 assert.equal(r.sourceCommitVerified,false);
 assert.equal(r.mergeAuthorized,false);
});
test('manual conflict after queue retirement cannot recreate an endless conflict-label loop',async()=>{
 const current=source(['hh:repair-manual']);
 let writes=0,dispatches=0;
 const github={rest:{pulls:{get:async()=>({data:current})},
  issues:{addLabels:async()=>{writes++;}}}};
 const r=await run({github,core,context:event(),dispatchRun:async()=>{dispatches++;}});
 assert.equal(r.outcome,'MANUAL_CONFLICT_AWAITING_SOURCE_PATCH');
 assert.equal(r.reason,'NO_VERIFIED_SEMANTIC_SOURCE_COMMIT');
 assert.equal(r.nextAction,'SEMANTIC_OWNER_REPAIR_AND_EXACT_HEAD_CI');
 assert.equal(writes,0);assert.equal(dispatches,0);
});
test('explicit hard holds report precise reason and never pass into a source or conflict dispatcher',async()=>{
 const cases={
  'hh:hold':'EXPLICIT_OWNER_HOLD',
  'hh:blocked':'POLICY_BLOCKED',
  'hh:worker-claimed':'SOURCE_OWNER_ALREADY_CLAIMED',
  'hh:direction-override:invalid':'INVALID_DIRECTION_OVERRIDE'
 };
 for(const [label,reason] of Object.entries(cases)){
  let writes=0,dispatches=0;
  const github={rest:{pulls:{get:async()=>({data:source([label,'hh:repair-manual'])})},
   issues:{addLabels:async()=>{writes++;}}}};
  const r=await run({github,core,context:event(),
   dispatchRun:async()=>{dispatches++;}});
  assert.equal(r.outcome,'BLOCKED_EXISTING_OWNER_OR_POLICY');
  assert.equal(r.blockingLabel,label);
  assert.equal(r.reason,reason);
  assert.equal(r.nextAction,'REVIEW_EXPLICIT_HOLD_OR_SOURCE_OWNER');
  assert.equal(writes,0);assert.equal(dispatches,0);
 }
});

// PR-local event handling must never run the shared source/CI dispatcher.
// Verified conflict hints are only durable metadata for the existing
// serialized Watchdog, which retains all owner/lease/source safety checks.
test('PR-scoped dirty event verifies hint but never dispatches common writer',async()=>{
 let current=source(),writes=0,reads=0,dispatched=0;
 const github={rest:{pulls:{get:async()=>{reads++;return {data:current};}},
  issues:{addLabels:async args=>{
   writes++;assert.deepEqual(args.labels,['hh:conflict-repair-needed']);
   current=source(['hh:conflict-repair-needed']);return {data:{}};
  }}}};
 const first=await run({github,core,context:event(),queueOnly:true,
  dispatchRun:async()=>{dispatched++;throw Error('shared writer must not run');}});
 assert.equal(first.outcome,'CONFLICT_QUEUE_HINT_VERIFIED');
 assert.equal(first.reason,'SERIALIZED_WATCHDOG_HANDOFF_PENDING');
 assert.equal(first.mergeAuthorized,false);
 assert.equal(first.sourceCommitVerified,false);
 assert.equal(writes,1);assert.equal(reads,2);assert.equal(dispatched,0);
 const next=await run({github,core,context:event(),queueOnly:true,
  dispatchRun:async()=>{dispatched++;throw Error('duplicate shared dispatch');}});
 assert.equal(next.outcome,'CONFLICT_QUEUE_HINT_VERIFIED');
 assert.equal(writes,1,'one durable hint for repeated exact-HEAD events');
 assert.equal(dispatched,0);
});
test('PR-local event never labels stale HEAD, unverified mergeability or held PR',async()=>{
 for(const candidate of [
  source([],{mergeable:null,mergeable_state:'unknown'}),
  source([],{head:{...source().head,sha:'e'.repeat(40)}}),
  source(['hh:hold']),source(['hh:blocked'])
 ]){
  let writes=0,dispatches=0;
  const github={rest:{pulls:{get:async()=>({data:candidate})},
   issues:{addLabels:async()=>{writes++;}}}};
  const result=await run({github,core,context:event(),queueOnly:true,
   dispatchRun:async()=>{dispatches++;}});
  assert.notEqual(result.outcome,'CONFLICT_QUEUE_HINT_VERIFIED');
  assert.equal(writes,0);assert.equal(dispatches,0);
 }
});
