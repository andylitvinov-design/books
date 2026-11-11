'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const model=require('../ops/pr-monitor/pr-wave-effectiveness-model.cjs');
const NOW=Date.parse('2026-11-06T23:00:00Z'),H=3600000;
const at=h=>new Date(NOW-h*H).toISOString();
const SHA_A='a'.repeat(40),SHA_B='b'.repeat(40),BASE='codex/public-book-library';
function pull(pr,h,{merged=false,draft=false,base=BASE}={}){
 return {number:pr,created_at:at(h),merged_at:merged?at(h/2):null,
  merge_commit_sha:merged?SHA_A:null,base:{ref:base},
  head:{sha:SHA_B},state:merged?'closed':'open',draft};
}
function run(pr,runId,h,head=SHA_A,{attempt=1,conclusion='success'}={}){
 return {pr,run_id:runId,attempt,source_head:head,base:BASE,
  queued_at:at(h),completed_at:at(h-.01),conclusion,
  workflow_url:'https://github.com/andylitvinov-design/books/actions/runs/'+runId};
}
test('two matched week-apart 24h cohorts; merged P50/P90 stay right-censored',()=>{
 const prs=[pull(1,4,{merged:true}),pull(2,10,{merged:true}),
  pull(3,12),pull(4,171,{merged:true}),pull(5,183)];
 const r=model.build([run(1,101,3),run(2,102,9),run(4,104,170)],
  prs,NOW,{cohort_complete:true,pages:1});
 assert.equal(r.schema,'HH_PR_WAVE_EFFECTIVENESS_V1');
 assert.equal(r.periods.last_24h.created_prs,3);
 assert.equal(r.periods.week_ago.created_prs,2);
 assert.equal(r.periods.last_24h.ci_archived_prs,2);
 assert.equal(r.periods.last_24h.one_observed_wave_prs,2);
 assert.equal(r.periods.last_24h.observed_one_wave_percent,100);
 assert.equal(r.periods.last_24h.merged_prs,2);
 assert.equal(r.periods.last_24h.merge_latency.n,2);
 assert.equal(r.periods.last_24h.merge_latency.median_min,210);
 assert.equal(r.periods.last_24h.merge_latency.p90_min,282);
 assert.equal(r.periods.last_24h.unmerged_prs,1);
 assert.equal(r.coverage.core_history_complete,false);
 assert.equal(r.coverage.first_ever_wave_verified,false);
});
test('new HEAD waves, same-SHA duplicate workflows and reruns remain separate',()=>{
 const runs=[run(7,700,8),run(7,701,7),
  run(7,702,6,SHA_B),run(7,702,6,SHA_B,{attempt:2}),
  run(8,800,2)];
 const r=model.build(runs,[pull(7,9),pull(8,3)],NOW);
 const p=r.periods.last_24h;
 assert.equal(p.extra_observed_waves,2);
 assert.equal(p.same_head_extra_waves,1);
 assert.equal(p.new_head_extra_waves,1);
 assert.equal(p.retry_attempts_observed,1);
 assert.equal(p.prs_with_3plus_waves,1);
 assert.equal(p.prs_with_multiple_ci_heads,1);
 assert.equal(p.one_observed_wave_prs,1);
 assert.equal(p.examples[0].pr,7);
 assert.equal(p.examples[0].waves_observed,3);
});
test('do not misattribute later HEAD to confirmed source repair',()=>{
 const r=model.build([run(7,700,8,SHA_A,{conclusion:'failure'}),
  run(7,701,7,SHA_B)], [pull(7,9)],NOW);
 assert.equal(r.periods.last_24h.new_head_after_failed_run,1);
 assert.equal(r.periods.last_24h.new_head_extra_waves,1);
 assert.ok(r.notes.some(s=>s.includes('not confirmed Repair')));
});
test('exclude wrong production base, unrelated PR, missing Core and contradictory run IDs',()=>{
 const prs=[pull(1,5),pull(2,4,{base:'codex/bootstrap-books'}),pull(3,171)];
 const runs=[run(1,101,4,SHA_A),run(1,101,3,SHA_B),
  run(2,102,3),run(999,104,3)];
 const r=model.build(runs,prs,NOW);
 assert.equal(r.periods.last_24h.created_prs,1);
 assert.equal(r.periods.last_24h.ci_archived_prs,0,
  'contradictory archive cannot be reported as verified one-wave');
 assert.equal(r.periods.last_24h.observed_one_wave_percent,null);
 assert.equal(r.periods.week_ago.ci_missing_prs,1);
});
test('no merged timestamp or wrong merge SHA yields unknown merge clock',()=>{
 const a=pull(1,8,{merged:true});
 a.merge_commit_sha=null;
 const b=pull(2,7);
 b.state='closed';b.merged_at=at(1);
 const p=model.build([run(1,101,7),run(2,102,6)], [a,b],NOW);
 assert.equal(p.periods.last_24h.merged_prs,0);
 assert.equal(p.periods.last_24h.merge_latency.median_min,null);
 assert.equal(p.periods.last_24h.unmerged_prs,2);
});
test('API optional cohort has bounded cached reads and no CI writes',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/api/pr-three-kpis.js'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/pr-three-kpi-ui.js'),'utf8');
 assert.match(source,/MAX_COHORT_PAGES=9/);
 assert.match(source,/req\.query\?\.efficiency==='1'/);
 assert.match(ui,/HH_PR_WAVE_EFFECTIVENESS_V1/);
 assert.match(ui,/efficiency=1/);
 assert.doesNotMatch(source,/workflow_dispatch|createWorkflowDispatch|setInterval\s*\(/);
 assert.doesNotMatch(ui,/setInterval\s*\(|workflow_dispatch/);
});
test('explicit efficiency GET reuses saved archive plus one read-only PR page',async()=>{
 const old=global.fetch,paths=[];
 const current=Date.now(),t=h=>new Date(current-h*H).toISOString();
 const bucket='2026-11-06T22-success',sha=SHA_A;
 const archived={pr:117,run_id:71017,attempt:1,
  base:BASE,source_head:sha,queued_at:t(2),completed_at:t(1.9),
  conclusion:'success',partial_jobs:true,jobs:[],merged_at:t(1.1),
  pr_created_at:t(3)};
 const shards=[{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  body:'<!-- HH_CORE_CI_JOURNEY_SHARD_V1:'+bucket+' -->\n'+JSON.stringify({
   schema:'HH_CORE_CI_JOURNEY_SHARD_V1',bucket,runs:[archived]})}];
 const live={...pull(117,4,{merged:true}),created_at:t(3),
   merged_at:t(1.1),head:{sha},merge_commit_sha:SHA_B};
 function response(data){return {ok:true,headers:{get:()=> '4500'},json:async()=>data};}
 try{
  global.fetch=async url=>{
   paths.push(url);
   if(url.includes('/issues/3419/comments'))return response(shards);
   if(url.includes('/pulls?state=all'))return response([live]);
   throw Error('UNEXPECTED_NETWORK');
  };
  delete require.cache[require.resolve('../ops/pr-monitor/api/pr-three-kpis.js')];
  const handler=require('../ops/pr-monitor/api/pr-three-kpis.js');
  let payload,status=200;
  await handler({method:'GET',query:{efficiency:'1'}},{
   setHeader(){},set statusCode(x){status=x;},end(s){payload=JSON.parse(s);}});
  assert.equal(status,200);
  assert.equal(payload.schema,'HH_PR_THREE_KPI_V1');
  assert.equal(payload.release_efficiency.schema,'HH_PR_WAVE_EFFECTIVENESS_V1');
  assert.equal(payload.release_efficiency.periods.last_24h.created_prs,1);
  assert.equal(payload.release_efficiency.periods.last_24h.ci_archived_prs,1);
  assert.equal(payload.efficiency_lookup.status,'COMPLETE_LISTING');
  assert.equal(paths.length,2);
  assert.ok(paths.every(x=>x.startsWith('https://api.github.com/repos/')));
 }finally{global.fetch=old;}
});
