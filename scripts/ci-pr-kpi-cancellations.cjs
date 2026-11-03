'use strict';
// Bounded, read-only cancellation sampling. Never present a created-at sample
// as a complete Actions history or workflow wall time as runner cost.
const REASONS=Object.freeze([
 'EXPECTED_STALE','CLOSED_UNMERGED','BASE_MOVED','DUPLICATE','SUSPICIOUS_CANCEL','REAL_FAILURE'
]);
const SHA=/^[a-f0-9]{40}$/i;
const finiteTime=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?n:null;};
const round=x=>Math.round(x*100)/100;
const path=x=>String(x?.path||'').split('@')[0];
const isFailure=x=>['failure','timed_out','startup_failure'].includes(x?.conclusion);
function prRef(run){
 const refs=run?.pull_requests;
 if(!Array.isArray(refs)||refs.length!==1)return null;
 const p=refs[0];
 if(!Number.isSafeInteger(p?.number)||p.number<1||!SHA.test(p.head?.sha||'')||
    !SHA.test(p.base?.sha||''))return null;
 return {number:p.number,head:p.head.sha,base:p.base.sha};
}
function isLater(a,b){
 const left=finiteTime(a?.created_at),right=finiteTime(b?.created_at);
 return left!==null&&right!==null&&(left>right||(left===right&&a.id>b.id));
}
function classifyRun(run,runs,prStates={}){
 if(isFailure(run))return {reason:'REAL_FAILURE',evidence:'RUN_CONCLUSION'};
 if(run?.conclusion!=='cancelled')return null;
 const ref=prRef(run),ended=finiteTime(run.updated_at),started=finiteTime(run.created_at);
 if(ended===null||started===null||ended<started)return {reason:'SUSPICIOUS_CANCEL',evidence:'INVALID_CANCEL_TIMESTAMP'};
 const state=ref&&prStates[String(ref.number)];
 if(state?.merged===false){
  const closed=finiteTime(state.closed_at);
  if(closed!==null&&closed<=ended)return {reason:'CLOSED_UNMERGED',evidence:'PR_CLOSED_BEFORE_CANCELLATION'};
 }
 const successors=(Array.isArray(runs)?runs:[]).filter(next=>{
  if(next?.id===run.id||path(next)!==path(run)||next.event!==run.event||
     !isLater(next,run)||finiteTime(next.created_at)>ended)return false;
  const nextRef=prRef(next);
  if(ref&&nextRef)return nextRef.number===ref.number;
  return !ref&&!nextRef&&run.event==='push'&&
    typeof run.head_branch==='string'&&run.head_branch===next.head_branch;
 }).sort((a,b)=>(finiteTime(b.created_at)-finiteTime(a.created_at))||b.id-a.id);
 // PR identity + one workflow + a newer run created before cancellation are
 // required; merely seeing a different current base is not evidence.
 if(ref){
  const samePR=successors.filter(next=>prRef(next)?.number===ref.number);
  const changedHead=samePR.find(next=>prRef(next).head!==ref.head);
  if(changedHead)return {reason:'EXPECTED_STALE',evidence:'NEWER_PR_HEAD_RUN',successor_run_id:changedHead.id};
  const movedBase=samePR.find(next=>prRef(next).base!==ref.base);
  if(movedBase)return {reason:'BASE_MOVED',evidence:'SAME_HEAD_NEW_PRODUCTION_BASE_RUN',successor_run_id:movedBase.id};
  if(samePR.length)return {reason:'DUPLICATE',evidence:'SAME_HEAD_SAME_BASE_RUN',successor_run_id:samePR[0].id};
 }else for(const next of successors){
  if(SHA.test(run.head_sha||'')&&SHA.test(next.head_sha||'')){
   return {reason:run.head_sha===next.head_sha?'DUPLICATE':'EXPECTED_STALE',
    evidence:'NEWER_PUSH_RUN',successor_run_id:next.id};
  }
 }
 return {reason:'SUSPICIOUS_CANCEL',evidence:'NO_CONFIRMED_CAUSE_REQUIRES_TRIAGE'};
}
async function collectCancellationEvidence({github,owner,repo,since,until=Date.now(),maxRequests=40,
 minRemaining=500,maxRuns=24}){
 const out={complete:false,reason:'BOUNDED_SAMPLE',since,until,reads:0,remaining:null,
  workflowRuns:[],candidateRunIds:[],jobs:[],verifiedJobRunIds:[],prStates:{},truncated:false};
 if(owner!=='andylitvinov-design'||repo!=='books'||!Number.isFinite(since)||
    !Number.isFinite(until)||since>=until||!Number.isSafeInteger(maxRequests)||maxRequests<6||
    maxRequests>100||!Number.isSafeInteger(minRemaining)||minRemaining<100||
    !Number.isSafeInteger(maxRuns)||maxRuns<1||maxRuns>40){
  out.reason='INVALID_INPUT';return out;
 }
 const range=new Date(Math.floor(since/1000)*1000).toISOString().replace('.000Z','Z')+'..'+
  new Date(Math.floor(until/1000)*1000).toISOString().replace('.000Z','Z');
 let halted=false;
 const read=async fn=>{
  if(halted||out.reads>=maxRequests)throw Error('API_BUDGET');
  out.reads++;const res=await fn();
  const left=Number(res?.headers?.['x-ratelimit-remaining']);
  if(!Number.isSafeInteger(left))throw Error('RATE_RESERVE_UNVERIFIED');
  out.remaining=left;if(left<minRemaining)halted=true;
  return res.data;
 };
 try{
  const statuses=['cancelled','failure','timed_out','startup_failure'];
  const pools={};
  const seen=new Map();
  for(const status of [...statuses,'all']){
   const params={owner,repo,created:range,per_page:100,page:1};
   if(status!=='all')params.status=status;
   const data=await read(()=>github.rest.actions.listWorkflowRunsForRepo(params));
   if(!Array.isArray(data?.workflow_runs)||!Number.isSafeInteger(data.total_count)||
      data.total_count<data.workflow_runs.length)throw Error('INVALID_RUN_LIST');
   if(data.total_count>100)out.truncated=true;
   pools[status]=data.workflow_runs.filter(x=>Number.isSafeInteger(x?.id)&&x.id>0&&x.status==='completed');
   for(const run of data.workflow_runs)if(Number.isSafeInteger(run?.id)&&run.id>0)seen.set(run.id,run);
  }
  const failures=[...pools.failure,...pools.timed_out,...pools.startup_failure]
   .filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i&&isFailure(x))
   .sort((a,b)=>(finiteTime(b.created_at)||0)-(finiteTime(a.created_at)||0));
  const failureQuota=Math.min(5,Math.ceil(maxRuns/4),failures.length);
  const cancelled=pools.cancelled.filter(x=>x.conclusion==='cancelled')
   .sort((a,b)=>(finiteTime(b.created_at)||0)-(finiteTime(a.created_at)||0));
  const selected=[...cancelled.slice(0,maxRuns-failureQuota),...failures.slice(0,failureQuota)];
  out.candidateRunIds=selected.map(x=>x.id);
  if(cancelled.length>maxRuns-failureQuota||failures.length>failureQuota)out.truncated=true;
  out.workflowRuns=[...seen.values()];
  const refs=[...new Set(selected.map(x=>prRef(x)?.number).filter(Number.isSafeInteger))];
  if(refs.length&&typeof github.graphql==='function'&&!halted&&out.reads<maxRequests){
   const fields=refs.map(n=>'p'+n+':pullRequest(number:'+n+') { number merged closedAt }').join('\n');
   const query='query($owner:String!,$repo:String!){rateLimit {remaining} repository(owner:$owner,name:$repo){'+fields+'}}';
   out.reads++;
   try{
    const data=await github.graphql(query,{owner,repo});
    const left=data?.rateLimit?.remaining;
    if(Number.isSafeInteger(left)&&left>=minRemaining&&data?.repository){
     out.remaining=left;
     for(const n of refs){
      const p=data.repository['p'+n];
      if(p?.number===n&&typeof p.merged==='boolean')
       out.prStates[String(n)]={merged:p.merged,closed_at:p.closedAt||null};
     }
    }else out.reason='PR_CONTEXT_UNVERIFIED';
   }catch{out.reason='PR_CONTEXT_UNVERIFIED';}
  }else if(refs.length)out.reason='PR_CONTEXT_UNVERIFIED';
  for(const run of selected){
   if(halted||out.reads>=maxRequests){out.reason='API_BUDGET';break;}
   let count=null,total=0,valid=true,recorded=[];
   try{
    for(let page=1;page<=3;page++){
     const data=await read(()=>github.rest.actions.listJobsForWorkflowRun({owner,repo,run_id:run.id,
      filter:'all',per_page:100,page}));
     if(!Array.isArray(data?.jobs)||!Number.isSafeInteger(data.total_count)||
        data.total_count>300||(count!==null&&count!==data.total_count)){valid=false;break;}
     count=data.total_count;total+=data.jobs.length;recorded.push(...data.jobs);
     if(total===count)break;
     if(data.jobs.length<100||page===3){valid=false;break;}
    }
   }catch(error){
    valid=false;out.reason=String(error?.message||error).slice(0,100);
   }
   if(!valid||total!==count||recorded.some(j=>j?.run_id!==run.id||!Number.isSafeInteger(j?.id)||
      j.status!=='completed'||typeof j.conclusion!=='string'||
      (Number.isSafeInteger(j.run_attempt)&&j.run_attempt>run.run_attempt))){
    out.truncated=true;continue;
   }
   out.jobs.push(...recorded);
   out.verifiedJobRunIds.push(run.id);
  }
 }catch(error){out.reason=String(error?.message||error).slice(0,100);}
 return out;
}
function summarizeCancellationWindow({source={},now=Date.now(),windowMs}){
 if(!Number.isFinite(now)||!Number.isFinite(windowMs)||windowMs<=0)throw Error('INVALID_CANCEL_WINDOW');
 const counts=Object.fromEntries(REASONS.map(x=>[x,0]));
 const minutes=Object.fromEntries(REASONS.map(x=>[x,0]));
 const ids=new Set(source.candidateRunIds||[]);
 const certified=new Set(source.verifiedJobRunIds||[]);
 const runs=Array.isArray(source.workflowRuns)?source.workflowRuns:[];
 const jobs=Array.isArray(source.jobs)?source.jobs:[];
 let unverified=0,queuedOnly=0,verified=0;
 const sample=[];
 for(const run of runs){
  if(!ids.has(run.id)||!(run.conclusion==='cancelled'||isFailure(run)))continue;
  const at=finiteTime(run.updated_at);
  if(at===null||at<=now-windowMs||at>now)continue;
  const detail=classifyRun(run,runs,source.prStates);
  if(!detail)continue;
  counts[detail.reason]++;
  let cost=null;
  if(certified.has(run.id)){
   cost=0;
   let startedJobs=0;
   for(const job of jobs.filter(j=>j.run_id===run.id)){
    if(Number.isSafeInteger(job.run_attempt)&&Number.isSafeInteger(run.run_attempt)&&
       job.run_attempt!==run.run_attempt)continue;
    if(job.conclusion==='skipped')continue;
    if(job.started_at===null||job.started_at===undefined){
     if(job.conclusion==='cancelled'&&job.runner_name===null)continue;
     cost=null;break;
    }
    const start=finiteTime(job.started_at),end=finiteTime(job.completed_at);
    if(job.status!=='completed'||start===null||end===null||end<start){cost=null;break;}
    cost+=(end-start)/60000;startedJobs++;
   }
   if(cost!==null){
    cost=round(cost);minutes[detail.reason]=round(minutes[detail.reason]+cost);
    verified++;
    if(run.conclusion==='cancelled'&&startedJobs===0)queuedOnly++;
   }
  }
  if(cost===null)unverified++;
  sample.push({run_id:run.id,pr:prRef(run)?.number||null,workflow:path(run),reason:detail.reason,
   evidence:detail.evidence,successor_run_id:detail.successor_run_id||null,
   runner_minutes:cost});
 }
 return {label:'SAMPLE_NOT_TOTAL',counts,runner_minutes_observed:minutes,
  cancelled_runner_minutes_observed:round(REASONS.filter(r=>r!=='REAL_FAILURE').reduce((s,r)=>s+minutes[r],0)),
  failed_runner_minutes_observed:minutes.REAL_FAILURE,
  verified_job_inventories:verified,unverified_job_inventories:unverified,
  cancelled_before_runner:queuedOnly,scanned_run_sample:sample.length,
  truncated:source.truncated===true,examples:sample.slice(0,12)};
}
module.exports={REASONS,classifyRun,collectCancellationEvidence,summarizeCancellationWindow};
