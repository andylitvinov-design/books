'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const m=require('../ci-verified-model.cjs');
const now=Date.parse('2026-11-07T13:00:00Z');
const iso=delta=>new Date(now-delta*60000).toISOString();
const run=(id,name,age,status='in_progress')=>({id,name,created_at:iso(age),status,html_url:`https://github.com/andylitvinov-design/books/actions/runs/${id}`});
const job=(id,status,age,run_id=1)=>({id,run_id,status,created_at:iso(age),started_at:iso(age)});
test('completed jobs never inflate live CI, stale source flagged red',()=>{
 const x=m.evaluateRun(run(1,'HH PR core release gate',300),{total_count:2,jobs:[job(11,'completed',290),job(12,'completed',285)]},now);
 assert.equal(x.running_jobs,0);assert.equal(x.stale,true);
 assert.equal(x.reason,'WORKFLOW_ACTIVE_AFTER_ALL_JOBS_FINISHED');
});
test('recent CI and other jobs separated with workflow classification',()=>{
 const a=m.evaluateRun(run(1,'HH PR core release gate',5),{total_count:1,jobs:[job(11,'in_progress',4)]},now);
 const b=m.evaluateRun(run(2,'HH native auto-merge',6),{total_count:1,jobs:[job(21,'in_progress',2,2)]},now);
 assert.equal(a.kind,'ci');assert.equal(a.running_jobs,1);assert.equal(b.kind,'other');assert.equal(b.running_jobs,1);
});
test('stale queued workflow with no jobs is visible but not running',()=>{
 const x=m.evaluateRun(run(1,'HH PR core release gate',100,'queued'),{total_count:0,jobs:[]},now);
 assert.equal(x.running_jobs,0);assert.equal(x.queued_jobs,0);assert.equal(x.stale,true);
});
test('old in_progress job is excluded from fresh load and labeled',()=>{
 const x=m.evaluateRun(run(1,'HH PR core release gate',200),{total_count:1,jobs:[job(11,'in_progress',190)]},now);
 assert.equal(x.running_jobs,0);assert.equal(x.aged_jobs,1);assert.equal(x.stale,true);
});
test('incomplete job inventory must not become a fabricated exact zero',()=>{
 const v=m.evaluateRun.bind(null,run(1,'HH PR core release gate',3),{total_count:3,jobs:[job(11,'completed',2)]},now);
 assert.throws(v,/INCOMPLETE_JOB_PAGE/);
});
test('hour chart separates non-skipped CI and non-CI and tracks coverage',()=>{
 const x=m.series({total_count:3,workflow_runs:[
   {...run(1,'HH PR core release gate',8),conclusion:null},
   {...run(2,'HH native auto-merge',9),conclusion:'success'},
   {...run(3,'HH PR core release gate',10),conclusion:'skipped'}]},now);
 assert.equal(x.bins.reduce((n,y)=>n+y.ci,0),1);
 assert.equal(x.bins.reduce((n,y)=>n+y.other,0),1);
 assert.equal(x.complete,true);
});
test('five status responses with missing jobs mark coverage partial and not fake load',()=>{
 const rows=['in_progress','queued','waiting','pending','requested'].map(status=>({total_count:status==='in_progress'?1:0,workflow_runs:status==='in_progress'?[run(1,'HH PR core release gate',6)]:[]}));
 const a=m.summarize({statusPages:rows,jobPages:{},recent:{total_count:0,workflow_runs:[]},scheduled:{workflow_runs:[]}},now);
 assert.equal(a.coverage.complete,false);assert.equal(a.incomplete.length,1);
});
test('schedule delayed even when workflow configured 10-min cron',()=>{
 const a=m.scheduleHealth({workflow_runs:[{...run(1,'HH PR 10-minute watchdog',122),event:'schedule'}]},now);
 assert.equal(a.status,'DELAYED');assert.equal(a.rows[0].age_minutes,122);
});

test('an old in-progress workflow with no jobs is stale, not running',()=>{
 const x=m.evaluateRun(run(1,'HH PR core release gate',95),{total_count:0,jobs:[]},now);
 assert.equal(x.stale,true);assert.equal(x.reason,'WORKFLOW_ACTIVE_WITHOUT_JOBS');
});
test('oldest stale runs get sampled even after fresh CI fanout',()=>{
 const rows=Array.from({length:20},(_,i)=>run(20-i,'HH PR core release gate',i+1));
 const chosen=m.prioritySample(rows,8);
 assert.equal(chosen.length,8);assert.deepEqual(chosen.map(x=>x.id),[20,19,18,17,1,2,3,4]);
});
test('pull_request workflows without descriptive names are still CI, watcher is other',()=>{
 assert.equal(m.type('HH Personal Coaching Session','pull_request'),'ci');
 assert.equal(m.type('HH PR 10-minute watchdog','pull_request_target'),'other');
 assert.equal(m.type('Home language switch first-click regression','push'),'ci');
});
test('one failed status lookup preserves partial counts',()=>{
 const pages=['in_progress','queued','waiting','pending','requested'].map((s,i)=>
   i===1?{read_failed:true}:({total_count:0,workflow_runs:[]}));
 const result=m.summarize({statusPages:pages,jobPages:{},recent:null,scheduled:null},now);
 assert.equal(result.coverage.complete,false);
 assert.equal(result.coverage.observed_statuses,4);
 assert.equal(result.trend.bins,null);
});

test('oldest queued page exposes old jobless incident records missed by newest 100',()=>{
 const page=['in_progress','queued','waiting','pending','requested'].map(status=>({
   total_count:status==='queued'?103:0,
   workflow_runs:status==='queued'
     ?Array.from({length:100},(_,i)=>run(200-i,'HH PR core release gate',i+2,'queued'))
     :[]
 }));
 const oldest={total_count:103,workflow_runs:[
   run(100,'HH PR core release gate',350,'queued'),
   run(99,'HH PR core release gate',450,'queued'),
   run(98,'HH PR core release gate',900,'queued')
 ]};
 const proof=m.verifiedHistoricalQueued(page,oldest);
 assert.equal(proof.status,'VERIFIED_LAST_PAGE');
 assert.deepEqual(proof.runs.map(x=>x.id),[100,99,98]);
 const result=m.summarize({statusPages:page,oldestQueuedPage:oldest,
   jobPages:{98:{total_count:0,jobs:[]}},
   recent:{total_count:0,workflow_runs:[]},scheduled:{workflow_runs:[]}},now,8);
 assert.equal(result.coverage.complete,false,'middle queued page never claimed complete');
 assert.equal(result.coverage.oldest_queued_page,'VERIFIED_LAST_PAGE');
 assert.equal(result.coverage.oldest_queued_run_candidates,3);
 assert.equal(result.coverage.oldest_queued_verified,1);
 assert.equal(result.stale.some(x=>x.id===98&&x.reason==='QUEUED_WORKFLOW_WITHOUT_JOBS'),true);
 assert.equal(result.ci.running_jobs,0,'GitHub ghost is NOT a running job');
});
test('changed or duplicate last page never invents ghost workload proof',()=>{
 const statuses=['in_progress','queued','waiting','pending','requested'].map(s=>({
   total_count:s==='queued'?101:0,
   workflow_runs:s==='queued'
     ?Array.from({length:100},(_,i)=>run(200-i,'HH PR core release gate',i+2,'queued'))
     :[]
 }));
 const invalid=[
   {total_count:102,workflow_runs:[run(100,'HH PR core release gate',900,'queued')]},
   {total_count:101,workflow_runs:[run(101,'HH PR core release gate',900,'queued')]},
   {total_count:101,workflow_runs:[run(100,'HH PR core release gate',900,'in_progress')]},
   {total_count:101,workflow_runs:[]},
   null
 ];
 for(const page of invalid){
   const proof=m.verifiedHistoricalQueued(statuses,page);
   assert.equal(proof.status,'UNVERIFIED_LAST_PAGE');
   assert.deepEqual(proof.runs,[]);
 }
});
