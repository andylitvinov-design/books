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
  assert.equal(snapshot.delivery_status,'OPEN_PR_BACKLOG_NOT_FULLY_TRIAGED');
  assert.equal(snapshot.counts.labeled_outstanding_prs,0);
  assert.equal(snapshot.api_budget.tracked_requests,0);
  assert.equal(snapshot.source_commit,SHA);
  assert.deepEqual(parseExisting(renderSnapshot(snapshot)),snapshot);
  assert.match(renderSnapshot(snapshot), /issues\/3394/);
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


test('public monitor reports denied manual CI wake rather than zero blockers',()=>{
 const s=buildMonitorSnapshot(report({actionable:1,candidates:1,inspected:1,
  blocked:{CI_WAKE_MANUAL_HOLD_UNVERIFIED:1},
  blockerExamples:{CI_WAKE_MANUAL_HOLD_UNVERIFIED:[
   {pr_number:1805,head_sha:'02bc193643df'}]}}),context);
 assert.equal(s.counts.total_blockers,1);
 assert.equal(s.queue_states.ci_wake_manual_hold_unverified,1);
 assert.equal(s.delivery_status,'HANDOFF_BLOCKED');
 assert.equal(s.counts.worker_dispatches,0);
 assert.equal(s.blocked_examples.CI_WAKE_MANUAL_HOLD_UNVERIFIED[0].pr_number,1805);
 assert.deepEqual(parseExisting(renderSnapshot(s)),s);
});
test('recovered stale CI hold stays separate from Worker started or delivered',()=>{
 const s=buildMonitorSnapshot(report({actionable:1,candidates:1,inspected:1,
  ciHoldRecovered:1,blocked:{},runnerStartedConfirmed:0,dispatchAccepted:0}),context);
 assert.equal(s.queue_states.ci_hold_recovered,1);
 assert.equal(s.counts.worker_dispatches,0);
 assert.equal(s.counts.total_blockers,0);
});

test('existing manual/policy labels remain visible despite zero automatic source candidates',()=>{
 const hints={draft:46,hold:70,blocked:3,manual_repair:23,claimed:2,
  specialist:6,gate_review:6,conflict:2,source:0,ci:0,labeled_unique:93};
 const s=buildMonitorSnapshot(report({production:145,discovered:153,
  backlogLabelHints:hints,apiRequests:16,apiRemaining:4870,
  inventoryScope:'ALL_OPEN_PRS'}),context);
 assert.equal(s.delivery_status,'OUTSTANDING_LABELED_WORK_NO_AUTO_DISPATCH');
 assert.equal(s.counts.labeled_outstanding_prs,93);
 assert.equal(s.backlog_label_hints.manual_repair,23);
 assert.equal(s.backlog_label_hints.specialist,6);
 assert.equal(s.counts.total_blockers,0,'sampled failed dispatches are not all blocked PRs');
 assert.equal(s.api_budget.tracked_requests,16);
 assert.equal(s.api_budget.remaining_observed,4870);
 assert.equal(s.api_budget.paused,false);
 assert.deepEqual(parseExisting(renderSnapshot(s)),s);
});
test('event-only scan and rate-limit never claim global zero',()=>{
 const event=buildMonitorSnapshot(report({production:1,
  inventoryScope:'EVENT_SINGLE_PR',backlogLabelHints:{draft:0}}),context);
 assert.equal(event.delivery_status,'EVENT_PR_NOT_ACTIONABLE');
 const paused=buildMonitorSnapshot(report({production:0,
  reason:'API_PAUSED_INVENTORY',apiRequests:1,
  apiPauseReason:'PRIMARY_RATE_LIMIT',apiRemaining:0}),context);
 assert.equal(paused.delivery_status,'API_PAUSED_SNAPSHOT_INCOMPLETE');
 assert.equal(paused.api_budget.paused,true);
 assert.equal(paused.counts.production_prs,0);
});
test('label hint classifier is read-only, overlapping counts are not double-counted',()=>{
 const {backlogLabelHints}=require('../scripts/ci-pr-queue-dispatcher.cjs');
 const rows=[
  {draft:true,labels:[{name:'hh:repair-manual'},{name:'hh:specialist-repair-needed'}]},
  {draft:false,labels:[{name:'hh:hold'},{name:'hh:conflict-repair-needed'}]},
  {draft:false,labels:[]}
 ];
 const found=backlogLabelHints(rows);
 assert.equal(found.draft,1);assert.equal(found.manual_repair,1);
 assert.equal(found.specialist,1);assert.equal(found.conflict,1);
 assert.equal(found.hold,1);assert.equal(found.labeled_unique,2);
 assert.throws(()=>backlogLabelHints(null),/INVALID_BACKLOG_INVENTORY/);
});
test('malformed negative or oversized label hints fail closed',()=>{
 assert.throws(()=>buildMonitorSnapshot(report({
  backlogLabelHints:{labeled_unique:-1}}),context),/INVALID_MONITOR_COUNT/);
 assert.throws(()=>buildMonitorSnapshot(report({
  production:2,backlogLabelHints:{labeled_unique:3}}),context),
  /BACKLOG_LABEL_HINTS_EXCEED_INVENTORY/);
});

test('verified bounded inspection publishes nonzero blockers without overlap inflation',()=>{
 const sample={schema:'HH_WATCHDOG_VERIFIED_SAMPLE_V1',
  scope:'BOUNDED_DEEP_INSPECTION',checkedAt:at,production:160,
  inspected:16,mergeConflicts:8,coreFailures:8,specialistFailures:6,
  specialistPolicyHolds:0,releaseGateOnly:0,verifiedSourceFailures:0,
  coreFailureUnverified:0,specialistEvidenceUnverified:0,
  sourceRepairQueued:0,conflictLabelsQueued:0};
 const monitor=buildMonitorSnapshot(report({
  watchdogSample:sample,watchdogSampleStatus:'VERIFIED_BOUNDED_SAMPLE',
  backlogLabelHints:{labeled_unique:101}}),context);
 assert.equal(monitor.watchdog_sample_status,'VERIFIED_BOUNDED_SAMPLE');
 assert.equal(monitor.watchdog_sample.inspected,16);
 assert.equal(monitor.counts.verified_blocked_lower_bound,8);
 assert.equal(monitor.counts.labeled_outstanding_prs,101);
 assert.equal(monitor.delivery_status,'VERIFIED_BLOCKED_WORK_NO_AUTO_SOURCE_REPAIR');
 assert.equal(monitor.counts.total_blockers,0,
  'legacy total_blockers counts only denied attempts, not all backlog roots');
 assert.deepEqual(parseExisting(renderSnapshot(monitor)),monitor);
 assert.throws(()=>buildMonitorSnapshot(report({
  watchdogSample:{...sample,coreFailures:17}}),context),/WATCHDOG_SAMPLE_EXCEEDS_INSPECTION/);
 assert.throws(()=>buildMonitorSnapshot(report({
  production:3,watchdogSample:sample}),context),/INVALID_VERIFIED_WATCHDOG_SAMPLE/);
});
test('verified zero inspection is incomplete, not proof of zero blocked PRs',()=>{
 const sample={schema:'HH_WATCHDOG_VERIFIED_SAMPLE_V1',
  scope:'BOUNDED_DEEP_INSPECTION',checkedAt:at,production:160,inspected:0,
  mergeConflicts:0,coreFailures:0,specialistFailures:0,
  specialistPolicyHolds:0,releaseGateOnly:0,verifiedSourceFailures:0,
  coreFailureUnverified:0,specialistEvidenceUnverified:0,
  sourceRepairQueued:0,conflictLabelsQueued:0};
 const snapshot=buildMonitorSnapshot(report({watchdogSample:sample}),context);
 assert.equal(snapshot.delivery_status,'WATCHDOG_DEEP_INSPECTION_INCOMPLETE');
 assert.equal(snapshot.watchdog_sample.inspected,0);
});
