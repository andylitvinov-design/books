'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {summarizeWindow}=require('../scripts/ci-pr-kpi.cjs');
const NOW=Date.parse('2026-11-01T23:00:00Z'),SHA='a'.repeat(40),NEW='b'.repeat(40),MERGE='c'.repeat(40),KEY='d'.repeat(32);
const event=(kind,minutes,extra={})=>({kind,at:new Date(NOW-minutes*60000).toISOString(),pr:7,head:SHA,task:KEY,lane:'repair',...extra});
const complete={tasks:true,ci:true,merges:true,live:true,jobs:true};
test('counts paired receipts and requires same-head merge and explicit live proof',()=>{
 const events=[event('reserved',50),event('dispatched',49),event('claimed',45),
  event('source_committed',40,{newHead:NEW}),event('ci_first_pass',30,{head:NEW}),
  event('ci_green',25,{head:NEW}),event('merged',20,{head:NEW,mergeSha:MERGE,production:true}),
  event('live_verified',10,{head:NEW,mergeSha:MERGE,production:true,aliasVerified:true,smokeVerified:true})];
 const r=summarizeWindow({events,jobs:[],coverage:complete,now:NOW,windowMs:3600000});
 assert.deepEqual(r.kpi.repair_conversion,{numerator:1,denominator:1,percent:100});
 assert.deepEqual(r.kpi.ci_first_pass,{numerator:1,denominator:1,percent:100});
 assert.deepEqual(r.kpi.green_to_merge,{numerator:1,denominator:1,percent:100});
 assert.deepEqual(r.kpi.merge_to_live,{numerator:1,denominator:1,percent:100});
 assert.equal(r.wait_minutes.median,5);
 const invalid=events.map(x=>x.kind==='live_verified'?{...x,smokeVerified:false}:x);
 assert.equal(summarizeWindow({events:invalid,jobs:[],coverage:{...complete,live:false},now:NOW,windowMs:3600000}).kpi.merge_to_live,null);
});
test('incomplete evidence and empty denominators never become invented rates',()=>{
 const events=[event('claimed',30),event('claimed',29),event('source_committed',20,{newHead:NEW})];
 const partial=summarizeWindow({events,jobs:[],coverage:{...complete,tasks:false},now:NOW,windowMs:3600000});
 assert.equal(partial.kpi.repair_conversion,null);assert.equal(partial.observed.claimed,1);
 const empty=summarizeWindow({events:[],jobs:[],coverage:complete,now:NOW,windowMs:3600000});
 for(const value of Object.values(empty.kpi))assert.equal(value,null);
});
test('old, malformed and mismatched evidence cannot cross-credit PRs or source heads',()=>{
 const events=[event('claimed',30),event('source_committed',25,{task:'e'.repeat(32),newHead:NEW}),
  event('ci_green',20,{head:NEW}),event('merged',15,{head:SHA,mergeSha:MERGE,production:true}),
  event('live_verified',10,{head:SHA,mergeSha:'f'.repeat(40),production:true,aliasVerified:true,smokeVerified:true}),
  event('claimed',120,{task:'1'.repeat(32)})];
 const r=summarizeWindow({events,jobs:[],coverage:complete,now:NOW,windowMs:3600000});
 assert.equal(r.kpi.repair_conversion,null);assert.equal(r.kpi.green_to_merge,null);
 assert.equal(r.kpi.merge_to_live,null);
});
test('runner-min and queue wait use completed jobs only and mark partial inventory',()=>{
 const jobs=[{id:1,name:'core',created_at:new Date(NOW-600000).toISOString(),started_at:new Date(NOW-480000).toISOString(),completed_at:new Date(NOW-180000).toISOString(),status:'completed'},
 {id:2,name:'core',created_at:new Date(NOW-500000).toISOString(),started_at:new Date(NOW-440000).toISOString(),completed_at:new Date(NOW-320000).toISOString(),status:'completed'}];
 const r=summarizeWindow({events:[],jobs,coverage:complete,now:NOW,windowMs:3600000});
 assert.equal(r.runner_minutes,7);assert.equal(r.queue_wait_minutes.median,1.5);assert.equal(r.expensive_checks[0].runner_minutes,7);
 const p=summarizeWindow({events:[],jobs,coverage:{...complete,jobs:false},now:NOW,windowMs:3600000});
 assert.equal(p.runner_minutes,null);assert.equal(p.expensive_checks,null);
 assert.equal(p.job_sample.runner_minutes,7);assert.equal(p.job_sample.label,'SAMPLE_NOT_TOTAL');
});


test('pending work is excluded until an explicit terminal outcome exists',()=>{
 const pending=[event('claimed',30),event('ci_green',20),event('merged',15,{head:NEW,mergeSha:MERGE,production:true})];
 const r=summarizeWindow({events:pending,jobs:[],coverage:complete,now:NOW,windowMs:3600000});
 assert.equal(r.kpi.repair_conversion,null);assert.equal(r.kpi.green_to_merge,null);assert.equal(r.kpi.merge_to_live,null);
 const terminal=[...pending,event('manual',10),event('closed_unmerged',9),
  event('live_failed',8,{head:NEW,mergeSha:MERGE,production:true})];
 const done=summarizeWindow({events:terminal,jobs:[],coverage:complete,now:NOW,windowMs:3600000});
 assert.equal(done.kpi.repair_conversion.numerator,0);assert.equal(done.kpi.green_to_merge.numerator,0);
 assert.equal(done.kpi.merge_to_live.numerator,0);
});
test('a reservation before the window remains available for a claim inside it',()=>{
 const events=[event('reserved',70),event('claimed',50),event('manual',40)];
 const r=summarizeWindow({events,jobs:[],coverage:complete,now:NOW,windowMs:3600000});
 assert.equal(r.wait_minutes.median,20);assert.equal(r.kpi.repair_conversion.denominator,1);
});

test('CI-first-pass cohort includes commits whose claim predates the reporting window',()=>{
 const events=[event('claimed',70),event('source_committed',50,{newHead:NEW}),event('ci_first_pass',40,{head:NEW})];
 const r=summarizeWindow({events,jobs:[],coverage:complete,now:NOW,windowMs:3600000});
 assert.deepEqual(r.kpi.ci_first_pass,{numerator:1,denominator:1,percent:100});
});
test('stale cancellation is not a completed failed source repair',()=>{
 const events=[event('claimed',30),event('stale',20)];
 const r=summarizeWindow({events,jobs:[],coverage:complete,now:NOW,windowMs:3600000});
 assert.equal(r.kpi.repair_conversion,null);
});

test('contradictory terminal receipts invalidate aggregate rates',()=>{
 const events=[event('claimed',30),event('manual',25),event('source_committed',20,{newHead:NEW})];
 const r=summarizeWindow({events,jobs:[],coverage:complete,now:NOW,windowMs:3600000});
 assert.equal(r.coverage.tasks,false);assert.equal(r.kpi.repair_conversion,null);
});


test('manual conflict triage is not counted as a failed source repair',()=>{
 const events=[event('claimed',30,{lane:'conflict'}),event('manual',20,{lane:'conflict'})];
 const r=summarizeWindow({events,jobs:[],coverage:complete,now:NOW,windowMs:3600000});
 assert.equal(r.observed.claimed,1);assert.equal(r.kpi.repair_conversion,null);
});

test('default-branch merges are reported separately and never counted as production LIVE',()=>{
 const events=[event('merged',20,{head:NEW,mergeSha:MERGE,production:false})];
 const r=summarizeWindow({events,jobs:[],coverage:complete,now:NOW,windowMs:3600000});
 assert.equal(r.observed.merged_all,1);assert.equal(r.observed.merged,0);assert.equal(r.kpi.merge_to_live,null);
});
test('duplicate job IDs invalidate total runner-minute coverage',()=>{
 const job={id:123,name:'build',status:'completed',created_at:new Date(NOW-180000).toISOString(),started_at:new Date(NOW-120000).toISOString(),completed_at:new Date(NOW-60000).toISOString()};
 const result=summarizeWindow({events:[],jobs:[job,job],coverage:complete,now:NOW,windowMs:3600000});
 assert.equal(result.coverage.jobs,false);assert.equal(result.runner_minutes,null);
});
