'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parse,report,summarizePR}=require('../ops/pr-monitor/api/ci-journey-summary.js')._test;
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
const B='2026-11-05T16-failure',SRC='a'.repeat(40);
const registration=(id=42068667988)=>({pr:3615,run_id:id,attempt:1,
  source_head:SRC,base:'codex/public-book-library',
  queued_at:'2026-11-05T16:50:57Z',completed_at:'2026-11-05T16:50:57Z',
  pr_created_at:'2026-11-05T16:48:54Z',conclusion:'startup_failure',
  jobs:[],partial_jobs:true,registration_only:true,
  empty_job_reason:'STARTUP_FAILURE_NO_JOBS',
  workflow_url:'https://github.com/andylitvinov-design/books/actions/runs/'+id});
const archiveComment=r=>({user:{login:'github-actions[bot]'},
  body:'<!-- HH_CORE_CI_JOURNEY_SHARD_V1:'+B+' -->\n'+
    JSON.stringify({schema:'HH_CORE_CI_JOURNEY_SHARD_V1',bucket:B,runs:[r]})});
test('jobless Core registration survives archive parse without fabricated jobs',()=>{
 const rec=parse(archiveComment(registration()));
 assert.equal(rec.length,1);
 assert.equal(rec[0].registration_only,true);
 assert.deepEqual(rec[0].jobs,[]);
 assert.equal(rec[0].partial_jobs,true);
 for(const fake of [
  {...registration(),conclusion:'success'},
  {...registration(),partial_jobs:false},
  {...registration(),attempt:2},
  {...registration(),workflow_url:'https://example.com/fake'},
  {...registration(),empty_job_reason:'OTHER'},
  {...registration(),jobs:[{id:88}]}
 ])assert.deepEqual(parse(archiveComment(fake)),[]);
 assert.deepEqual(parse({...archiveComment(registration()),user:{login:'attacker'}}),[]);
});
test('first workflow registration differs from first real job after startup failure',()=>{
 const first=registration(),second={...run(3615,9001,180,186),
   pr_created_at:first.pr_created_at,
   queued_at:'2026-11-05T20:29:20Z',
   completed_at:'2026-11-05T20:34:40Z',
   jobs:[{id:123,queued_at:'2026-11-05T20:29:21Z',
     started_at:'2026-11-05T20:29:30Z',
     completed_at:'2026-11-05T20:34:40Z',
     conclusion:'success',
     url:'https://github.com/andylitvinov-design/books/actions/runs/9001/job/123'}]};
 const row=summarizePR(3615,[first,second]);
 assert.equal(row.first_at,'2026-11-05T16:50:57.000Z');
 assert.equal(row.first_job_started_at,'2026-11-05T20:29:30Z');
 assert.equal(row.jobless_startup_runs,1);
 assert.ok(row.stages_ms.between_waves_unknown>200*60000);
 assert.equal(row.stages_ms.runner_wait,9000);
 assert.ok(row.stages_ms.checks>=5*60000);
 const snapshot=report(source([first,second]),24,Date.parse('2026-11-05T22:00:00Z'));
 assert.equal(snapshot.coverage.jobless_startup_runs,1);
 assert.equal(snapshot.summary.jobless_startup_runs,1);
 assert.equal(snapshot.stage_breakdown.reconciled,true);
});
test('jobless-only PR has coverage but cannot fake zero-minute CI success',()=>{
 const snapshot=report(source([registration()]),24,Date.parse('2026-11-05T22:00:00Z'));
 assert.equal(snapshot.coverage.jobless_startup_only_prs,1);
 assert.equal(snapshot.coverage.jobless_startup_runs,1);
 assert.equal(snapshot.summary.n,0);
 assert.equal(snapshot.summary.average_minutes,null);
 assert.deepEqual(snapshot.rows,[]);
});
