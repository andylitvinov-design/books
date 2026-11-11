'use strict';
/* HH_PR_3_KPI_V1
 * Read-only evidence model. Never infer absent stage times from PR age,
 * labels, CI run success alone, or a non-verified merge state.
 * Different KPIs have distinct event-completion cohorts, each with n and
 * archival coverage; historical missing evidence must never become 0%.
 */
const SCHEMA='HH_PR_THREE_KPI_V1',HOST='andylitvinov-design/books';
const SHARD='<!-- HH_CORE_CI_JOURNEY_SHARD_V1:',SHARD_SCHEMA='HH_CORE_CI_JOURNEY_SHARD_V1';
const PROD='codex/public-book-library',SHA=/^[0-9a-f]{40}$/i;
const M=60000,D=86400000;
const TORONTO='America/Toronto';
const PARTS=new Intl.DateTimeFormat('en-US',{timeZone:TORONTO,
 year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',
 minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function zoneOffset(ms) {
 const p=Object.fromEntries(PARTS.formatToParts(new Date(ms)).filter(x=>x.type!=='literal')
  .map(x=>[x.type,Number(x.value)]));
 const utc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
 return utc-Math.floor(ms/1000)*1000;
}
const REQUIRED=['core-lint-types-build','hh-specialist','hh-merge-check'];
const FAIL=new Set(['failure','timed_out','startup_failure']);
const ts=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:null};
const goodId=n=>Number.isSafeInteger(n)&&n>0;
const round=n=>Math.round(n*100)/100;
const window=(now,offsetDays=0)=>{
  if(!Number.isFinite(now))throw Error('INVALID_NOW');
  const approx=now-offsetDays*D;
  // Align the same Toronto local clock across daylight-saving transitions.
  const end=offsetDays===0?now:approx+zoneOffset(now)-zoneOffset(approx);
  return {from:new Date(end-D).toISOString(),to:new Date(end).toISOString(),timezone:TORONTO};
};
const trusted=c=>c?.user?.id===41898282&&c.user.login==='github-actions[bot]'&&
  c.user.type==='Bot'&&c.performed_via_github_app?.id===15368&&
  c.performed_via_github_app?.slug==='github-actions';
function parseShards(comments) {
  if(!Array.isArray(comments))throw Error('INVALID_SHARD_SOURCE');
  const byId=new Map(),conflicts=new Set();
  for(const c of comments) {
    if(!trusted(c)||typeof c.body!=='string'||c.body.length>60000||
       !c.body.startsWith(SHARD))continue;
    const i=c.body.indexOf(' -->\n');if(i<0)continue;
    const bucket=c.body.slice(SHARD.length,i);
    if(!/^\d{4}-\d\d-\d\dT\d\d-(success|failure)$/.test(bucket))continue;
    let p;try{p=JSON.parse(c.body.slice(i+5));}catch{continue;}
    if(p.schema!==SHARD_SCHEMA||p.bucket!==bucket||!Array.isArray(p.runs)||p.runs.length>160)continue;
    for(const r of p.runs) {
      if(!goodId(r.pr)||!goodId(r.run_id)||!goodId(r.attempt)||!SHA.test(r.source_head||'')||
        r.base!==PROD||!Array.isArray(r.jobs)||r.jobs.length>30||ts(r.queued_at)===null||
        ts(r.completed_at)===null||ts(r.queued_at)>ts(r.completed_at))continue;
      const jobIds=new Set(),jobs=[];
      for(const j of r.jobs) {
        if(!goodId(j.id)||jobIds.has(j.id)||typeof j.name!=='string'||j.name.length>120)continue;
        jobIds.add(j.id);
        const q=ts(j.queued_at),s=ts(j.started_at),e=ts(j.completed_at);
        if(q===null||s===null||e===null||q>s||s>e||e>ts(r.completed_at)+120000)continue;
        jobs.push({...j});
      }
      const item={...r,jobs,partial_jobs:r.partial_jobs===true||jobs.length!==r.jobs.length};
      const key=r.run_id+':'+r.attempt,old=byId.get(key);
      if(old&&JSON.stringify(old)!==JSON.stringify(item))conflicts.add(key);
      else if(!old)byId.set(key,item);
    }
  }
  for(const key of conflicts)byId.delete(key);
  return {runs:[...byId.values()],conflicts:conflicts.size};
}
function summarize(nums) {
  const a=nums.filter(n=>Number.isFinite(n)&&n>=0).sort((x,y)=>x-y);
  const q=p=>{if(!a.length)return null;const pos=(a.length-1)*p,
    lo=Math.floor(pos),hi=Math.ceil(pos);return round(a[lo]+(a[hi]-a[lo])*(pos-lo));};
  return {n:a.length,mean_min:a.length?round(a.reduce((x,y)=>x+y,0)/a.length):null,
    median_min:q(.5),p95_min:q(.95)};
}
function getRequired(r) {
  if(r.partial_jobs)return null;
  const by=new Map();
  for(const name of REQUIRED) {
    const found=r.jobs.filter(j=>j.name===name);
    if(found.length!==1)return null;
    by.set(name,found[0]);
  }
  return by;
}
function runOutcome(r) {
  const jobs=getRequired(r);
  if(!jobs)return null;
  const required=[...jobs.values()];
  if(required.some(j=>!['success','failure','timed_out','startup_failure'].includes(j.conclusion)))return null;
  const allPass=required.every(j=>j.conclusion==='success');
  const failure=required.some(j=>FAIL.has(j.conclusion));
  if(r.conclusion==='success'&&allPass)return 'PASS';
  if(FAIL.has(r.conclusion)&&failure)return 'FAIL';
  return null;
}
function validRunWindow(r,now) {
  const a=ts(r.queued_at),b=ts(r.completed_at);
  return a!==null&&b!==null&&a<=b&&b<=now+60000;
}
function firstPass(runs,w,now) {
  const from=ts(w.from),to=ts(w.to);
  const by=new Map();
  for(const r of runs) {
    if(!validRunWindow(r,now))continue;
    const list=by.get(r.pr)||[];list.push(r);by.set(r.pr,list);
  }
  const examples=[],counts={pass:0,fail:0,uncertain:0,eligible:0};
  for(const [pr,list] of by){
    list.sort((a,b)=>ts(a.queued_at)-ts(b.queued_at)||a.run_id-b.run_id||a.attempt-b.attempt);
    const first=list[0],at=ts(first.completed_at);
    if(at===null||at<=from||at>to)continue;
    counts.eligible++;
    // A rerun attempt 2+ without attempt 1 is NOT the first CI wave.
    const state=first.attempt===1?runOutcome(first):null;
    if(state==='PASS')counts.pass++;else if(state==='FAIL')counts.fail++;else counts.uncertain++;
    if(examples.length<8)examples.push({pr,run_url:first.workflow_url||null,
      observed_at:first.completed_at,pass:state||'UNVERIFIED'});
  }
  const n=counts.pass+counts.fail;
  return {schema:'HH_FIRST_OBSERVED_CORE_WAVE_V1',scope:'OBSERVED_FIRST_ARCHIVED_PR_WAVE_NOT_COMPLETE_HISTORY',
    events_completed_within:w,passed:counts.pass,failed:counts.fail,unknown:counts.uncertain,
    measured:n,eligible_observed:counts.eligible,
    percent_observed:n?round(counts.pass*100/n):null,
    actual_first_pass_percent:null,history_complete:false,
    examples};
}
// Core completion is often BEFORE the merge. Its immutable archive cannot
// contain a future merged_at; join later GitHub evidence by exact final HEAD.
function verifyMergeProof(p,r,now) {
  if(!p||p.number!==r.pr||p.base?.ref!==PROD||p.state!=='closed'||
     p.head?.sha?.toLowerCase()!==r.source_head?.toLowerCase()||
     !SHA.test(p.merge_commit_sha||'')||
     ts(p.created_at)===null||ts(p.merged_at)===null||
     ts(p.created_at)>ts(p.merged_at)||ts(p.merged_at)>now+60000||
     (ts(r.pr_created_at)!==null&&ts(r.pr_created_at)!==ts(p.created_at)))return null;
  return {merged_at:p.merged_at,merge_sha:p.merge_commit_sha,
    source:'GITHUB_MERGED_PR_EXACT_HEAD'};
}
function gateToMerge(runs,w,now,mergeProofs=[]) {
  const from=ts(w.from),to=ts(w.to),by=new Map(),proofMap=new Map();
  if(!Array.isArray(mergeProofs)||mergeProofs.length>250)throw Error('INVALID_MERGE_PROOFS');
  for(const p of mergeProofs) {
    if(!goodId(p?.number))continue;
    // Conflicting duplicate snapshots are excluded, never silently selected.
    if(proofMap.has(p.number))proofMap.set(p.number,null);
    else proofMap.set(p.number,p);
  }
  for(const r of runs) {
    if(!validRunWindow(r,now)||r.conclusion!=='success')continue;
    const hasNewProof=proofMap.has(r.pr);
    const verified=hasNewProof?verifyMergeProof(proofMap.get(r.pr),r,now):null;
    // Contemporaneous archive is an independent fallback when no later
    // GitHub snapshot exists. Contradictory final HEAD must fail closed.
    const merge=verified||(hasNewProof||r.current_head!==true||ts(r.merged_at)===null?
      null:{merged_at:r.merged_at,merge_sha:null,source:'ARCHIVED_MERGE_OBSERVED'});
    const merged=ts(merge?.merged_at);
    if(merged===null||merged<=from||merged>to)continue;
    const required=getRequired(r);
    if(!required||runOutcome(r)!=='PASS')continue;
    const core=ts(required.get('core-lint-types-build').completed_at);
    const special=ts(required.get('hh-specialist').completed_at);
    const gate=required.get('hh-merge-check'),green=ts(gate.completed_at);
    if(core===null||special===null||green===null||green<Math.max(core,special)||
      green>merged)continue;
    const entry={pr:r.pr,gate_completed_at:gate.completed_at,merged_at:merge.merged_at,
      merge_sha:merge.merge_sha,merge_proof:merge.source,
      minutes:(merged-green)/M,job_url:gate.url||null,run_url:r.workflow_url||null,
      head_sha:r.source_head};
    const old=by.get(r.pr);
    if(!old||ts(entry.gate_completed_at)>ts(old.gate_completed_at))by.set(r.pr,entry);
  }
  const rows=[...by.values()].sort((a,b)=>a.pr-b.pr);
  return {schema:'HH_FINAL_REQUIRED_PASS_TO_MERGE_SAMPLE_V1',
    scope:'EXACT_PR_HEAD_CONFIRMED_MERGE_AND_THREE_REQUIRED_JOB_PASS',
    ...summarize(rows.map(x=>x.minutes)),
    observed_merged_prs:rows.length,history_complete:false,
    exact_head_merge_proofs:rows.filter(r=>r.merge_proof==='GITHUB_MERGED_PR_EXACT_HEAD').length,
    archived_merge_proofs:rows.filter(r=>r.merge_proof==='ARCHIVED_MERGE_OBSERVED').length,
    rows:rows.slice(0,30).map(x=>({...x,minutes:round(x.minutes)}))};
}
function errors(runs,w,now) {
  const from=ts(w.from),to=ts(w.to),by=new Map();
  for(const r of runs) {
    if(!validRunWindow(r,now))continue;
    // Error → Repair is specifically a failed required Core CI job.
    // Specialist and Merge Gate failures are different release stages and
    // must never consume the bounded Core-repair evidence sample.
    const bad=r.jobs.filter(j=>j.name==='core-lint-types-build'&&
      FAIL.has(j.conclusion)&&ts(j.completed_at)!==null)
      .sort((a,b)=>ts(a.completed_at)-ts(b.completed_at))[0];
    if(!bad)continue;
    const at=ts(bad.completed_at);
    // Allow a failure up to 24h earlier for repairs that start during this window.
    if(at<=from-D||at>to)continue;
    const key=r.pr+':'+r.source_head,old=by.get(key);
    if(!old||at<ts(old.failed_at))by.set(key,{
      pr:r.pr,head_sha:r.source_head,failed_at:bad.completed_at,
      failure_job_url:bad.url||null,workflow_url:r.workflow_url||null
    });
  }
  return [...by.values()].sort((a,b)=>ts(b.failed_at)-ts(a.failed_at));
}
function parseRepairReceipts(comments,{pr,head}) {
  if(!Array.isArray(comments))return [];
  const out=[];
  for(const c of comments) {
    if(!trusted(c)||typeof c.body!=='string'||c.body.length>150000)continue;
    const posted=ts(c.created_at);if(posted===null)continue;
    for(const m of c.body.matchAll(/<!-- HH_PR_STAGE_V1 (\{[^\r\n]{1,680}\}) -->/g)){
      let e;try{e=JSON.parse(m[1]);}catch{continue;}
      if(e.stage!=='repair_started'||e.source!=='github_actions_fix_step'||
        e.pr_number!==pr||e.head_sha!==head||!goodId(Number(e.run_id))||
        !/^[a-f0-9]{32}$/i.test(e.task_key||''))continue;
      const t=ts(e.at);
      if(t===null||t>posted+60000||posted-t>86400000)continue;
      out.push({at:e.at,comment_url:c.html_url||null,run_id:String(e.run_id)});
    }
  }
  return out;
}
function repairSample(candidates,proofs,w,checked) {
  const from=ts(w.from),to=ts(w.to);
  const rows=[],seen=new Set();
  for(const c of candidates) {
    const key=c.pr+':'+c.head_sha;if(seen.has(key))continue;seen.add(key);
    const receipts=proofs?.[key]||[];
    const next=receipts.filter(x=>ts(x.at)!==null&&ts(x.at)>=ts(c.failed_at)&&
      ts(x.at)>from&&ts(x.at)<=to)
      .sort((a,b)=>ts(a.at)-ts(b.at))[0];
    if(next)rows.push({...c,repair_started_at:next.at,
      minutes:(ts(next.at)-ts(c.failed_at))/M,receipt_url:next.comment_url});
  }
  return {schema:'HH_FIRST_CONFIRMED_ERROR_TO_ACTUAL_REPAIR_SAMPLE_V1',
    scope:'VERIFIED_CORE_FAILED_JOB_AND_SAME_HEAD_REPAIR_STARTED_RECEIPT',
    ...summarize(rows.map(r=>r.minutes)),
    candidate_heads:candidates.length,checked_heads:checked,
    unchecked_heads:Math.max(0,candidates.length-checked),
    history_complete:false,
    rows:rows.slice(0,20).map(x=>({...x,minutes:round(x.minutes)}))};
}
function report(runs,now,{partialArchive=true,repairProofs={},repairChecked=0,mergeProofs=[]}={}) {
  const windows={last_24h:window(now,0),week_ago:window(now,7)};
  const obj={};
  for(const [key,w] of Object.entries(windows)){
    const candidates=errors(runs,w,now);
    const repair=repairSample(candidates,repairProofs,w,repairChecked);
    const first=firstPass(runs,w,now),green=gateToMerge(runs,w,now,mergeProofs);
    obj[key]={period:w,error_to_repair:repair,ci_first_pass:first,green_to_merge:green,
      evidence_status:green.n||first.measured||repair.n?
        'VERIFIED_PARTIAL_SAMPLE':'NO_VERIFIED_KPI_PAIRS',
      candidate_errors:candidates.length};
  }
  const earliest=runs.map(r=>ts(r.queued_at)).filter(Number.isFinite).sort((a,b)=>a-b)[0];
  const weekly=windows.week_ago,lower=ts(weekly.from),upper=ts(weekly.to);
  const observed=runs.filter(r=>{const at=ts(r.completed_at);return at!==null&&at>lower&&at<=upper;}).length;
  const status=earliest===undefined||earliest>upper?'NO_ARCHIVED_CORE_COVERAGE':
    earliest>lower?'PARTIAL_ARCHIVE_START':observed?'SAVED_EVENTS_PRESENT':'NO_SAVED_EVENTS_IN_WEEK';
  const weekly_coverage={status,observed_core_runs:observed,history_complete:false,
    missing_is_not_zero:true,period:weekly};
  return {schema:SCHEMA,generated_at:new Date(now).toISOString(),
    basis:'EXACT_EVENT_COMPLETION_IN_EACH_24H_WINDOW',
    source_archive:'https://github.com/'+HOST+'/issues/3419',
    archive_partial:partialArchive===true,
    archived_core_runs:runs.length,
    earliest_archived_core_at:earliest===undefined?null:new Date(earliest).toISOString(),
    historic_context:'https://github.com/'+HOST+'/issues/3394',
    historical_notice:'Cohort 20–21 Oct has no attributable Core CI in #3394. It is a different clock window; do not substitute its totals for these KPI values.',
    windows:obj,weekly_coverage};
}
module.exports={SCHEMA,window,parseShards,firstPass,gateToMerge,verifyMergeProof,errors,
  parseRepairReceipts,repairSample,report,summarize,runOutcome,REQUIRED};
