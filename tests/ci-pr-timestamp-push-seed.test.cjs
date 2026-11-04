'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const monitor=require('../scripts/ci-pr-monitor-feed.cjs');
const base='2026-11-04T18:03:00Z',fresh='2026-11-04T18:30:00Z';
const context={repo:{owner:'andylitvinov-design',repo:'books'},ref:'refs/heads/codex/bootstrap-books',
 runId:41890123456,eventName:'push',sha:'a'.repeat(40)};
const previous=monitor.buildMonitorSnapshot({schema:'HH_CONTROL_DISPATCH_V1',dryRun:false,
 checkedAt:base,production:1,discovered:1,actionable:0,candidates:0,inspected:0,
 dispatchAccepted:0,runnerStartedConfirmed:0,blocked:{}},{...context,runId:41882345678});
const makePr=(n,sha)=>({number:n,state:'open',draft:false,
  head:{sha},base:{ref:'codex/public-book-library'},labels:[],
  created_at:'2026-10-20T14:00:00Z',updated_at:'2026-11-04T18:25:00Z'});
const prs=[makePr(10,'a'.repeat(40)),makePr(11,'b'.repeat(40))];
function stub(initial=monitor.renderSnapshot(previous)){
 let reads=0,writes=[];
 return {github:{rest:{issues:{
  get:async()=>{reads++;return {data:{state:'open',body:initial}};},
  update:async a=>{writes.push(a);return {data:{}};}
 }}},stats:()=>({reads,writes})};
}
test('inspection-only trusted push seeds full PR timestamps while KPI clock remains old',async()=>{
 const f=stub(),r=await monitor.publishTimestampInventoryOnly({
   github:f.github,context,watchdog:{dryRun:true,checkedAt:fresh,
     inventoryComplete:true,inventoryScope:'ALL_OPEN_PRS',apiRateLimited:false,
     production:2,open:2,prInventorySnapshot:prs}});
 assert.equal(r.status,'PUBLISHED_PR_TIMESTAMPS');
 assert.equal(f.stats().reads,1);assert.equal(f.stats().writes.length,1);
 const body=f.stats().writes[0].body,source=monitor.parseExisting(body);
 assert.equal(source.checked_at,base,'dry-run must NOT claim fresh current Watchdog KPI');
 assert.equal(source.run_id,previous.run_id,'dry-run must NOT replace true writer run id');
 assert.equal(source.pr_timestamp_inventory.total,2);
 assert.equal(source.pr_timestamp_inventory.production,2);
 assert.equal(source.pr_timestamp_inventory.observed_at,fresh.replace('Z','.000Z'));
 assert.ok(body.length<58000);
});
test('partial single-PR event does not write a bogus full observation',async()=>{
 const f=stub();
 const r=await monitor.publishTimestampInventoryOnly({github:f.github,context,watchdog:{
  dryRun:true,inventoryComplete:true,inventoryScope:'EVENT_SINGLE_PR',
  open:1,production:1,prInventorySnapshot:prs.slice(0,1),checkedAt:fresh}});
 assert.equal(r.status,'NOT_TRUSTED_FULL_INSPECTION');assert.equal(f.stats().reads,0);
});
test('a later observation cannot be replaced by an older push',async()=>{
 const first=stub();
 await monitor.publishTimestampInventoryOnly({github:first.github,context,watchdog:{
  dryRun:true,inventoryComplete:true,inventoryScope:'ALL_OPEN_PRS',
  open:2,production:2,prInventorySnapshot:prs,checkedAt:fresh}});
 const already=stub(first.stats().writes[0].body);
 const r=await monitor.publishTimestampInventoryOnly({github:already.github,context,watchdog:{
  dryRun:true,inventoryComplete:true,inventoryScope:'ALL_OPEN_PRS',
  open:2,production:2,prInventorySnapshot:prs,checkedAt:'2026-11-04T18:20:00Z'}});
 assert.equal(r.status,'ALREADY_FRESHER');assert.equal(already.stats().writes.length,0);
});
test('workflow does not schedule any new runner, only uses original Watchdog push',()=>{
 const s=fs.readFileSync(require('node:path').join(__dirname,
  '../.github/workflows/hh-pr-ten-minute-watchdog.yml'),'utf8');
 assert.match(s,/if\(dryRun&&context\.eventName==='push'/);
 assert.match(s,/publishTimestampInventoryOnly/);
 assert.match(s,/report\.prInventorySnapshot/);
 assert.doesNotMatch(s,/hh-pr-timestamp-new-runner/);
});
