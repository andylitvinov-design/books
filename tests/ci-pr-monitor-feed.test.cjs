'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {MARKER,buildMonitorSnapshot,parseExisting,renderSnapshot,publishMonitorSnapshot}
  =require('../scripts/ci-pr-monitor-feed.cjs');
const SHA='a'.repeat(40);
const context={repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books',runId:41638664579,sha:SHA,
  eventName:'workflow_dispatch'};
const at='2026-11-03T13:31:09.140Z';
function report(patch={}){return {schema:'HH_CONTROL_DISPATCH_V1',dryRun:false,
  checkedAt:at,discovered:170,production:160,actionable:0,candidates:0,
  inspected:0,dispatchAccepted:0,runnerStartedConfirmed:0,blocked:{},
  blockerExamples:{},reason:'NO_ACTIONABLE_PR',...patch};}
test('zero eligible queue preserves 160 production PRs, never zero global backlog',()=>{
  const snapshot=buildMonitorSnapshot(report(),context);
  assert.equal(snapshot.counts.production_prs,160);
  assert.equal(snapshot.counts.actionable_prs,0);
  assert.equal(snapshot.counts.candidates,0);
  assert.equal(snapshot.delivery_status,'NO_AUTOMATION_ELIGIBLE_TASKS');
  assert.equal(snapshot.source_commit,SHA);
  assert.deepEqual(parseExisting(renderSnapshot(snapshot)),snapshot);
});
test('source proof and stacked parent are explicit, including exact public PR examples',()=>{
  const s=buildMonitorSnapshot(report({actionable:3,candidates:3,inspected:3,
    blocked:{SOURCE_PROOF_MISSING:1,STACKED_PARENT:1},
    blockerExamples:{SOURCE_PROOF_MISSING:[{pr_number:3257,head_sha:'abcdefabcdef'}],
      STACKED_PARENT:[{pr_number:3082,head_sha:'123456abcdef'}]}}),context);
  assert.equal(s.delivery_status,'HANDOFF_BLOCKED');
  assert.equal(s.queue_states.source_proof_missing,1);
  assert.equal(s.queue_states.parent_blocked,1);
  assert.equal(s.counts.worker_dispatches,0);
  assert.equal(s.blocked_examples.SOURCE_PROOF_MISSING[0].pr_number,3257);
});
test('accepted dispatch is not a started Worker runner',()=>{
  const s=buildMonitorSnapshot(report({actionable:2,candidates:2,inspected:2,
    dispatchAccepted:2,runnerStartedConfirmed:0}),context);
  assert.equal(s.counts.dispatch_requests_accepted,2);
  assert.equal(s.counts.worker_dispatches,0);
  assert.equal(s.delivery_status,'DISPATCH_ACCEPTED_RUNNER_NOT_YET_PROVEN');
});
test('reject malformed receipts, negative counters and untrusted branch',()=>{
  const bad=report({actionable:1,candidates:1,inspected:1,blocked:{SOURCE_PROOF_MISSING:-1}});
  assert.throws(()=>buildMonitorSnapshot(bad,context),/INVALID_MONITOR_COUNT/);
  assert.throws(()=>buildMonitorSnapshot(report(),{...context,ref:'refs/heads/feature'}),
    /UNTRUSTED_MONITOR_CONTEXT/);
  assert.throws(()=>parseExisting(MARKER+'invalid'),/MONITOR_FEED_JSON_MISSING/);
  assert.throws(()=>parseExisting('other issue body'),/MONITOR_FEED_MARKER_MISSING/);
});
test('newer existing telemetry cannot be overwritten by delayed older workflow',async()=>{
  let writes=0;
  const previous=buildMonitorSnapshot(report({checkedAt:'2026-11-03T14:00:00.000Z'}),
    {...context,runId:41640000000});
  const github={rest:{issues:{
    get:async args=>{
      assert.equal(args.issue_number,3128);
      return {data:{state:'open',body:renderSnapshot(previous)}};
    },
    update:async()=>{writes++;return {data:{}};}
  }}};
  const outcome=await publishMonitorSnapshot({github,context,report:report()});
  assert.equal(outcome.status,'OLDER_OR_DUPLICATE_DROPPED');
  assert.equal(writes,0);
});
test('fresh verified monitor report updates only the public KPI issue',async()=>{
  let written=null;
  const previous=buildMonitorSnapshot(report({checkedAt:'2026-11-03T12:00:00.000Z'}),
    {...context,runId:41620000000});
  const github={rest:{issues:{
    get:async()=>({data:{state:'open',body:renderSnapshot(previous)}}),
    update:async args=>{written=args;return {data:{}};}
  }}};
  const outcome=await publishMonitorSnapshot({github,context,report:report()});
  assert.equal(outcome.status,'PUBLISHED');
  assert.equal(written.issue_number,3128);
  assert.equal(parseExisting(written.body).counts.production_prs,160);
});
