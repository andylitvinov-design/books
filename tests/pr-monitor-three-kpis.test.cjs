'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const k=require('../ops/pr-monitor/pr-three-kpi-model.cjs');
const now=Date.parse('2026-11-04T19:01:00Z');
const today=new Date(now-3600000).toISOString(),later=new Date(now-1800000).toISOString();
const sha='a'.repeat(40),bot={id:41898282,login:'github-actions[bot]',type:'Bot'};
function job(id,name,conclusion,completed_at){
 const m=Date.parse(completed_at);
 return {id,name,conclusion,queued_at:new Date(m-120000).toISOString(),
  started_at:new Date(m-60000).toISOString(),completed_at,
  url:'https://github.com/andylitvinov-design/books/actions/runs/101/job/'+id};
}
function record(pr,conclusion='success',patch={}){
 const j=[job(pr*10+1,'core-lint-types-build','success',today),
  job(pr*10+2,'hh-specialist','success',today),
  job(pr*10+3,'hh-merge-check',conclusion,later)];
 return {pr,run_id:pr+100,attempt:1,base:'codex/public-book-library',
  source_head:sha,queued_at:new Date(now-18000000).toISOString(),
  completed_at:later,workflow_url:'https://github.com/andylitvinov-design/books/actions/runs/101',
  conclusion,partial_jobs:false,current_head:true,
  merged_at:new Date(now-300000).toISOString(),jobs:j,...patch};
}
function comment(runs,user=bot){
 const bucket='2026-11-04T18-success';
 return {id:1,user,performed_via_github_app:{id:15368,slug:'github-actions'},
  body:'<!-- HH_CORE_CI_JOURNEY_SHARD_V1:'+bucket+' -->\n'+
  JSON.stringify({schema:'HH_CORE_CI_JOURNEY_SHARD_V1',bucket,runs})};
}
test('seven days ago means identical Toronto hour across DST transition',()=>{
 const a=k.window(now,0),b=k.window(now,7);
 assert.equal(a.to,'2026-11-04T19:01:00.000Z');
 assert.equal(b.to,'2026-10-28T18:01:00.000Z');
 assert.equal(b.from,'2026-10-27T18:01:00.000Z');
});
test('do not accept untrusted or malformed shards',()=>{
 const a=record(2);
 const ok=k.parseShards([comment([a])]);
 assert.equal(ok.runs.length,1);
 assert.equal(k.parseShards([comment([a],{id:1,login:'github-actions[bot]',type:'Bot'})]).runs.length,0);
 const changed={...a,conclusion:'failure'};
 const conflict=k.parseShards([comment([a]),comment([changed])]);
 assert.equal(conflict.runs.length,0);
 assert.equal(conflict.conflicts,1);
});
test('first-pass ratio only counts first saved complete mandatory Core wave per PR',()=>{
 const fail=record(2,'failure'),ok=record(3),unknown=record(4,'failure',{
  partial_jobs:true}),rerun=record(5,'success',{attempt:2});
 const report=k.report([fail,ok,unknown,rerun],now);
 const v=report.windows.last_24h.ci_first_pass;
 assert.equal(v.passed,1);
 assert.equal(v.failed,1);
 assert.equal(v.measured,2);
 assert.equal(v.unknown,2);
 assert.equal(v.percent_observed,50);
 assert.equal(v.actual_first_pass_percent,null,'not full original PR wave');
});
test('Green→Merge is measured only on final head after required job PASS',()=>{
 const yes=record(6),wrongHead=record(7,'success',{current_head:false});
 const missingGate=record(8,'success',{
  jobs:record(8).jobs.filter(j=>j.name!=='hh-merge-check')});
 const mergeBeforeGate=record(9,'success',{
  merged_at:new Date(now-2400000).toISOString()});
 const x=k.gateToMerge([yes,wrongHead,missingGate,mergeBeforeGate],k.window(now,0),now);
 assert.equal(x.n,1);
 assert.ok(x.mean_min>0);
 assert.equal(x.rows[0].pr,6);
});
test('post-Core verified merge restores Green → Merge without inventing merge timestamp',()=>{
 const created=new Date(now-7200000).toISOString();
 const run=record(18,'success',{merged_at:null,pr_created_at:created,current_head:true});
 const proof={number:18,state:'closed',created_at:created,
  merged_at:new Date(now-300000).toISOString(),merge_commit_sha:'b'.repeat(40),
  head:{sha},base:{ref:'codex/public-book-library'}};
 const w=k.window(now,0);
 const without=k.gateToMerge([run],w,now);
 assert.equal(without.n,0,'green alone never proves merged_at');
 const withProof=k.gateToMerge([run],w,now,[proof]);
 assert.equal(withProof.n,1);
 assert.equal(withProof.exact_head_merge_proofs,1);
 assert.equal(withProof.archived_merge_proofs,0);
 assert.equal(withProof.rows[0].merge_proof,'GITHUB_MERGED_PR_EXACT_HEAD');
 assert.equal(withProof.rows[0].merge_sha,'b'.repeat(40));
 const data=k.report([run],now,{mergeProofs:[proof]});
 assert.equal(data.windows.last_24h.green_to_merge.n,1);
});
test('post-Core merge proof rejects wrong HEAD, base, SHA, creation time and duplicates',()=>{
 const created=new Date(now-7200000).toISOString();
 const run=record(19,'success',{merged_at:new Date(now-300000).toISOString(),
  pr_created_at:created,current_head:true});
 const proof={number:19,state:'closed',created_at:created,
  merged_at:new Date(now-300000).toISOString(),merge_commit_sha:'b'.repeat(40),
  head:{sha},base:{ref:'codex/public-book-library'}};
 const invalid=[
  {...proof,head:{sha:'f'.repeat(40)}},
  {...proof,base:{ref:'codex/bootstrap-books'}},
  {...proof,merge_commit_sha:null},
  {...proof,created_at:new Date(now-7300000).toISOString()},
  {...proof,merged_at:new Date(now+7200000).toISOString()},
  {...proof,state:'open'}
 ];
 for(const p of invalid){
  assert.equal(k.gateToMerge([run],k.window(now,0),now,[p]).n,0,
   'contradicting proof must also invalidate archived fallback');
 }
 assert.equal(k.gateToMerge([run],k.window(now,0),now,[proof,proof]).n,0);
 assert.equal(k.gateToMerge([run],k.window(now,0),now).n,1,
   'authenticated preexisting archive continues working without a new snapshot');
});
test('Error→Repair requires authenticated same PR same HEAD start timestamp after failure',()=>{
 const failure=record(12,'failure',{
  jobs:[job(121,'core-lint-types-build','failure',today),
   job(122,'hh-specialist','success',today),
   job(123,'hh-merge-check','failure',later)]});
 const candidates=k.errors([failure],k.window(now,0),now);
 assert.equal(candidates.length,1);
 const started=new Date(now-15*60000).toISOString();
 const body='<!-- HH_PR_STAGE_V1 '+JSON.stringify({
  stage:'repair_started',pr_number:12,head_sha:sha,run_id:'200',
  task_key:'e'.repeat(32),at:started,source:'github_actions_fix_step'})+' -->';
 const comments=[{user:bot,performed_via_github_app:{id:15368,slug:'github-actions'},
  body,created_at:new Date(now-10*60000).toISOString(),
  html_url:'https://github.com/andylitvinov-design/books/pull/12#issuecomment-99'}];
 const proofs=k.parseRepairReceipts(comments,{pr:12,head:sha});
 assert.equal(proofs.length,1);
 assert.equal(k.parseRepairReceipts(comments,{pr:13,head:sha}).length,0);
 const joined=k.repairSample(candidates,{['12:'+sha]:proofs},k.window(now,0),1);
 assert.equal(joined.n,1);assert.ok(joined.mean_min>=0);
 const empty=k.repairSample(candidates,{},k.window(now,0),0);
 assert.equal(empty.n,0);assert.equal(empty.mean_min,null);
});
test('Error→Repair candidates include only failed required Core CI jobs',()=>{
 const specialistOnly=record(13,'failure',{jobs:[
  job(131,'core-lint-types-build','success',today),job(132,'hh-specialist','failure',later),
  job(133,'hh-merge-check','failure',later)]});
 const mergeGateOnly=record(14,'failure',{jobs:[
  job(141,'core-lint-types-build','success',today),job(142,'hh-specialist','success',today),
  job(143,'hh-merge-check','failure',later)]});
 const coreAndSpecialist=record(15,'failure',{jobs:[
  job(151,'core-lint-types-build','failure',today),job(152,'hh-specialist','failure',later),
  job(153,'hh-merge-check','failure',later)]});
 const candidates=k.errors([specialistOnly,mergeGateOnly,coreAndSpecialist],k.window(now,0),now);
 assert.equal(candidates.length,1);assert.equal(candidates[0].pr,15);
 assert.match(candidates[0].failure_job_url,/job\/151$/);
 assert.equal(candidates[0].failed_at,today);
});
test('missing week-old historical Core data is not reported as 0% or 0 minutes',()=>{
 const data=k.report([record(1)],now);
 const hist=data.windows.week_ago;
 assert.equal(hist.ci_first_pass.percent_observed,null);
 assert.equal(hist.green_to_merge.mean_min,null);
 assert.equal(hist.error_to_repair.mean_min,null);
 assert.equal(hist.evidence_status,'NO_VERIFIED_KPI_PAIRS');
});
test('new model and frontend never start recurring polling or CI jobs',()=>{
 for(const file of ['pr-three-kpi-model.cjs','pr-three-kpi-ui.js']){
  const s=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor',file),'utf8');
  assert.doesNotMatch(s,/\bsetInterval\s*\(|workflow_dispatch|createWorkflowDispatch/);
 }
});
