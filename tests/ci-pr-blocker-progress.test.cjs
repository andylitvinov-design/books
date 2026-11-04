'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {reconcileBlockerProgress,SCHEMA}=
 require('../scripts/ci-pr-blocker-progress.cjs');
const {buildMonitorSnapshot,parseExisting,renderSnapshot,publishMonitorSnapshot}=
 require('../scripts/ci-pr-monitor-feed.cjs');
const OLD='a'.repeat(40),NEW='b'.repeat(40);
const TIME='2026-11-04T19:40:00.000Z',LATER='2026-11-04T20:40:00.000Z';
const ROOT='MERGE_CONFLICT';
const c=(head=OLD)=>({pr_number:3240,head_sha:head,root_code:ROOT,ci_result:'UNKNOWN'});
const sample=(casesList=[c()],when=TIME)=>({
 checked_at:when,blocker_cases:casesList,
 schema:'HH_WATCHDOG_VERIFIED_SAMPLE_V1',scope:'BOUNDED_DEEP_INSPECTION',
 production_prs:1,inspected:1,mergeConflicts:1,coreFailures:0,
 specialistFailures:0,specialistPolicyHolds:0,releaseGateOnly:0,
 verifiedSourceFailures:0,coreFailureUnverified:0,specialistEvidenceUnverified:0,
 sourceRepairQueued:0,conflictLabelsQueued:0
});
const pr=(head=OLD,assignees=[])=>({
 number:3240,state:'open',draft:false,
 base:{ref:'codex/public-book-library'},head:{sha:head},
 assignees,user:{login:'andylitvinov-design'},
 created_at:'2026-11-04T18:00:00Z',updated_at:'2026-11-04T18:40:00Z',labels:[]
});
function run({prior=null,head=OLD,cas=[c(head)],observedAt=TIME,inventory=[pr(head)]}={}){
 return reconcileBlockerProgress({previous:prior,watchdogSample:sample(cas,observedAt),
  inventorySnapshot:inventory,observedAt});
}
test('P0 verified root links exact PR/HEAD and never fabricates owner, code fix, green, merge or LIVE',()=>{
 const s=run();
 assert.equal(s.schema,SCHEMA);
 assert.equal(s.active_tracked,1);
 assert.equal(s.new_confirmed,1);
 assert.equal(s.complete_root_inventory,false);
 assert.equal(s.cases[0].pr_number,3240);
 assert.equal(s.cases[0].head_sha,OLD);
 assert.equal(s.cases[0].source_pr,
  'https://github.com/andylitvinov-design/books/pull/3240');
 assert.equal(s.cases[0].owner_status,'UNVERIFIED');
 assert.equal(s.cases[0].assigned_owner,null);
 assert.equal(s.cases[0].applied_fix,'UNVERIFIED_NOT_CLAIMED');
 assert.equal(s.cases[0].source_fix_sha,null);
 assert.equal(s.cases[0].protected_merge_sha,null);
 assert.equal(s.cases[0].functional_smoke,null);
 assert.equal(s.functional_live_verified,0);
 assert.equal(s.untracked_due_to_limit,0);
});
test('P0 next cycle same HEAD is STALLED with no repeated false repair claim',()=>{
 const first=run();
 const next=run({prior:first,observedAt:LATER});
 assert.equal(next.cases[0].state,'SAME_HEAD_STALLED');
 assert.equal(next.same_head_stalled,1);
 assert.equal(next.cases[0].first_seen_at,TIME);
 assert.equal(next.cases[0].last_checked_at,LATER);
 assert.equal(next.actual_fix_verifications,0);
 assert.equal(next.untracked_due_to_limit,0);
});
test('P0 new HEAD without reinspection invalidates stale CI, never proves a fix',()=>{
 const first=run({cas:[{...c(),ci_result:'FAILURE',source_run_id:41789887188}]});
 const next=run({prior:first,observedAt:LATER,cas:[],head:NEW});
 assert.equal(next.cases[0].state,'HEAD_CHANGED_NOT_REINSPECTED');
 assert.equal(next.cases[0].head_sha,NEW);
 assert.equal(next.cases[0].previous_head_sha,OLD);
 assert.equal(next.cases[0].source_run_url,null);
 assert.equal(next.cases[0].ci_result,'UNKNOWN');
 assert.equal(next.cases[0].ci_head_sha,null);
 assert.equal(next.head_changed_reverify,1);
 assert.equal(next.cases[0].source_fix_sha,null);
 assert.equal(next.cases[0].protected_merge_sha,null);
});
test('P0 changed HEAD confirmed in a fresh inspection is still not green or LIVE',()=>{
 const first=run({cas:[{...c(),ci_result:'FAILURE'}]});
 const next=run({prior:first,cas:[c(NEW)],head:NEW,observedAt:LATER});
 assert.equal(next.cases[0].state,'HEAD_CHANGED_REVERIFY');
 assert.equal(next.cases[0].previous_head_sha,OLD);
 assert.equal(next.cases[0].ci_head_sha,NEW);
 assert.equal(next.cases[0].ci_freshness,'CURRENT_SAMPLE');
 assert.equal(next.cases[0].applied_fix,'UNVERIFIED_NOT_CLAIMED');
 assert.equal(next.cases[0].protected_merge_sha,null);
});
test('P0 missing from bounded scan does not equal resolved or merged',()=>{
 const first=run();
 const next=run({prior:first,cas:[],observedAt:LATER,inventory:[pr()]});
 assert.equal(next.cases[0].state,'NOT_REINSPECTED');
 assert.equal(next.cases[0].last_checked_at,TIME);
 assert.equal(next.cases[0].ci_freshness,'STALE_OBSERVATION');
 assert.equal(next.protected_merges_verified,0);
 const closedUnknown=run({prior:first,cas:[],observedAt:LATER,inventory:[]});
 assert.equal(closedUnknown.cases[0].state,'NOT_IN_OPEN_INVENTORY_UNVERIFIED');
 assert.equal(closedUnknown.open_inventory_missing_unverified,1);
});
test('P0 names only explicitly assigned GitHub owner, never PR author as owner',()=>{
 const first=run({inventory:[pr(OLD,[{login:'trusted-owner'}])]});
 assert.deepEqual(first.cases[0].assigned_owner,['trusted-owner']);
 assert.equal(first.cases[0].owner_status,'GITHUB_ASSIGNEE');
 const unassigned=run();
 assert.equal(unassigned.cases[0].assigned_owner,null);
});
test('P0 keeps every distinct confirmed root case even above the old 16-row limit',()=>{
 const cases=Array.from({length:17},(_,i)=>({...c(),pr_number:3240+i}));
 const progress=run({cas:cases});
 assert.equal(progress.active_tracked,17);
 assert.equal(progress.untracked_due_to_limit,0);
 assert.equal(progress.cases.at(-1).pr_number,3256);
});
test('P0 collector rejects malformed or made-up blocker evidence',()=>{
 assert.throws(()=>reconcileBlockerProgress({observedAt:TIME,
  watchdogSample:sample([{...c(),head_sha:'short'}])}),
 /INVALID_EXACT_HEAD_BLOCKER_CASES/);
 assert.throws(()=>reconcileBlockerProgress({observedAt:TIME,
  watchdogSample:sample(Array.from({length:33},()=>c()))}),
 /INVALID_EXACT_HEAD_BLOCKER_CASES/);
});
const context={repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',runId:41897382294,
 eventName:'workflow_dispatch',sha:'c'.repeat(40)};
const rawReport=(at=TIME)=>({
 schema:'HH_CONTROL_DISPATCH_V1',checkedAt:at,dryRun:false,
 production:1,discovered:1,actionable:0,candidates:0,inspected:0,
 dispatchAccepted:0,runnerStartedConfirmed:0,blocked:{},
 inventoryScope:'ALL_OPEN_PRS'
});
test('P0 existing monitor persists real root-by-PR and compares next cycle without a new API scan',async()=>{
 let body=null,writes=0;
 const old=buildMonitorSnapshot(rawReport('2026-11-04T18:40:00.000Z'),context);
 const github={rest:{issues:{
  get:async()=>({data:{state:'open',body:body||renderSnapshot(old)}}),
  update:async args=>{writes++;body=args.body;return {data:{}}}
 }}};
 const observation={...sample(),production:1,checkedAt:TIME,blockerCases:[c()]};
 delete observation.checked_at;delete observation.blocker_cases;
 const first=await publishMonitorSnapshot({github,context,
  report:{...rawReport(),watchdogSample:observation}});
 assert.equal(first.status,'PUBLISHED');
 let decoded=parseExisting(body);
 assert.equal(decoded.blocker_progress.cases[0].state,'NEW_CONFIRMED');
 assert.equal(decoded.blocker_progress.cases[0].pr_number,3240);
 assert.equal(decoded.watchdog_sample.blocker_cases,undefined,'do not duplicate cases in issue body');
 const second=await publishMonitorSnapshot({github,context,
  report:{...rawReport(LATER),watchdogSample:{...observation,checkedAt:LATER}}});
 assert.equal(second.status,'PUBLISHED');
 decoded=parseExisting(body);
 assert.equal(decoded.blocker_progress.cases[0].state,'SAME_HEAD_STALLED');
 assert.equal(decoded.blocker_progress.cases[0].protected_merge_sha,null);
 assert.equal(writes,2);
});
test('P0 monitor refuses forged current-head facts before issuing status',()=>{
 const fake={...sample(),production:1,checkedAt:TIME,blockerCases:[c()]};
 delete fake.checked_at;delete fake.blocker_cases;
 const report={...rawReport(),watchdogSample:{...fake,blockerCases:[
  {...c(),pr_number:-1}]}};
 assert.throws(()=>buildMonitorSnapshot(report,context),/INVALID_MONITOR_BLOCKER_CASES/);
});
