'use strict';
/* HH_PR_WAVE_EFFECTIVENESS_V1 — evidence-only observation.
 * Same production-base PR creation cohorts: last 24h and preceding 24h.
 * Missing historical Core runs cannot prove an initial/sole wave or a zero.
 * No GitHub writes, CI reruns, or billing-side operations.
 */
const SCHEMA='HH_PR_WAVE_EFFECTIVENESS_V1';
const BASE='codex/public-book-library',HOUR=3600000,DAY=24*HOUR;
const SHA=/^[0-9a-f]{40}$/i;
const {window:alignedWindow}=require('./pr-three-kpi-model.cjs');
const parsed=v=>{const x=Date.parse(v||'');return Number.isFinite(x)?x:null;};
const id=n=>Number.isSafeInteger(n)&&n>0;
const round=n=>Math.round(n*100)/100;
function percent(n,total){return total?round(100*n/total):null;}
function quantiles(nums){
 const s=nums.filter(n=>Number.isFinite(n)&&n>=0).sort((a,b)=>a-b);
 const q=p=>{if(!s.length)return null;const at=(s.length-1)*p,i=Math.floor(at),j=Math.ceil(at);return round(s[i]+(s[j]-s[i])*(at-i));};
 return {n:s.length,median_min:q(.5),p90_min:q(.9)};
}
function build(runs,pulls,now,{cohort_complete=false,pages=0,stale=false}={}){
 if(!Array.isArray(runs)||!Array.isArray(pulls)||!Number.isFinite(now)||
   runs.length>12000||pulls.length>600)throw Error('INVALID_EFFICIENCY_INPUT');
 const currentWindow=alignedWindow(now,0),weeklyWindow=alignedWindow(now,7);
 const cutoff=Date.parse(weeklyWindow.from),group=new Map(),conflicted=new Set();
 for(const p of pulls){
  const created=parsed(p?.created_at);
  if(!id(p?.number)||p?.base?.ref!==BASE||created===null||
     created<cutoff||created>now+60000)continue;
  if(group.has(p.number)){group.delete(p.number);conflicted.add(p.number);continue;}
  if(conflicted.has(p.number))continue;
  group.set(p.number,p);
 }
 const entries=[...group.values()].map(p=>{
  const created=parsed(p.created_at);
  const all=runs.filter(r=>r.pr===p.number&&r.base===BASE&&id(r.run_id)&&
    id(r.attempt)&&SHA.test(r.source_head||'')&&
    (parsed(r.pr_created_at)===null||parsed(r.pr_created_at)===created)&&
    parsed(r.queued_at)!==null&&parsed(r.queued_at)>=created-120000&&
    parsed(r.queued_at)<=now+60000);
  const attempts=new Map();let conflict=false;
  for(const r of all){
   const old=attempts.get(r.run_id);
   if(old&&old.source_head!==r.source_head){conflict=true;break;}
   if(!old)attempts.set(r.run_id,{source_head:r.source_head,max_attempt:r.attempt,
     first:r.attempt===1?r:null});
   else{
    old.max_attempt=Math.max(old.max_attempt,r.attempt);
    if(r.attempt===1)old.first=r;
   }
  }
  const validRuns=conflict?[]:[...attempts.values()];
  const waves=validRuns.map(v=>v.first).filter(Boolean).sort((a,b)=>
    parsed(a.queued_at)-parsed(b.queued_at)||a.run_id-b.run_id);
  let newHeads=0,sameHeads=0,afterFailure=0,duringCI=0;
  for(let i=1;i<waves.length;i++){
   const prev=waves[i-1],next=waves[i];
   if(prev.source_head===next.source_head)sameHeads++;
   else{
    newHeads++;
    if(['failure','timed_out','startup_failure'].includes(prev.conclusion))afterFailure++;
    if(parsed(prev.completed_at)!==null&&parsed(next.queued_at)<parsed(prev.completed_at))duringCI++;
   }
  }
  const retries=validRuns.reduce((n,r)=>n+Math.max(0,r.max_attempt-1),0);
  const merged=parsed(p.merged_at),validMerge=p.state==='closed'&&
    SHA.test(p.merge_commit_sha||'')&&SHA.test(p.head?.sha||'')&&
    merged!==null&&merged>=created&&merged<=now+60000;
  return {pr:p.number,created,merged:validMerge?merged:null,merged_valid:validMerge,
   current_draft:p.draft===true,waves:waves.length,retries,
   wave_covered:waves.length>0&&!conflict,conflict,extras:Math.max(0,waves.length-1),
   new_heads:newHeads,same_heads:sameHeads,after_red:afterFailure,during_ci:duringCI,
   head_versions:new Set(waves.map(r=>r.source_head)).size,
   first_run_url:waves[0]?.workflow_url||null,
   last_run_url:waves[waves.length-1]?.workflow_url||null};
 });
 function period(from,to){
  const rows=entries.filter(p=>p.created>=from&&p.created<to);
  const covered=rows.filter(p=>p.wave_covered),merged=rows.filter(p=>p.merged_valid);
  const sums=covered.reduce((s,p)=>{
   for(const k of ['extras','new_heads','same_heads','after_red','during_ci','retries'])s[k]+=p[k];
   if(p.waves===1)s.one_wave++;
   if(p.waves>=3)s.three_plus++;
   if(p.head_versions>=2)s.multiple_heads++;
   return s;
  },{extras:0,new_heads:0,same_heads:0,after_red:0,during_ci:0,retries:0,
     one_wave:0,three_plus:0,multiple_heads:0});
  const examples=covered.filter(p=>p.extras>0||p.retries>0)
   .sort((a,b)=>b.extras-a.extras||b.retries-a.retries||a.pr-b.pr)
   .slice(0,8).map(p=>({pr:p.pr,waves_observed:p.waves,extra_observed:p.extras,
     same_head:p.same_heads,new_head:p.new_heads,after_red:p.after_red,
     during_ci:p.during_ci,retry_attempts:p.retries,run_url:p.last_run_url}));
  return {
   from:new Date(from).toISOString(),to:new Date(to).toISOString(),
   created_prs:rows.length,ci_archived_prs:covered.length,
   ci_missing_prs:rows.length-covered.length,merged_prs:merged.length,
   unmerged_prs:rows.length-merged.length,
   current_draft_prs:rows.filter(p=>p.current_draft).length,
   one_observed_wave_prs:sums.one_wave,
   observed_one_wave_percent:percent(sums.one_wave,covered.length),
   extra_observed_waves:sums.extras,same_head_extra_waves:sums.same_heads,
   new_head_extra_waves:sums.new_heads,retry_attempts_observed:sums.retries,
   prs_with_3plus_waves:sums.three_plus,prs_with_multiple_ci_heads:sums.multiple_heads,
   new_head_after_failed_run:sums.after_red,new_head_during_previous_ci:sums.during_ci,
   merge_latency:quantiles(merged.map(p=>(p.merged-p.created)/60000)),
   examples
  };
 }
 return {schema:SCHEMA,generated_at:new Date(now).toISOString(),
  basis:'CREATED_PR_COHORTS_PRODUCTION_BASE; MATCHED_TORONTO_24H_WINDOWS_7_DAYS_APART',
  periods:{last_24h:period(Date.parse(currentWindow.from),Date.parse(currentWindow.to)),
   week_ago:period(Date.parse(weeklyWindow.from),Date.parse(weeklyWindow.to))},
  coverage:{cohort_complete:cohort_complete===true,cohort_pages:pages,
   excluded_duplicate_prs:conflicted.size,stale:stale===true,
   core_history_complete:false,first_ever_wave_verified:false,
   merge_latency_right_censored:true},
  notes:[
   'An observed single archived Core wave is not proof of a single true first-ever CI wave.',
   'Extra waves count distinct first-attempt Core workflow IDs after the first observed ID; rerun attempts are separate.',
   'Changed source SHA demonstrates a later CI HEAD, not why a code change was made; after-RED is chronology, not confirmed Repair.',
   'Median/P90 use only already merged PRs in each created cohort; unmerged PRs are right-censored.',
   'Same production base and 24-hour creation windows; different draft/ready compositions and incomplete history limit causal comparisons.'
  ]};
}
module.exports={SCHEMA,build,quantiles};
