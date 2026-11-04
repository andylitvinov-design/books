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
