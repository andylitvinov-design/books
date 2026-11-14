'use strict';
// HH_STALE_MERGED_QUEUE_CLEANUP_V1
// Called only inside the EXISTING scheduled or trusted reconcile Watchdog run when the recorded
// Actions queue is over 100. Never starts CI, edits source, or merges a PR.
// Restrict cancellation to first-attempt QUEUED pull_request runs whose
// original source SHA is proven ancestral to the final SHA of one unique,
// already MERGED production PR. Open/held/unmerged/manual reruns stay untouched.
const OWNER='andylitvinov-design', REPO='books';
const FULL=OWNER+'/'+REPO, PROD='codex/public-book-library';
const CONTROL='codex/bootstrap-books', SHA=/^[a-f0-9]{40}$/i;
const GRACE=30*60*1000, THRESHOLD=100;
const MAX_CANCELS=12,MAX_BRANCHES=12,MAX_COMPARES=14,MAX_JOBLESS_409=4;
const MAX_FORCE_CANCELS=2,MAX_DELETE_ATTEMPTS=2;
const DELETE_MIN_AGE_MS=14*24*60*60*1000+60*60*1000;
const date=s=>{const x=Date.parse(s||'');return Number.isFinite(x)?x:null;};
function queuedPRRun(run){
 return run&&Number.isSafeInteger(run.id)&&run.id>0&&
  run.status==='queued'&&run.event==='pull_request'&&run.run_attempt===1&&
  run.repository?.full_name===FULL&&run.head_repository?.full_name===FULL&&
  typeof run.head_branch==='string'&&run.head_branch!==CONTROL&&
  run.head_branch!==PROD&&SHA.test(run.head_sha||'')&&
  date(run.created_at)!==null&&Array.isArray(run.pull_requests)&&
  run.pull_requests.length<=1;
}
function oldEnoughForDelete(run,now){
 const created=date(run?.created_at),updated=date(run?.updated_at);
 return queuedPRRun(run)&&Number.isFinite(now)&&created!==null&&
  updated!==null&&updated>=created&&created<=now-DELETE_MIN_AGE_MS&&
  updated<=now-60*60*1000;
}
function mergedProduction(pr,run,now){
 if(!pr||pr.state!=='closed'||pr.merged_at==null||
    // GitHub listPullRequests omits the "merged" boolean; require the
    // authoritative true flag only in the final pulls.get() readback.
    pr.base?.ref!==PROD||
    pr.base?.repo?.full_name!==FULL||
    pr.head?.repo?.full_name!==FULL||
    pr.head?.ref!==run.head_branch||!SHA.test(pr.head.sha||''))return false;
 const created=date(pr.created_at),merged=date(pr.merged_at),at=date(run.created_at);
 return created!==null&&merged!==null&&at!==null&&
  created<=at&&at<=merged&&merged<=now-GRACE;
}
function uniqueRunOwner(run,pr){
 if(run.pull_requests.length===0)return true; // unique historical branch AND SHA ancestry separately required
 const x=run.pull_requests[0];
 return x?.number===pr.number&&x.base?.ref===PROD&&
  (!x.head?.ref||x.head.ref===run.head_branch)&&
  (!x.head?.repo?.full_name||x.head.repo.full_name===FULL);
}
function validComparison(compare,run,pr){
 return compare&&['ahead','identical'].includes(compare.status)&&
  compare.merge_base_commit?.sha?.toLowerCase()===run.head_sha.toLowerCase()&&
  (compare.base_commit?.sha==null||
   compare.base_commit.sha.toLowerCase()===run.head_sha.toLowerCase());
}
function trustedContext(context){
 if(context?.repo?.owner!==OWNER||context.repo.repo!==REPO||
    context.ref!=='refs/heads/'+CONTROL)return false;
 if(context.eventName==='schedule')return true;
 // GitHub cron delivery is irregular: the EXISTING owner-controlled
 // reconciliation uses workflow_dispatch (observed signed run 43283105500).
 // Never activate for a dry-run, targeted PM, completion or direct dispatch.
 if(context.eventName!=='workflow_dispatch')return false;
 const inputs=context.payload?.inputs||{};
 const enabled=k=>String(inputs[k]??'false').toLowerCase()==='true';
 return !enabled('dry_run')&&!enabled('completion_wake')&&
  !enabled('direct_dispatch')&&
  String(inputs.pm_pr_number||'')===''&&String(inputs.pm_request_id||'')==='';
}
async function runCleanup({github,context,core={info(){},warning(){}},
 observedQueued,observedRemaining,now=Date.now(),maxCancels=MAX_CANCELS}={}){
 const out={schema:'HH_STALE_MERGED_QUEUE_CLEANUP_V1',status:'HOLD',
  scanned:0,checked_branches:0,proved_shas:0,eligible:0,
  cancel_accepted:[],cancel_attempts:0,force_cancel_attempts:0,
  force_cancel_accepted:[],non_cancelable:[],
  delete_attempts:0,delete_verified:[],delete_unverified:[],
  delete_denied:[],delete_deferred:0,
  skipped:0,partial:true,errors:[]};
 if(!trustedContext(context))return {...out,status:'UNTRUSTED_CONTEXT'};
 if(!Number.isSafeInteger(observedQueued)||observedQueued<=THRESHOLD||
    !Number.isSafeInteger(observedRemaining)||observedRemaining<250)
  return {...out,status:'NO_CONFIRMED_BUDGET_OR_PRESSURE'};
 if(!github?.rest?.actions?.listWorkflowRunsForRepo||
    !github.rest.actions.getWorkflowRun||!github.rest.actions.cancelWorkflowRun||
    !github.rest.actions.listJobsForWorkflowRun||
    !github.rest.pulls?.list||!github.rest.pulls.get||
    !github.rest.repos?.compareCommits)
  return {...out,status:'MISSING_TRUSTED_APIS'};
 const limit=Math.min(MAX_CANCELS,Math.max(1,Number.isSafeInteger(maxCancels)?maxCancels:MAX_CANCELS));
 const response=(await github.rest.actions.listWorkflowRunsForRepo({
  owner:OWNER,repo:REPO,status:'queued',per_page:100,page:1})).data;
 if(!Array.isArray(response?.workflow_runs)||response.workflow_runs.length>100||
   !Number.isSafeInteger(response.total_count)||response.total_count<0)
  return {...out,status:'QUEUE_INVENTORY_INVALID'};
 out.scanned=response.workflow_runs.length;
 out.queued_observed=response.total_count;
 if(response.total_count<=THRESHOLD)
  return {...out,status:'QUEUE_NO_LONGER_SATURATED',partial:false};
 const branches=new Map(),commits=new Map();
 // Rotate the bounded queue page so one uncancellable GitHub zombie cannot
 // starve all other independently verified stale merged-PR checks forever.
 const rotation=Math.floor(now/(10*60*1000))%Math.max(1,response.workflow_runs.length);
 for(let index=0;index<response.workflow_runs.length;index++){
  if(out.cancel_attempts>=limit)break;
  const item=response.workflow_runs[(rotation+index)%response.workflow_runs.length];
  if(!queuedPRRun(item)){out.skipped++;continue;}
  let pr=branches.get(item.head_branch);
  if(pr===undefined){
   if(out.checked_branches>=MAX_BRANCHES){out.partial=true;break;}
   out.checked_branches++;
   try{
    const search=(await github.rest.pulls.list({owner:OWNER,repo:REPO,
     head:OWNER+':'+item.head_branch,state:'all',per_page:2,page:1})).data;
    pr=Array.isArray(search)&&search.length===1?search[0]:null;
   }catch(error){
    out.errors.push('BRANCH_LOOKUP:'+String(error?.status||'unknown'));
    pr=null;
   }
   branches.set(item.head_branch,pr);
  }
  if(!mergedProduction(pr,item,now)||!uniqueRunOwner(item,pr)){
   out.skipped++;continue;
  }
  const key=item.head_sha+':'+pr.head.sha;
  let proven=commits.get(key);
  if(proven===undefined){
   if(out.proved_shas>=MAX_COMPARES){out.partial=true;break;}
   out.proved_shas++;
   try{
    const result=(await github.rest.repos.compareCommits({owner:OWNER,repo:REPO,
      base:item.head_sha,head:pr.head.sha})).data;
    proven=validComparison(result,item,pr);
   }catch(error){
    proven=false;
    out.errors.push('ANCESTRY_UNAVAILABLE:'+String(error?.status||'unknown'));
   }
   commits.set(key,proven);
  }
  if(!proven){out.skipped++;continue;}
  let freshRun,freshPR;
  try{
   [freshRun,freshPR]=await Promise.all([
    github.rest.actions.getWorkflowRun({owner:OWNER,repo:REPO,run_id:item.id}),
    github.rest.pulls.get({owner:OWNER,repo:REPO,pull_number:pr.number})
   ]);
   freshRun=freshRun.data;freshPR=freshPR.data;
  }catch(error){
   out.errors.push('FINAL_READBACK:'+String(error?.status||'unknown'));
   out.partial=true;break;
  }
  if(!queuedPRRun(freshRun)||freshRun.id!==item.id||
     freshRun.head_sha!==item.head_sha||
     freshRun.head_branch!==item.head_branch||
     freshRun.created_at!==item.created_at||
     freshPR?.number!==pr.number||freshPR.merged!==true||
     freshPR.head?.sha!==pr.head.sha||
     freshPR.merged_at!==pr.merged_at||
     !mergedProduction(freshPR,freshRun,now)||
     !uniqueRunOwner(freshRun,freshPR)){
   out.skipped++;continue;
  }
  out.eligible++;
  // GitHub allows deleting unfinished runs older than two weeks. Only
  // previously merged, uniquely associated production PR runs with proven
  // ancestry and ZERO jobs reach this code. One-hour safety margin applies.
  if(oldEnoughForDelete(item,now)){
   if(out.delete_attempts>=MAX_DELETE_ATTEMPTS){
    out.delete_deferred++;continue;
   }
   const deleteRun=typeof github.rest.actions.deleteWorkflowRun==='function'
    ? args=>github.rest.actions.deleteWorkflowRun(args)
    : typeof github.request==='function'
      ? args=>github.request(
        'DELETE /repos/{owner}/{repo}/actions/runs/{run_id}',args)
      : null;
   if(!deleteRun){
    out.delete_deferred++;
    out.errors.push('DELETE_API_UNAVAILABLE');
    break;
   }
   let jobs,preDeleteRun;
   try{
    jobs=(await github.rest.actions.listJobsForWorkflowRun({
     owner:OWNER,repo:REPO,run_id:item.id,per_page:5}))?.data;
    preDeleteRun=(await github.rest.actions.getWorkflowRun({
     owner:OWNER,repo:REPO,run_id:item.id}))?.data;
   }catch(e){
    out.errors.push('DELETE_PROOF_UNAVAILABLE:'+String(e?.status||'unknown'));
    out.skipped++;continue;
   }
   if(jobs?.total_count!==0||!Array.isArray(jobs.jobs)||jobs.jobs.length!==0||
      !oldEnoughForDelete(preDeleteRun,now)||
      preDeleteRun.id!==item.id||
      preDeleteRun.head_sha!==item.head_sha||
      preDeleteRun.head_branch!==item.head_branch||
      preDeleteRun.created_at!==item.created_at||
      preDeleteRun.updated_at!==item.updated_at||
      !mergedProduction(freshPR,preDeleteRun,now)||
      !uniqueRunOwner(preDeleteRun,freshPR)){
    out.skipped++;continue;
   }
   out.delete_attempts++;
   try{
    const deleted=await deleteRun({
     owner:OWNER,repo:REPO,run_id:item.id});
    if(deleted?.status!==204)
     throw Object.assign(Error('DELETE_NOT_ACCEPTED'),{
      status:deleted?.status||0});
    const receipt={run_id:item.id,pr:pr.number,
     old_head:item.head_sha.slice(0,12)};
    // Readback: only a 404 proves removal, not a successful API request.
    try{
     await github.rest.actions.getWorkflowRun({
      owner:OWNER,repo:REPO,run_id:item.id});
     out.delete_unverified.push(receipt);
    }catch(check){
     if(Number(check?.status)===404)out.delete_verified.push(receipt);
     else out.delete_unverified.push(receipt);
    }
   }catch(e){
    const status=Number(e?.status||0);
    out.delete_denied.push({run_id:item.id,status});
    out.errors.push('DELETE_DENIED:'+String(status||'unknown'));
    out.status='GITHUB_DELETE_SUPPORT_TRIAGE';
    // Never repeat an API permission/state conflict in the same sweep.
    if([403,404,409,422,429].includes(status))break;
   }
   continue;
  }
  // Cap attempted API mutations, not successful cancellations. GitHub can
  // report zombie queued runs that reject every cancel with HTTP 409.
  out.cancel_attempts++;
  try{
   await github.rest.actions.cancelWorkflowRun({owner:OWNER,repo:REPO,run_id:item.id});
   out.cancel_accepted.push({run_id:item.id,pr:pr.number,
    old_head:item.head_sha.slice(0,12)});
  }catch(error){
   const status=Number(error?.status||0);
   out.partial=true;
   if(status===409){
    // An incident may strand a first-attempt run at queued with zero jobs.
    // Only after the regular cancel fails, try GitHub's documented fallback.
    let runAfter=null,jobs=null;
    try{
     const [runResult,jobResult]=await Promise.all([
      github.rest.actions.getWorkflowRun({owner:OWNER,repo:REPO,run_id:item.id}),
      github.rest.actions.listJobsForWorkflowRun({
       owner:OWNER,repo:REPO,run_id:item.id,per_page:5})
     ]);
     runAfter=runResult.data;jobs=jobResult.data;
    }catch(e){out.errors.push('JOBLESS_409_PROOF_UNAVAILABLE:'+String(e?.status||'unknown'));}
    const jobless=queuedPRRun(runAfter)&&runAfter.id===item.id&&
      runAfter.head_sha===item.head_sha&&
      runAfter.head_branch===item.head_branch&&
      runAfter.created_at===item.created_at&&
      mergedProduction(freshPR,runAfter,now)&&
      uniqueRunOwner(runAfter,freshPR)&&
      jobs?.total_count===0&&Array.isArray(jobs.jobs)&&jobs.jobs.length===0;
    // NEVER force-cancel an open PR, unproved ancestry, changed run,
    // active job, manual rerun, or a run outside the verified merged scope.
    // At most two attempts per signed sweep; a 202 is accepted, not terminal.
    // github-script's Octokit may omit the named force-cancel method even
    // when its authenticated generic request supports the official endpoint.
    const forceCancel=typeof github.rest.actions.forceCancelWorkflowRun==='function'
      ? args=>github.rest.actions.forceCancelWorkflowRun(args)
      : typeof github.request==='function'
        ? args=>github.request(
          'POST /repos/{owner}/{repo}/actions/runs/{run_id}/force-cancel',args)
        : null;
    let forceStatus=null;
    if(jobless&&out.force_cancel_attempts<MAX_FORCE_CANCELS&&forceCancel){
     out.force_cancel_attempts++;
     try{
      const response=await forceCancel({
       owner:OWNER,repo:REPO,run_id:item.id});
      if(response?.status!==202)
       throw Object.assign(new Error('FORCE_CANCEL_NOT_ACCEPTED'),{
        status:response?.status||0});
      const accepted={run_id:item.id,pr:pr.number,
       old_head:item.head_sha.slice(0,12)};
      out.force_cancel_accepted.push(accepted);
      out.cancel_accepted.push({...accepted,method:'force-cancel'});
      continue;
     }catch(e){
      forceStatus=Number(e?.status||0);
      out.errors.push('FORCE_CANCEL_DENIED:'+String(forceStatus||'unknown'));
     }
    }
    out.errors.push('CANCEL_DENIED:409');
    out.non_cancelable.push({run_id:item.id,pr:pr.number,
     code:jobless?'QUEUED_WITH_ZERO_JOBS_CANCEL_409':'CANCEL_409_UNVERIFIED',
     force_cancel_attempted:forceStatus!==null,
     force_cancel_status:forceStatus,
     url:'https://github.com/'+FULL+'/actions/runs/'+item.id});
    out.status='GITHUB_409_SUPPORT_TRIAGE';
    if(!jobless||out.non_cancelable.length>=MAX_JOBLESS_409)break;
    continue;
   }
   out.errors.push('CANCEL_DENIED:'+String(status||'unknown'));
   if([403,404,422,429].includes(status))break;
  }
 }
 if(!['GITHUB_409_SUPPORT_TRIAGE','GITHUB_DELETE_SUPPORT_TRIAGE'].includes(out.status))
  out.status=out.delete_verified.length?'DELETE_VERIFIED':
   out.delete_unverified.length?'DELETE_204_READBACK_UNVERIFIED':
   out.errors.length?'PARTIAL_ERRORS':
   out.cancel_accepted.length?'CANCELLATION_ACCEPTED_NOT_TERMINAL':'NO_PROVEN_STALE_RUN';
 out.partial=out.partial||response.total_count>response.workflow_runs.length||
  out.cancel_attempts>=limit;
 core.info('HH_STALE_MERGED_QUEUE_CLEANUP '+JSON.stringify(out));
 return out;
}
module.exports={queuedPRRun,mergedProduction,uniqueRunOwner,validComparison,
 trustedContext,runCleanup,MAX_CANCELS,oldEnoughForDelete,DELETE_MIN_AGE_MS};
