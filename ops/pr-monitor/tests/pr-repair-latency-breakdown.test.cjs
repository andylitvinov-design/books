'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {breakdownCycle,enrichRepairCycles}=require('../pr-repair-latency-breakdown.cjs');
const HEAD='a'.repeat(40),NEXT='b'.repeat(40),TASK='c'.repeat(32);
const iso=x=>'2026-11-07T'+x+':00Z';
const cycle={failed_head:HEAD,next_head:NEXT,failed_run_id:101,next_run_id:102,
  timestamps:{ci_failed_at:iso('10:00'),new_ci_created_at:iso('10:39')},
  links:{next_ci:'https://github.com/andylitvinov-design/books/actions/runs/102'}};
const source={claimed:'repair_worker_claim',repair_started:'github_actions_fix_step',
  patch_verified:'github_actions_patch_verification_step',source_published:'verified_git_ref'};
const event=(stage,at,extra={})=>({kind:'stage',verified:true,pr:27,head:HEAD,stage,
  source:source[stage],at:iso(at),task:TASK,runId:333,newHead:stage==='source_published'?NEXT:null,
  url:'https://github.com/andylitvinov-design/books/issues/27#issuecomment-1',...extra});
const full=[event('claimed','10:07'),event('repair_started','10:12'),
  event('patch_verified','10:27'),event('source_published','10:36')];
const measure=arr=>breakdownCycle(cycle,arr,27);

test('exact same task/run verified stages provide five exclusive durations',()=>{
 const res=measure(full);
 assert.equal(res.status,'COMPLETE');
 assert.deepEqual(res.phases.map(x=>x.minutes),[7,5,15,9,3]);
 assert.equal(res.total_minutes,39);
 assert.equal(res.observed_minutes,39);
 assert.equal(res.unattributed_minutes,0);
 assert.equal(res.reconciled,true);
 assert.equal(res.worker_run_id,333);
 assert.equal(res.timestamps.patch_verified,iso('10:27'));
});
test('missing patch verification cannot make repair look like publisher wait',()=>{
 const res=measure(full.filter(x=>x.stage!=='patch_verified'));
 assert.deepEqual(res.phases.map(x=>x.minutes),[7,5,null,null,3]);
 assert.equal(res.unattributed_minutes,24);
 assert.equal(res.status,'PARTIAL');
});
test('missing claim or repair marker leaves only adjacent verified links',()=>{
 const noClaim=measure(full.filter(x=>x.stage!=='claimed'));
 assert.deepEqual(noClaim.phases.map(x=>x.minutes),[null,null,15,9,3]);
 assert.equal(noClaim.unattributed_minutes,12);
 const noRepair=measure(full.filter(x=>x.stage!=='repair_started'));
 assert.deepEqual(noRepair.phases.map(x=>x.minutes),[7,null,null,9,3]);
 assert.equal(noRepair.unattributed_minutes,20);
});
test('same source SHA but other worker/task or other next head never authorizes attribution',()=>{
 for(const changed of [{runId:334},{task:'d'.repeat(32)},{pr:99},{head:'f'.repeat(40)},
   {source:'arbitrary'},{verified:false}]){
  const arr=full.map(x=>x.stage==='patch_verified'?{...x,...changed}:x);
  assert.equal(measure(arr).phases[2].minutes,null,JSON.stringify(changed));
  assert.equal(measure(arr).phases[3].minutes,null,JSON.stringify(changed));
 }
 assert.equal(measure(full.map(x=>x.stage==='source_published'?{...x,newHead:'d'.repeat(40)}:x)).status,'UNKNOWN');
 assert.equal(measure(full.filter(x=>x.stage!=='source_published')).status,'UNKNOWN');
 assert.equal(measure([...full,full[3]]).status,'UNKNOWN');
});
test('out-of-order patch event does not become legitimate verified patch',()=>{
 const res=measure(full.map(e=>e.stage==='patch_verified'?{...e,at:iso('10:38')}:e));
 assert.equal(res.timestamps.patch_verified,null);
 assert.deepEqual(res.phases.map(x=>x.minutes),[7,5,null,null,3]);
 assert.equal(res.unattributed_minutes,24);
 const d=breakdownCycle({...cycle,next_head:null},full,27);
 assert.equal(d.total_minutes,null);
 assert.equal(d.reconciled,false);
});
test('per-PR report enrichment keeps its own denominator and does not double-count',()=>{
 const report={schema:'HH_PR_REPAIR_CYCLE_V1',pr:27,cycles:[cycle,
   {...cycle,failed_run_id:103,next_run_id:104,next_head:'f'.repeat(40)}]};
 const enriched=enrichRepairCycles(report,full);
 assert.equal(enriched.cycles[0].latency.status,'COMPLETE');
 assert.equal(enriched.cycles[1].latency.status,'UNKNOWN');
 assert.equal(enriched.latency_summary.completed_changed_head_cycles,2);
 assert.equal(enriched.latency_summary.fully_measured_cycles,1);
 assert.equal(enriched.latency_summary.unknown_cycles,1);
 assert.equal(enriched.latency_summary.phases.find(x=>x.key==='wait_publication').total_minutes,9);
 assert.throws(()=>enrichRepairCycles({schema:'OTHER',pr:27,cycles:[]},[]),/INVALID/);
});
test('unfinished failed HEAD is monitored without creating a fake next CI or closed publish time',()=>{
 const openCycle={...cycle,next_head:null,next_run_id:null,
   timestamps:{ci_failed_at:iso('10:00'),new_ci_created_at:null}};
 const options={observed_at:iso('11:00'),pr_open:true,current_head:HEAD};
 const ready=full.filter(e=>e.stage!=='source_published');
 const current=breakdownCycle(openCycle,ready,27,options);
 assert.equal(current.status,'IN_PROGRESS');
 assert.deepEqual(current.phases.map(p=>p.minutes),[7,5,15,null,null]);
 assert.equal(current.pending_since_verified_at,iso('10:27'));
 assert.equal(current.pending_age_minutes,33);
 assert.equal(current.total_minutes,60);
 assert.equal(current.observed_minutes,27);
 assert.equal(current.unattributed_minutes,33);
 assert.equal(current.reconciled,true);
 assert.equal(enrichRepairCycles({schema:'HH_PR_REPAIR_CYCLE_V1',pr:27,cycles:[openCycle]},ready,options)
   .latency_summary.in_progress_cycles,1);
 assert.equal(breakdownCycle(openCycle,ready,27,{...options,current_head:NEXT}).status,'UNKNOWN');
 assert.equal(breakdownCycle(openCycle,ready,27,{...options,pr_open:false}).status,'UNKNOWN');
 assert.equal(breakdownCycle(openCycle,[...ready,event('claimed','10:13',{runId:999})],27,options).status,'IN_PROGRESS');
 assert.equal(breakdownCycle(openCycle,[...ready,event('claimed','10:13',{runId:999})],27,options).pending_age_minutes,null);
});
