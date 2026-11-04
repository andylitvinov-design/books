'use strict';
// Offline, read-only accounting. Inputs are verified GitHub API snapshots.
// No new runners, cron, API requests, credentials, or tokens.
const SHA=/^[0-9a-f]{40}$/i;
const REPO='andylitvinov-design/books';
const PROD='codex/public-book-library';
const CORE='.github/workflows/hh-pr-core-release.yml';
const REQUIRED=['core-lint-types-build','hh-specialist','hh-merge-check'];
const STAGES=['before_final_head_ci','ci_queued_to_first_runner','final_head_checks_wall','merge_gate_wait','green_to_merge'];
function ts(v){const x=Date.parse(v||'');return Number.isFinite(x)?x:null;}
function min(a,b){return a!==null&&b!==null&&b>=a?(b-a)/60000:null;}
function round(n){return Math.round(n*100)/100;}
function summarize(values){const a=[...values].sort((x,y)=>x-y);const n=a.length;if(!n)return {n:0,mean:null,median:null,p90:null};return {n,mean:round(a.reduce((s,v)=>s+v,0)/n),median:round(n%2?a[n>>1]:(a[n/2-1]+a[n/2])/2),p90:round(a[Math.max(0,Math.ceil(n*.9)-1)])};}
function jobTime(j){const q=ts(j.created_at),s=ts(j.started_at),e=ts(j.completed_at);return q!==null&&s!==null&&e!==null&&q<=s&&s<=e?{q,s,e}:null;}
function matchesRun(run,pr,syntheticParents){
 const refs=run.pull_requests;
 return run.event==='pull_request'&&run.name==='HH PR core release gate'&&
  String(run.path||'').split('@')[0]===CORE&&
  run.repository?.full_name===REPO&&
  run.head_repository?.full_name===REPO&&
  SHA.test(run.head_sha||'')&&(run.head_sha===pr.head.sha||
  (Array.isArray(syntheticParents?.[run.id])&&syntheticParents[run.id].length===2&&
   syntheticParents[run.id][0]===run.pull_requests?.[0]?.base?.sha&&
   syntheticParents[run.id][1]===pr.head.sha))&&
  run.head_branch===pr.head.ref&&
  Array.isArray(refs)&&refs.length===1&&refs[0]?.number===pr.number&&
  refs[0]?.head?.sha===pr.head.sha&&refs[0]?.base?.ref===PROD;
}
function evaluateRun(run,pr,allJobs,created,merged){
 const started=ts(run.created_at);
 if(started===null||started<created||started>merged||
  run.status!=='completed'||run.conclusion!=='success'||
  !Number.isSafeInteger(run.run_attempt)||run.run_attempt<1)return null;
 const relevant=allJobs.filter(j=>j.run_id===run.id&&j.run_attempt===run.run_attempt);
 if(relevant.some(j=>['failure','cancelled','timed_out','startup_failure'].includes(j.conclusion)))return null;
 const picked=[];
 for(const name of REQUIRED){const found=relevant.filter(j=>j.name===name);if(found.length!==1)return null;
  const j=found[0],t=jobTime(j);if(j.status!=='completed'||j.conclusion!=='success'||!t||t.q<started||t.e>merged)return null;
  picked.push({j,t});
 }
 const [core,specialist,gate]=picked;
 const first=Math.min(core.t.s,specialist.t.s),last=Math.max(core.t.e,specialist.t.e);
 if(gate.t.s<last||gate.t.e<last||first<started)return null;
 const values={before_final_head_ci:min(created,started),ci_queued_to_first_runner:min(started,first),
  final_head_checks_wall:min(first,last),merge_gate_wait:min(last,gate.t.e),green_to_merge:min(gate.t.e,merged)};
 if(Object.values(values).some(x=>x===null))return null;
 return {values,observed:{created_at:pr.created_at,ci_run_created_at:run.created_at,
  first_runner_started_at:new Date(first).toISOString(),final_checks_completed_at:new Date(last).toISOString(),
  merge_gate_completed_at:new Date(gate.t.e).toISOString(),merged_at:pr.merged_at},
  run_id:run.id,run_attempt:run.run_attempt,
  job_ids:picked.map(({j})=>j.id).filter(Number.isSafeInteger),
  last_gate_at:gate.t.e};
}
function audit({prs,runs,jobs,start,end,productionBase=PROD,syntheticParents={}}){
 if(!Array.isArray(prs)||!Array.isArray(runs)||!Array.isArray(jobs)||
  ts(start)===null||ts(end)===null||ts(start)>=ts(end)||productionBase!==PROD)throw Error('INVALID_AUDIT_INPUT');
 const startMs=ts(start),endMs=ts(end),seen=new Set(),rows=[];
 for(const p of prs){
  if(!Number.isSafeInteger(p?.number)||p.number<1||seen.has(p.number))throw Error('DUPLICATE_OR_INVALID_PR');
  seen.add(p.number);
  if(p.base?.ref!==productionBase)continue;
  const created=ts(p.created_at),merged=ts(p.merged_at);
  if(created===null||created<startMs||created>endMs||merged===null||merged>endMs)continue;
  if(merged<created)throw Error('INVALID_MERGE_ORDER');
  const full=min(created,merged),head=p.head?.sha;
  let outcome=null,reason='FINAL_HEAD_UNVERIFIED';
  if(SHA.test(head||'')&&typeof p.head?.ref==='string'){
   const candidates=runs.filter(r=>matchesRun(r,p,syntheticParents));
   reason=candidates.length?'NO_SUCCESSFUL_SAME_HEAD_GATE':'NO_VERIFIED_FINAL_HEAD_CORE_RUN';
   const found=candidates.map(r=>evaluateRun(r,p,jobs,created,merged)).filter(Boolean)
    .sort((a,b)=>b.last_gate_at-a.last_gate_at);
   if(found.length){outcome=found[0];reason=null;}
  }
  rows.push({pr:p.number,head_sha:SHA.test(head||'')?head:null,
   url:p.html_url||'https://github.com/'+REPO+'/pull/'+p.number,
   created_at:p.created_at,merged_at:p.merged_at,full_minutes:round(full),
   verified:!!outcome,missing_reason:reason,
   intervals:outcome?Object.fromEntries(STAGES.map(k=>[k,round(outcome.values[k])])):null,
   evidence:outcome?{...outcome.observed,run_id:outcome.run_id,job_ids:outcome.job_ids,run_attempt:outcome.run_attempt}:null});
 }
 rows.sort((a,b)=>a.pr-b.pr);
 const total=rows.length,sum=rows.reduce((a,b)=>a+b.full_minutes,0),checked=rows.filter(r=>r.verified);
 const stages=Object.fromEntries(STAGES.map(k=>{
  const sampled=checked.map(r=>r.intervals[k]);return [k,{contribution_mean_minutes:total?round(sampled.reduce((a,b)=>a+b,0)/total):null,
   verified_only:summarize(sampled)}];
 }));
 const allocated=STAGES.reduce((s,k)=>s+(stages[k].contribution_mean_minutes||0),0);
 const mean=total?round(sum/total):null,unallocated=total?round(rows.filter(r=>!r.verified).reduce((s,r)=>s+r.full_minutes,0)/total):null;
 return {schema:'HH_PR_CREATED_WALL_CLOCK_V1',cohort:{created_from:start,created_to:end,base:PROD,
  merged_by:end,merged:total,verified:checked.length,unverified:total-checked.length},
  total:summarize(rows.map(r=>r.full_minutes)),stages,unknown_contribution_mean_minutes:unallocated,
  reconstruction:{sum_means:total?round(allocated+unallocated):null,full_mean:mean,
   reconciled:total?Math.abs(allocated+unallocated-mean)<=0.05:true},
  limitations:['Verified stages are exact final HEAD CI run timestamps only, not original authoring, developer work, or the first CI on earlier HEADs.',
   'Queue interval may include dependency/concurrency wait; no inference about runner outage or developer idle time.',
   'Missing source metadata or nonmatching HEAD is unallocated, never zero.'],rows};
}
module.exports={audit,REQUIRED,STAGES};
if(require.main===module){
 const fs=require('node:fs');const input=process.argv[2];if(!input)throw Error('USAGE: node ci-pr-kpi-created-wall-clock.cjs <verified-github-snapshot.json>');
 process.stdout.write(JSON.stringify(audit(JSON.parse(fs.readFileSync(input,'utf8'))),null,2)+'\n');
}