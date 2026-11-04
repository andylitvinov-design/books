'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {report,summarizePR}=require('../ops/pr-monitor/api/ci-journey-summary.js')._test;
const NOW=Date.parse('2026-11-04T17:00:00.000Z');
const at=minutes=>new Date(NOW+minutes*60000).toISOString();
const job=(id,start,end)=>({id,queued_at:at(start),started_at:at(start),
  completed_at:at(end),name:'hh-core',conclusion:'success'});
const run=(pr,id,start,end,jobs=[job(id,start,end)])=>({
  pr,run_id:id,attempt:1,queued_at:at(start),completed_at:at(end),
  pr_created_at:at(start-1),merged_at:null,
  source_head:'a'.repeat(40),conclusion:'success',
  jobs,partial_jobs:false,workflow_url:'https://github.com/andylitvinov-design/books/actions/runs/'+id
});
const source=runs=>({runs,comments:1,pagination_partial:false,remaining:55,stale:false,
  fetched_at:at(-1)});
test('parallel jobs count once on real PR wall clock',()=>{
 const observed=summarizePR(12,[run(12,101,-40,-30,
   [job(201,-40,-30),job(202,-37,-32)])]);
 assert.equal(observed.elapsed_ms,600000);
 assert.equal(observed.stages_ms.checks,600000);
 assert.equal(observed.stages_ms.other_unknown,0);
});
test('gap between repeated runs stays unknown',()=>{
 const r1=run(13,103,-50,-45),r2=run(13,104,-42,-38);
 const row=summarizePR(13,[r1,r2]);
 assert.equal(row.runs,2);
 assert.equal(row.repeats,1);
 assert.equal(row.stages_ms.between_waves_unknown,180000);
 assert.equal(Object.values(row.stages_ms).reduce((a,b)=>a+b,0),row.elapsed_ms);
});
test('per PR mean contributions add up to mean total in same cohort',()=>{
 const obs=report(source([
  run(12,101,-40,-30,[job(201,-40,-30),job(202,-37,-32)]),
  run(13,103,-50,-45),run(13,104,-42,-38)
 ]),24,NOW);
 const x=obs.stage_breakdown;
 assert.equal(x.n,2);
 assert.equal(obs.summary.n,2);
 assert.equal(x.reconciled,true);
 assert.equal(x.observed_elapsed_ms,Object.values(x.stage_total_ms).reduce((a,b)=>a+b,0));
 const sum=Object.values(x.mean_minutes_per_pr).reduce((a,b)=>a+b,0);
 assert.ok(Math.abs(sum-obs.summary.average_minutes)<=0.03);
 assert.ok(x.prs_with_observed_span.between_waves_unknown>=1);
});
test('sample totals cover every PR even when top list truncates at 250',()=>{
 const runs=Array.from({length:251},(_,i)=>run(i+1,i+1000,-40,-30));
 const obs=report(source(runs),24,NOW);
 assert.equal(obs.summary.n,251);
 assert.equal(obs.stage_breakdown.n,251);
 assert.equal(obs.rows.length,250);
 assert.equal(obs.coverage.rows_total,251);
 assert.equal(obs.coverage.rows_returned,250);
 assert.equal(obs.stage_breakdown.total_mean_minutes,10);
 assert.equal(obs.stage_breakdown.mean_minutes_per_pr.checks,10);
});