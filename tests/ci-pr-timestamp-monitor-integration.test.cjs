'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const monitor=require('../scripts/ci-pr-monitor-feed.cjs');
const {rows}=require('../scripts/ci-pr-timestamp-inventory.cjs');
const api=require('../ops/pr-monitor/api/control-tower-stats.js');
const at='2026-11-04T18:00:00Z',owner='andylitvinov-design',repo='books';
const ctx={repo:{owner,repo},ref:'refs/heads/codex/bootstrap-books',runId:41883401234,
 eventName:'schedule',sha:'a'.repeat(40)};
const makePR=(n,patch={})=>({number:n,state:'open',draft:n%3===0,
 head:{sha:n.toString(16).padStart(40,'0')},base:{ref:n<=152?'codex/public-book-library':'feature/work'},
 created_at:'2026-10-21T11:23:00Z',updated_at:'2026-11-04T17:55:00Z',
 labels:n%7===0?[{name:'hh:repair-manual'}]:[],...patch});
const prs=Array.from({length:162},(_,i)=>makePR(i+1));
const report=(time=at,patch={})=>({schema:'HH_CONTROL_DISPATCH_V1',dryRun:false,
 checkedAt:time,discovered:162,production:152,actionable:0,candidates:0,
 inspected:0,dispatchAccepted:0,runnerStartedConfirmed:0,
 inventoryScope:'WATCHDOG_SHARED_SNAPSHOT',blocked:{},...patch});
const previousReport=monitor.buildMonitorSnapshot(report('2026-11-04T17:50:00Z'),{
 ...ctx,runId:41883400000});
const previousBody=monitor.renderSnapshot(previousReport);
function githubStub(body=previousBody) {
 const state={reads:0,writes:0,last:null};
 const github={rest:{issues:{
  get:async()=>{state.reads++;return {data:{state:'open',body}};},
  update:async args=>{state.writes++;state.last=args;return {data:{}};}
 }}};
 return {github,state};
}
test('all 162 PR coverage and provenance published in one existing issue update',async()=>{
 const {github,state}=githubStub();
 const outcome=await monitor.publishMonitorSnapshot({github,context:ctx,report:report(),inventorySnapshot:prs});
 assert.equal(outcome.status,'PUBLISHED');
 assert.equal(state.reads,1);assert.equal(state.writes,1);
 assert.equal(state.last.issue_number,3128);
 const next=monitor.parseExisting(state.last.body);
 assert.equal(next.counts.discovered_open_prs,162);
 assert.equal(next.pr_timestamp_status,'FRESH_ALL_OPEN_PR_OBSERVATIONS');
 assert.equal(next.pr_timestamp_inventory.total,162);
 assert.equal(next.pr_timestamp_inventory.production,152);
 assert.equal(rows(next.pr_timestamp_inventory).size,162);
 assert.ok(state.last.body.length<58000,'one existing public GitHub issue stays within body budget');
 const response=api.normalize(next,Date.parse(at)+60000);
 assert.equal(response.pr_timestamps.status,'VERIFIED_OPEN_PR_METADATA_SNAPSHOT');
 assert.equal(response.pr_timestamps.counts.created_exact,162);
 assert.equal(response.pr_timestamps.counts.draft,54);
 assert.equal(response.pr_timestamps.counts.ready,108);
 assert.equal(response.pr_timestamps.production,152);
});
test('subsequent event-only snapshot keeps last full-scan receipt without inventing new observed time',async()=>{
 const {github,state}=githubStub();
 await monitor.publishMonitorSnapshot({github,context:ctx,report:report(),inventorySnapshot:prs});
 const next=monitor.parseExisting(state.last.body);
 const follow=githubStub(state.last.body),later={...ctx,runId:ctx.runId+1};
 const out=await monitor.publishMonitorSnapshot({github:follow.github,context:later,
  report:report('2026-11-04T18:10:00Z',{inventoryScope:'EVENT_SINGLE_PR',production:1,discovered:1})});
 assert.equal(out.status,'PUBLISHED');
 const copy=monitor.parseExisting(follow.state.last.body);
 assert.equal(copy.pr_timestamp_status,'PRESERVED_PRIOR_FULL_SCAN');
 assert.equal(copy.pr_timestamp_inventory.observed_at,next.pr_timestamp_inventory.observed_at);
 assert.equal(api.normalize(copy,Date.parse('2026-11-04T18:20:00Z')).pr_timestamps.total,162);
});
test('partial or mismatched inventory is rejected without publishing it as complete',async()=>{
 const {github,state}=githubStub();
 await assert.rejects(monitor.publishMonitorSnapshot({github,context:ctx,report:report(),
   inventorySnapshot:prs.slice(0,120)}),/TIMESTAMP_NOT_FULL_WATCHDOG_INVENTORY/);
 assert.equal(state.writes,0);
});
test('new data is visibly observational only: GitHub exact stage events remain unverified',async()=>{
 const {github,state}=githubStub();
 await monitor.publishMonitorSnapshot({github,context:ctx,report:report(),inventorySnapshot:prs});
 const source=monitor.parseExisting(state.last.body);
 assert.equal(source.pr_timestamp_inventory.event_time_coverage,'NOT_ASSESSED_FROM_PR_LIST');
 assert.match(source.pr_timestamp_inventory.stage_clock_kind,/NOT_ACTUAL_TRANSITION_TIME/);
 assert.ok(source.pr_timestamp_inventory.missing_fields_need_native_events.includes('runner_started_at'));
});


test('compact public issue preserves all 162 PR timestamps beside dense blocker history',()=>{
 const snapshot=monitor.buildMonitorSnapshot(report(),ctx);
 const {capture}=require('../scripts/ci-pr-timestamp-inventory.cjs');
 snapshot.pr_timestamp_inventory=capture({prs,observedAt:at,
   productionExpected:152,totalExpected:162});
 snapshot.pr_timestamp_status='FRESH_ALL_OPEN_PR_OBSERVATIONS';
 snapshot.blocker_progress={schema:'HH_P0_BLOCKER_PROGRESS_V1',
   cases:Array.from({length:36},(_,i)=>({
     id:'HH-P0-CORE_REQUIRED_CHECK_FAILED-PR'+(350+i)+'-HEAD'+'a'.repeat(12),
     pr_number:350+i,root_code:'CORE_REQUIRED_CHECK_FAILED',head_sha:'a'.repeat(40),
     previous_head_sha:null,
     source_pr:'https://github.com/andylitvinov-design/books/pull/'+(350+i),
     source_run_url:'https://github.com/andylitvinov-design/books/actions/runs/'+(41900000000+i),
     assigned_owner:null,owner_status:'UNVERIFIED',process_owner:':05 Shared / Core',
     applied_fix:'UNVERIFIED_NOT_CLAIMED',source_fix_sha:null,ci_result:'FAILURE',
     ci_scope:'OBSERVED_REQUIRED_OR_INDEPENDENT_FAILURE_NOT_ALL_CHECKS',
     ci_head_sha:'a'.repeat(40),ci_freshness:'CURRENT_SAMPLE',
     protected_merge_sha:null,production_deployment:null,functional_smoke:null,
     state:'SAME_HEAD_STALLED'
   }))};
 const body=monitor.renderSnapshot(snapshot);
 const previousPrettyLength=body.length-JSON.stringify(snapshot).length+
   JSON.stringify(snapshot,null,2).length;
 assert.ok(previousPrettyLength>58000,'reproduce the previous over-budget bug');
 assert.ok(body.length<58000,'keep verified inventory without losing root history');
 const restored=monitor.parseExisting(body);
 assert.equal(rows(restored.pr_timestamp_inventory).size,162);
 assert.equal(restored.blocker_progress.cases.length,36);
});
