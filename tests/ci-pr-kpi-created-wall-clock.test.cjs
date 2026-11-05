'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {audit,STAGES}=require('../scripts/ci-pr-kpi-created-wall-clock.cjs');
const SHA='a'.repeat(40),OLD='b'.repeat(40),from='2026-11-03T00:00:00Z',to='2026-11-04T00:00:00Z';
const repo='andylitvinov-design/books';
const pr=(n,over={})=>({number:n,created_at:'2026-11-03T10:00:00Z',merged_at:'2026-11-03T11:40:00Z',base:{ref:'codex/public-book-library'},head:{sha:SHA,ref:'feat/'+n},...over});
const run=(n,over={})=>({id:n*1000,event:'pull_request',name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml@refs/pull/'+n+'/merge',head_sha:SHA,head_branch:'feat/'+n,repository:{full_name:repo},head_repository:{full_name:repo},pull_requests:[{number:n,head:{sha:SHA},base:{ref:'codex/public-book-library'}}],status:'completed',conclusion:'success',run_attempt:1,created_at:'2026-11-03T11:00:00Z',...over});
const job=(n,id,name,created,started,completed,over={})=>({id:n*10000+id,run_id:n*1000,run_attempt:1,name,status:'completed',conclusion:'success',created_at:created,started_at:started,completed_at:completed,...over});
const jobs=n=>[
 job(n,1,'core-lint-types-build','2026-11-03T11:00:00Z','2026-11-03T11:10:00Z','2026-11-03T11:20:00Z'),
 job(n,2,'hh-specialist','2026-11-03T11:00:00Z','2026-11-03T11:12:00Z','2026-11-03T11:30:00Z'),
 job(n,3,'hh-merge-check','2026-11-03T11:30:00Z','2026-11-03T11:32:00Z','2026-11-03T11:35:00Z')];
const calc=(prs,runs,js)=>audit({prs,runs,jobs:js,start:from,end:to});
test('one verified PR exactly decomposes with no double counting',()=>{
 const r=calc([pr(1)],[run(1)],jobs(1));assert.equal(r.total.mean,100);assert.equal(r.cohort.verified,1);
 assert.deepEqual(STAGES.map(k=>r.rows[0].intervals[k]),[60,10,20,5,5]);
 assert.equal(r.reconstruction.reconciled,true);assert.equal(r.unknown_contribution_mean_minutes,0);
});
test('unmatched PR is not assigned fake zeros and every contribution uses one denominator',()=>{
 const p2=pr(2,{merged_at:'2026-11-03T12:20:00Z'}),r=calc([pr(1),p2],[run(1)],jobs(1));
 assert.equal(r.cohort.merged,2);assert.equal(r.cohort.verified,1);
 assert.equal(r.total.mean,120);assert.equal(r.unknown_contribution_mean_minutes,70);
 assert.equal(r.stages.before_final_head_ci.contribution_mean_minutes,30);
 assert.equal(r.rows[1].intervals,null);assert.equal(r.reconstruction.reconciled,true);
});
test('different branch, earlier-created and later-merged PR are excluded',()=>{
 const r=calc([pr(1),pr(2,{base:{ref:'codex/bootstrap-books'}}),
  pr(3,{created_at:'2026-11-02T19:00:00Z'}),pr(4,{merged_at:'2026-11-04T01:00:00Z'})],[run(1)],jobs(1));
 assert.equal(r.cohort.merged,1);
});
test('cross-HEAD, wrong repo, wrong workflow, missing or skipped gate remain unknown',()=>{
 for(const change of [{head_sha:OLD},{repository:{full_name:'other/repo'}},{name:'optional browser'},
  {pull_requests:[]},{run_attempt:2}]){
  const r=calc([pr(1)],[run(1,change)],jobs(1));assert.equal(r.cohort.verified,0);
 }
 for(const replacement of [null,'skipped','failure']){
  const js=jobs(1).map(x=>x.name==='hh-merge-check'?{...x,conclusion:replacement}:x);
  const r=calc([pr(1)],[run(1)],js);assert.equal(r.cohort.verified,0);
 }
});
test('reversed timestamps, duplicate gate and post-merge gate fail closed',()=>{
 const variants=[
  [...jobs(1),jobs(1)[0]],
  jobs(1).map(x=>x.name==='hh-merge-check'?{...x,completed_at:'2026-11-03T12:20:00Z'}:x),
  jobs(1).map(x=>x.name==='hh-specialist'?{...x,started_at:'2026-11-03T11:35:00Z'}:x)
 ];for(const js of variants)assert.equal(calc([pr(1)],[run(1)],js).cohort.verified,0);
});
test('duplicate PR cannot inflate population and empty cohort has no invented average',()=>{
 assert.throws(()=>calc([pr(1),pr(1)],[],[]),/DUPLICATE/);
 const r=calc([],[],[]);assert.equal(r.total.mean,null);assert.equal(r.reconstruction.reconciled,true);
});
test('synthetic PR merge ref requires verified ordered parents',()=>{
 const BASE='c'.repeat(40),synthetic='d'.repeat(40);
 const r=run(1,{head_sha:synthetic,pull_requests:[{number:1,head:{sha:SHA},base:{ref:'codex/public-book-library',sha:BASE}}]});
 const input={prs:[pr(1)],runs:[r],jobs:jobs(1),start:from,end:to};
 assert.equal(audit(input).cohort.verified,0);
 assert.equal(audit({...input,syntheticParents:{1000:[SHA,BASE]}}).cohort.verified,0);
 assert.equal(audit({...input,syntheticParents:{1000:[BASE,SHA]}}).cohort.verified,1);
});
test('P50/P95 and stage coverage use the same merged-and-created PR denominator',()=>{
 const x=calc([pr(1),pr(2,{merged_at:'2026-11-03T12:20:00Z'})],[run(1)],jobs(1));
 assert.equal(x.cohort.merged,2);
 assert.equal(x.total.p50,120);assert.equal(x.total.p95,138);
 assert.equal(x.stages.before_final_head_ci.measured_prs,1);
 assert.equal(x.stages.before_final_head_ci.cohort_prs,2);
 assert.equal(x.stages.before_final_head_ci.coverage_pct,50);
 assert.equal(x.stages.before_final_head_ci.p95,60);
 assert.equal(x.job_substages.core_runner_to_completed.p50,10);
 assert.equal(x.job_substages.specialist_runner_to_completed.p50,18);
 assert.equal(x.bottleneck.status,'UNATTRIBUTED_TIME_MAY_DOMINATE');
});
test('real Core, Specialist, gate timestamps and overlapping substage separation',()=>{
 const x=calc([pr(1)],[run(1)],jobs(1)),j=x.rows[0].evidence.jobs;
 assert.equal(j['core-lint-types-build'].queued_at,'2026-11-03T11:00:00.000Z');
 assert.equal(j['hh-specialist'].completed_at,'2026-11-03T11:30:00.000Z');
 assert.equal(j['hh-merge-check'].runner_started_at,'2026-11-03T11:32:00.000Z');
 assert.equal(x.job_substages.core_queued_to_runner.mean,10);
 assert.equal(x.job_substages.specialist_queued_to_runner.mean,12);
 assert.equal(x.job_substages.post_checks_to_gate_runner.mean,2);
 assert.equal(x.job_substages.gate_runner_to_green.mean,3);
 assert.equal(x.reconstruction.reconciled,true);
});
test('unique authenticated stages and LIVE timestamp pair on exact PR and HEAD',()=>{
 const p=pr(1,{mergeSha:'d'.repeat(40)}),head=OLD,task='c'.repeat(32);
 const events=[
  {pr:1,head,kind:'stage',stage:'ready',at:'2026-11-03T10:04:00Z'},
  {pr:1,head,kind:'stage',stage:'triage',at:'2026-11-03T10:07:00Z'},
  {pr:1,head,kind:'stage',stage:'claimed',task,at:'2026-11-03T10:09:00Z'},
  {pr:1,head,kind:'stage',stage:'repair_started',task,at:'2026-11-03T10:10:00Z'},
  {pr:1,head,kind:'stage',stage:'source_published',task,newHead:SHA,at:'2026-11-03T10:20:00Z'},
  {pr:1,head:'d'.repeat(40),kind:'live_verified',production:true,mergeSha:'d'.repeat(40),
   aliasVerified:true,smokeVerified:true,at:'2026-11-03T11:45:00Z'}
 ];
 const x=audit({prs:[p],runs:[run(1)],jobs:jobs(1),events,start:from,end:to});
 assert.equal(x.receipt_substages.created_to_ready.mean,4);
 assert.equal(x.receipt_substages.ready_to_triage.mean,3);
 assert.equal(x.receipt_substages.triage_to_claimed.mean,2);
 assert.equal(x.receipt_substages.claimed_to_repair_started.mean,1);
 assert.equal(x.receipt_substages.repair_started_to_source_published.mean,10);
 assert.equal(x.receipt_substages.source_published_to_ci_queued.mean,40);
 assert.equal(x.receipt_substages.merged_to_live_verified.mean,5);
 assert.equal(x.rows[0].authenticated_receipt_intervals.merged_to_live_verified.completed_at,
  '2026-11-03T11:45:00.000Z');
});
test('ambiguous duplicated receipts do not create false measured intervals',()=>{
 const e={pr:1,head:SHA,kind:'stage',stage:'ready',at:'2026-11-03T10:04:00Z'};
 const x=audit({prs:[pr(1)],runs:[run(1)],jobs:jobs(1),events:[e,e,
  {pr:1,head:SHA,kind:'stage',stage:'triage',at:'2026-11-03T10:07:00Z'}],
  start:from,end:to});
 assert.equal(x.receipt_substages.created_to_ready.n,0);
 assert.equal(x.receipt_substages.ready_to_triage.n,0);
 assert.equal(x.receipt_substages.ready_to_triage.coverage_pct,0);
 assert.equal(x.rows[0].authenticated_receipt_intervals.ready_to_triage,null);
});


test('unique Ready receipt partitions otherwise opaque pre-final-CI window without assigning a cause',()=>{
 const events=[{pr:1,head:SHA,kind:'stage',stage:'ready',at:'2026-11-03T10:04:00Z'}];
 const r=audit({prs:[pr(1)],runs:[run(1)],jobs:jobs(1),events,start:from,end:to});
 assert.equal(r.rows[0].before_final_head_ci_ready_partition.status,'AUTHENTICATED_READY_BOUNDS_NOT_CAUSAL');
 assert.equal(r.rows[0].before_final_head_ci_ready_partition.created_to_ready_minutes,4);
 assert.equal(r.rows[0].before_final_head_ci_ready_partition.ready_to_final_head_ci_minutes,56);
 assert.equal(r.receipt_substages.ready_to_final_head_ci_observed.mean,56);
 assert.equal(r.bottleneck.largest_observed_phase.stage,'before_final_head_ci');
 const ambiguous=audit({prs:[pr(1)],runs:[run(1)],jobs:jobs(1),events:[...events,{...events[0],head:OLD}],start:from,end:to});
 assert.equal(ambiguous.rows[0].before_final_head_ci_ready_partition.status,'READY_BOUNDARY_UNVERIFIED');
 assert.equal(ambiguous.receipt_substages.ready_to_final_head_ci_observed.mean,null);
});
test('deployment READY receipt is counted without fabricated feature-specific smoke',()=>{
 const mergeSha='d'.repeat(40),e={pr:1,head:SHA,kind:'live_verified',production:true,
  mergeSha,aliasVerified:true,smokeVerified:false,at:'2026-11-03T11:45:00Z'};
 const data={prs:[pr(1,{mergeSha})],runs:[run(1)],jobs:jobs(1),start:from,end:to};
 const r=audit({...data,events:[e]});
 assert.equal(r.receipt_substages.merged_to_deployment_ready_observed.mean,5);
 assert.equal(r.receipt_substages.merged_to_live_verified.mean,null);
 assert.equal(audit({...data,events:[{...e,aliasVerified:false}]}).receipt_substages.merged_to_deployment_ready_observed.mean,null);
 const tested=audit({...data,events:[e,{...e,smokeVerified:true,at:'2026-11-03T11:50:00Z'}]});
 assert.equal(tested.receipt_substages.merged_to_deployment_ready_observed.mean,5);
 assert.equal(tested.receipt_substages.merged_to_live_verified.mean,10);
});
