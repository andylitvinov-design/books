'use strict';
// Offline, read-only accounting. Inputs are verified GitHub API snapshots.
// No new runners, cron, API requests, credentials, or tokens.
const SHA=/^[0-9a-f]{40}$/i;
const REPO='andylitvinov-design/books';
const PROD='codex/public-book-library';
const CORE='.github/workflows/hh-pr-core-release.yml';
const REQUIRED=['core-lint-types-build','hh-specialist','hh-merge-check'];
const STAGES=['before_final_head_ci','ci_queued_to_first_runner','final_head_checks_wall','merge_gate_wait','green_to_merge'];
// These jobs are concurrent diagnostics, NOT additive PR wall-clock partitions.
const JOB_SUBSTAGES=['core_queued_to_runner','core_runner_to_completed',
 'specialist_queued_to_runner','specialist_runner_to_completed',
 'post_checks_to_gate_runner','gate_runner_to_green'];
const RECEIPT_SUBSTAGES=['created_to_ready','ready_to_triage','triage_to_claimed',
 'claimed_to_repair_started','repair_started_to_source_published',
 'source_published_to_ci_queued','merged_to_live_verified'];
function ts(v){const x=Date.parse(v||'');return Number.isFinite(x)?x:null;}
function min(a,b){return a!==null&&b!==null&&b>=a?(b-a)/60000:null;}
function round(n){return Math.round(n*100)/100;}
function summarize(values){
 const a=values.filter(x=>Number.isFinite(x)&&x>=0).sort((x,y)=>x-y),n=a.length;
 if(!n)return {n:0,mean:null,median:null,p50:null,p90:null,p95:null};
 const pct=p=>{const i=(n-1)*p,l=Math.floor(i),h=Math.ceil(i);
  return round(a[l]+(a[h]-a[l])*(i-l));};
 const p50=pct(.5);
 return {n,mean:round(a.reduce((sum,v)=>sum+v,0)/n),median:p50,p50,
  p90:round(a[Math.max(0,Math.ceil(n*.9)-1)]),p95:pct(.95)};
}
function cohortStage(samples,total){
 const s=summarize(samples),n=s.n;
 return {...s,measured_prs:n,cohort_prs:total,missing_prs:total-n,
  coverage_pct:total?round(n*100/total):null,
  contribution_mean_minutes:total?round(samples.reduce((a,b)=>a+b,0)/total):null};
}
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
 const substages={
  core_queued_to_runner:min(core.t.q,core.t.s),
  core_runner_to_completed:min(core.t.s,core.t.e),
  specialist_queued_to_runner:min(specialist.t.q,specialist.t.s),
  specialist_runner_to_completed:min(specialist.t.s,specialist.t.e),
  post_checks_to_gate_runner:min(last,gate.t.s),
  gate_runner_to_green:min(gate.t.s,gate.t.e)
 };
 if(Object.values(substages).some(x=>x===null))return null;
 const job_timestamps=Object.fromEntries(picked.map(({j,t})=>[j.name,{
  queued_at:new Date(t.q).toISOString(),runner_started_at:new Date(t.s).toISOString(),
  completed_at:new Date(t.e).toISOString(),job_id:j.id,
  url:Number.isSafeInteger(j.id)?'https://github.com/'+REPO+'/actions/runs/'+run.id+'/job/'+j.id:null}]));
 return {values,substages,observed:{created_at:pr.created_at,ci_run_created_at:run.created_at,
  first_runner_started_at:new Date(first).toISOString(),final_checks_completed_at:new Date(last).toISOString(),
  merge_gate_completed_at:new Date(gate.t.e).toISOString(),merged_at:pr.merged_at,jobs:job_timestamps},
  run_id:run.id,run_attempt:run.run_attempt,
  job_ids:picked.map(({j})=>j.id).filter(Number.isSafeInteger),
  last_gate_at:gate.t.e};
}

/** Authenticated input is supplied by ci-pr-kpi-collector, not Watchdog label hints.
 * Ambiguous or cross-HEAD task pairs are unmeasured, never zero. */
function receiptTimings(p,events,created,merged,selectedRun,endMs){
 const grouped=new Map(),candidates=Object.fromEntries(RECEIPT_SUBSTAGES.map(k=>[k,[]]));
 const add=(key,a,b,head=null,task=null,source='authenticated_stage_receipt')=>{
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<a||a<created||b>endMs)return;
  candidates[key].push({minutes:(b-a)/60000,started_at:new Date(a).toISOString(),
   completed_at:new Date(b).toISOString(),head_sha:head,task_key:task,source});
 };
 for(const e of events){
  if(e?.kind!=='stage'||e.pr!==p.number||!SHA.test(e.head||''))continue;
  const at=ts(e.at);
  if(at===null||at<created||at>merged||
   !['ready','triage','claimed','repair_started','source_published'].includes(e.stage))continue;
  const head=e.head.toLowerCase(),rows=grouped.get(head)||[];
  rows.push({...e,atMs:at});grouped.set(head,rows);
 }
 for(const [head,rows] of grouped){
  const only=(stage,task)=>{const list=rows.filter(e=>e.stage===stage&&
   (task===undefined||e.task===task));return list.length===1?list[0]:null;};
  const ready=only('ready'),triage=only('triage'),claim=only('claimed');
  if(ready)add('created_to_ready',created,ready.atMs,head);
  if(ready&&triage)add('ready_to_triage',ready.atMs,triage.atMs,head);
  if(triage&&claim&&(!triage.task||triage.task===claim.task))
   add('triage_to_claimed',triage.atMs,claim.atMs,head,claim.task);
  const tasks=new Set(rows.map(e=>e.task).filter(t=>typeof t==='string'&&/^[0-9a-f]{32}$/i.test(t)));
  for(const task of tasks){
   const c=only('claimed',task),begin=only('repair_started',task),pub=only('source_published',task);
   if(c&&begin)add('claimed_to_repair_started',c.atMs,begin.atMs,head,task);
   if(begin&&pub&&SHA.test(pub.newHead||'')&&pub.newHead.toLowerCase()!==head)
    add('repair_started_to_source_published',begin.atMs,pub.atMs,head,task);
   if(pub&&selectedRun&&SHA.test(pub.newHead||'')&&
      pub.newHead.toLowerCase()===p.head?.sha?.toLowerCase())
    add('source_published_to_ci_queued',pub.atMs,ts(selectedRun.ci_run_created_at),head,task);
  }
 }
 if(SHA.test(p.mergeSha||'')){
  const live=events.filter(e=>e?.kind==='live_verified'&&e.pr===p.number&&
   e.production===true&&e.aliasVerified===true&&e.smokeVerified===true&&
   String(e.mergeSha||'').toLowerCase()===p.mergeSha.toLowerCase())
   .map(e=>ts(e.at)).filter(t=>t!==null&&t>=merged&&t<=endMs).sort((a,b)=>a-b);
  if(live.length)add('merged_to_live_verified',merged,live[0],p.mergeSha,null,
   'authenticated_github_actions_live_receipt');
 }
 return Object.fromEntries(RECEIPT_SUBSTAGES.map(k=>[k,
  candidates[k].length===1?candidates[k][0]:null]));
}
function audit({prs,runs,jobs,events=[],start,end,productionBase=PROD,syntheticParents={}}){
 if(!Array.isArray(prs)||!Array.isArray(runs)||!Array.isArray(jobs)||!Array.isArray(events)||
  ts(start)===null||ts(end)===null||ts(start)>=ts(end)||productionBase!==PROD)throw Error('INVALID_AUDIT_INPUT');
 const startMs=ts(start),endMs=ts(end),seen=new Set(),rows=[];
 for(const p of prs){
  if(!Number.isSafeInteger(p?.number)||p.number<1||seen.has(p.number))throw Error('DUPLICATE_OR_INVALID_PR');
  seen.add(p.number);
  if(p.base?.ref!==productionBase)continue;
  const created=ts(p.created_at),merged=ts(p.merged_at);
  if(created===null||created<startMs||created>=endMs||merged===null||merged>endMs)continue;
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
  const received=receiptTimings(p,events,created,merged,outcome?.observed||null,endMs);
  rows.push({pr:p.number,head_sha:SHA.test(head||'')?head:null,
   url:p.html_url||'https://github.com/'+REPO+'/pull/'+p.number,
   created_at:p.created_at,merged_at:p.merged_at,full_minutes:round(full),
   verified:!!outcome,missing_reason:reason,
   intervals:outcome?Object.fromEntries(STAGES.map(k=>[k,round(outcome.values[k])])):null,
   job_substages:outcome?Object.fromEntries(JOB_SUBSTAGES.map(k=>[k,round(outcome.substages[k])])):null,
   authenticated_receipt_intervals:received,
   evidence:outcome?{...outcome.observed,run_id:outcome.run_id,job_ids:outcome.job_ids,run_attempt:outcome.run_attempt}:null});
 }
 rows.sort((a,b)=>a.pr-b.pr);
 const total=rows.length,sum=rows.reduce((a,b)=>a+b.full_minutes,0),checked=rows.filter(r=>r.verified);
 const stages=Object.fromEntries(STAGES.map(k=>{
  const sampled=checked.map(r=>r.intervals[k]),x=cohortStage(sampled,total);
  return [k,{...x,verified_only:summarize(sampled)}];
 }));
 const job_substages=Object.fromEntries(JOB_SUBSTAGES.map(k=>
  [k,cohortStage(checked.map(r=>r.job_substages[k]),total)]));
 const receipt_substages=Object.fromEntries(RECEIPT_SUBSTAGES.map(k=>
  [k,cohortStage(rows.map(r=>r.authenticated_receipt_intervals[k]?.minutes)
   .filter(Number.isFinite),total)]));
 const allocated=STAGES.reduce((s,k)=>s+(stages[k].contribution_mean_minutes||0),0);
 const mean=total?round(sum/total):null,unallocated=total?round(rows.filter(r=>!r.verified).reduce((s,r)=>s+r.full_minutes,0)/total):null;
 const candidates=STAGES.filter(k=>k!=='before_final_head_ci')
  .map(stage=>({stage,contribution_mean_minutes:stages[stage].contribution_mean_minutes}))
  .filter(x=>x.contribution_mean_minutes!==null)
  .sort((a,b)=>b.contribution_mean_minutes-a.contribution_mean_minutes);
 const unresolved=total?round((unallocated||0)+
  (stages.before_final_head_ci.contribution_mean_minutes||0)):null;
 const first=candidates[0]||null;
 const bottleneck={largest_measured_phase:first,unattributed_mean_minutes:unresolved,
  status:!total?'EMPTY_COHORT':!checked.length?'NO_VERIFIED_GATE':
   first&&first.contribution_mean_minutes>unresolved?
   'LARGEST_PHASE_BOUNDED_BY_EVIDENCE':'UNATTRIBUTED_TIME_MAY_DOMINATE',
  meaning:'Only nonoverlapping post-CI phases may rank; unverified and pre-final-HEAD spans remain unattributed.'};
 return {schema:'HH_PR_CREATED_WALL_CLOCK_V1',cohort:{created_from:start,created_to:end,base:PROD,
  merged_by:end,merged:total,verified:checked.length,unverified:total-checked.length,
  gate_coverage_pct:total?round(checked.length*100/total):null},
  total:summarize(rows.map(r=>r.full_minutes)),stages,job_substages,receipt_substages,
  bottleneck,quantile_method:'P50_P95_LINEAR_INTERPOLATION',
  unknown_contribution_mean_minutes:unallocated,
  reconstruction:{sum_means:total?round(allocated+unallocated):null,full_mean:mean,
   reconciled:total?Math.abs(allocated+unallocated-mean)<=0.05:true},
  limitations:['Verified stages are exact final HEAD CI run timestamps only, not original authoring, developer work, or first CI on earlier HEADs.',
   'Core and Specialist job substeps are concurrent diagnostics, never summed into wall time.',
   'Pre-final-HEAD and unverifiable intervals are unattributed, not developer idle time.',
   'Receipt pairs require a unique exact-HEAD/task match. Absent events are never zeros.',
   'LIVE requires an independently authenticated exact merge SHA and smoke/alias proof.'],rows};
}
module.exports={audit,REQUIRED,STAGES,JOB_SUBSTAGES,RECEIPT_SUBSTAGES,summarize};
if(require.main===module){
 const fs=require('node:fs');const input=process.argv[2];if(!input)throw Error('USAGE: node ci-pr-kpi-created-wall-clock.cjs <verified-github-snapshot.json>');
 process.stdout.write(JSON.stringify(audit(JSON.parse(fs.readFileSync(input,'utf8'))),null,2)+'\n');
}