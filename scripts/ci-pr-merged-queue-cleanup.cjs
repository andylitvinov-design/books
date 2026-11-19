'use strict';
// HH_STALE_MERGED_QUEUE_CLEANUP_V1
// Called only inside the EXISTING scheduled or trusted reconcile Watchdog run
// before queued Actions exhaust the ordinary optional-work capacity budget.
// Never starts CI, edits source, or merges a PR.
// Restrict cancellation to first-attempt QUEUED pull_request runs with verified
// ancestry and unique production PR ownership. Existing merged PRs retain the
// 14-day jobless deletion path; open Ready PRs qualify ONLY when their stale
// source/merge run is jobless and an independently newer source HEAD is proven.
// A CLOSED-UNMERGED PR also qualifies ONLY with a jobless queued run, verified
// closure, unique source ownership, ancestry and final immutable readback.
// No current-HEAD open PR, Draft, held, manual rerun or merge mutation.
const OWNER='andylitvinov-design', REPO='books';
const FULL=OWNER+'/'+REPO, PROD='codex/public-book-library';
const CONTROL='codex/bootstrap-books', SHA=/^[a-f0-9]{40}$/i;
// Reclaim stale runs *before* the normal 60/72 queued-run admission stop.
// No cancellation is authorized without complete exact-run PR proof.
const GRACE=30*60*1000, THRESHOLD=40;
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
function closedUnmergedProduction(pr,run,now){
 // Never infer closure from a label or a run status. Recheck the live PR
 // merged=false after the full ancestry and zero-job evidence.
 if(!pr||pr.state!=='closed'||pr.merged_at!=null||
    typeof pr.closed_at!=='string'||pr.draft===true||
    pr.base?.ref!==PROD||pr.base?.repo?.full_name!==FULL||
    pr.head?.repo?.full_name!==FULL||
    pr.head?.ref!==run.head_branch||!SHA.test(pr.head.sha||'')||
    !uniqueRunOwner(run,pr))return false;
 const created=date(pr.created_at),closed=date(pr.closed_at),
       queued=date(run.created_at);
 return created!==null&&closed!==null&&queued!==null&&
   created<=queued&&queued<=closed&&closed<=now-GRACE;
}
function staleOpenProduction(pr,run,now){
 // Complement the already-merged cleanup only for orphaned, jobless old-HEAD
 // checks of a single still-open same-repository production PR.
 if(!pr||pr.state!=='open'||pr.draft===true||pr.merged===true||
    pr.merged_at!=null||pr.base?.ref!==PROD||
    pr.base?.repo?.full_name!==FULL||
    pr.head?.repo?.full_name!==FULL||pr.head?.ref!==run.head_branch||
    !SHA.test(pr.head.sha||'')||pr.head.sha===run.head_sha||
    run.pull_requests?.length!==1||!uniqueRunOwner(run,pr))return false;
 const labels=Array.isArray(pr.labels)
   ?pr.labels.map(label=>typeof label==='string'?label:label?.name):[];
 if(labels.some(label=>['hold','hh:hold','hh:repair-manual','hh:security-hold'].includes(label)))
   return false;
 const created=date(pr.created_at),queued=date(run.created_at);
 return created!==null&&queued!==null&&created<=queued&&queued<=now-GRACE;
}
function validOpenAncestry(compare,run){
 // A loose branch ruleset and a matching branch name are NOT ancestry proof.
 // In particular, reject diverged, behind, missing/partial or mutable compares.
 return compare?.status==='ahead'&&
   compare.base_commit?.sha?.toLowerCase()===run.head_sha.toLowerCase()&&
   compare.merge_base_commit?.sha?.toLowerCase()===run.head_sha.toLowerCase()&&
   compare.behind_by===0&&
   Number.isSafeInteger(compare.ahead_by)&&compare.ahead_by>0&&
   Number.isSafeInteger(compare.total_commits)&&
   compare.total_commits>=compare.ahead_by;
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
  deferred_same_branch_409:0,
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
 // A frozen first page of 100 jobless GitHub 409 runs must not hide older
 // queues forever. Rotate ONE page per existing reconciliation (20-minute
 // slot); do not add API calls, workflow runs or cancellation budget.
 // This read-only page choice never authorizes a source write or merge.
 const pagesToRotate=Math.min(3,Math.max(1,Math.ceil(observedQueued/100)));
 const queuePage=Number.isFinite(now)
  ?Math.floor(now/(20*60*1000))%pagesToRotate+1:1;
 const response=(await github.rest.actions.listWorkflowRunsForRepo({
  owner:OWNER,repo:REPO,status:'queued',per_page:100,page:queuePage})).data;
 if(!Array.isArray(response?.workflow_runs)||response.workflow_runs.length>100||
   !Number.isSafeInteger(response.total_count)||response.total_count<0)
  return {...out,status:'QUEUE_INVENTORY_INVALID'};
 out.scanned=response.workflow_runs.length;
 out.queued_observed=response.total_count;
 out.queue_page=queuePage;
 out.queue_pages_planned=pagesToRotate;
 if(response.total_count<=THRESHOLD)
  return {...out,status:'QUEUE_NO_LONGER_SATURATED',partial:false};
 const branches=new Map(),commits=new Map();
 const denied409Branches=new Set();
 // Rotate the bounded queue page so one uncancellable GitHub zombie cannot
 // starve all other independently verified stale merged-PR checks forever.
 const rotation=Math.floor(now/(10*60*1000))%Math.max(1,response.workflow_runs.length);
 for(let index=0;index<response.workflow_runs.length;index++){
  if(out.cancel_attempts>=limit)break;
  const item=response.workflow_runs[(rotation+index)%response.workflow_runs.length];
  // A proved merged 409 plus denied force-cancel is one branch-level root.
  // Defer its sibling runs for this sweep, not other independent PRs.
  if(denied409Branches.has(item.head_branch)){
   out.deferred_same_branch_409++;
   out.skipped++;
   continue;
  }
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
  const mergedScope=mergedProduction(pr,item,now);
  const closedScope=closedUnmergedProduction(pr,item,now);
  const openScope=staleOpenProduction(pr,item,now);
  if(!(mergedScope||closedScope||openScope)||!uniqueRunOwner(item,pr)){
   out.skipped++;continue;
  }
  const key=(openScope?'OPEN:':closedScope?'CLOSED:':'MERGED:')+
    item.head_sha+':'+pr.head.sha;
  let proven=commits.get(key);
  if(proven===undefined){
   if(out.proved_shas>=MAX_COMPARES){out.partial=true;break;}
   out.proved_shas++;
   try{
    const result=(await github.rest.repos.compareCommits({owner:OWNER,repo:REPO,
      base:item.head_sha,head:pr.head.sha})).data;
    proven=openScope?validOpenAncestry(result,item):validComparison(result,item,pr);
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
  const freshScope=mergedScope?
    freshPR?.merged===true&&freshPR.merged_at===pr.merged_at&&
      mergedProduction(freshPR,freshRun,now)
    :closedScope?
      freshPR?.merged===false&&freshPR.closed_at===pr.closed_at&&
      closedUnmergedProduction(freshPR,freshRun,now)
    :freshPR?.merged===false&&staleOpenProduction(freshPR,freshRun,now);
  if(!queuedPRRun(freshRun)||freshRun.id!==item.id||
     freshRun.head_sha!==item.head_sha||
     freshRun.head_branch!==item.head_branch||
     freshRun.created_at!==item.created_at||
     freshPR?.number!==pr.number||freshPR.head?.sha!==pr.head.sha||
     !freshScope||!uniqueRunOwner(freshRun,freshPR)){
   out.skipped++;continue;
  }
  if(openScope||closedScope){
   // A queued OPEN or CLOSED-UNMERGED PR run might contain a real job.
   // Require zero jobs and re-read exact run, SHA and PR merge/closure state
   // before touching either. Merged PRs keep their original strict policy.
   let evidence,verifiedRun,verifiedPR;
   try{
    const [j,r,p]=await Promise.all([
     github.rest.actions.listJobsForWorkflowRun({
      owner:OWNER,repo:REPO,run_id:item.id,per_page:5}),
     github.rest.actions.getWorkflowRun({
      owner:OWNER,repo:REPO,run_id:item.id}),
     github.rest.pulls.get({
      owner:OWNER,repo:REPO,pull_number:pr.number})
    ]);
    evidence=j?.data;verifiedRun=r?.data;verifiedPR=p?.data;
   }catch(error){
    out.errors.push('NONMERGED_JOBLESS_PROOF_UNAVAILABLE:'+String(error?.status||'unknown'));
    out.skipped++;continue;
   }
   if(evidence?.total_count!==0||!Array.isArray(evidence.jobs)||
      evidence.jobs.length!==0||!queuedPRRun(verifiedRun)||
      verifiedRun.id!==item.id||verifiedRun.head_sha!==item.head_sha||
      verifiedRun.head_branch!==item.head_branch||
      verifiedRun.created_at!==item.created_at||
      verifiedPR?.number!==pr.number||verifiedPR.merged!==false||
      verifiedPR.head?.sha!==pr.head.sha||
      !(closedScope?
        verifiedPR.closed_at===pr.closed_at&&
        closedUnmergedProduction(verifiedPR,verifiedRun,now):
        staleOpenProduction(verifiedPR,verifiedRun,now))||
      !uniqueRunOwner(verifiedRun,verifiedPR)){
    out.skipped++;continue;
   }
  }
  out.eligible++;
  // GitHub allows deleting unfinished runs older than two weeks. Only
  // previously merged, uniquely associated production PR runs with proven
  // ancestry and ZERO jobs reach this code. One-hour safety margin applies.
  if(mergedScope&&oldEnoughForDelete(item,now)){
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
    let runAfter=null,jobs=null,prAfter=null;
    try{
     const [runResult,jobResult,prResult]=await Promise.all([
      github.rest.actions.getWorkflowRun({owner:OWNER,repo:REPO,run_id:item.id}),
      github.rest.actions.listJobsForWorkflowRun({
       owner:OWNER,repo:REPO,run_id:item.id,per_page:5}),
      (openScope||closedScope)?github.rest.pulls.get({
       owner:OWNER,repo:REPO,pull_number:pr.number})
       :Promise.resolve({data:freshPR})
     ]);
     runAfter=runResult.data;jobs=jobResult.data;prAfter=prResult.data;
    }catch(e){out.errors.push('JOBLESS_409_PROOF_UNAVAILABLE:'+String(e?.status||'unknown'));}
    const afterScope=openScope?
      prAfter?.merged===false&&prAfter.head?.sha===pr.head.sha&&
        staleOpenProduction(prAfter,runAfter,now)
      :closedScope?
        prAfter?.merged===false&&prAfter.closed_at===pr.closed_at&&
        prAfter.head?.sha===pr.head.sha&&
        closedUnmergedProduction(prAfter,runAfter,now)
      :mergedProduction(prAfter,runAfter,now);
    const jobless=queuedPRRun(runAfter)&&runAfter.id===item.id&&
      runAfter.head_sha===item.head_sha&&
      runAfter.head_branch===item.head_branch&&
      runAfter.created_at===item.created_at&&
      afterScope&&uniqueRunOwner(runAfter,prAfter)&&
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
    if(mergedScope&&jobless&&out.force_cancel_attempts<MAX_FORCE_CANCELS&&forceCancel){
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
    // GitHub rejected both documented cancellation endpoints for one
    // exact, jobless merged branch. Avoid redundant writes this sweep.
    if(mergedScope&&jobless&&forceStatus===409)
     denied409Branches.add(item.head_branch);
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
module.exports={queuedPRRun,mergedProduction,closedUnmergedProduction,staleOpenProduction,validOpenAncestry,
 uniqueRunOwner,validComparison,trustedContext,runCleanup,MAX_CANCELS,
 oldEnoughForDelete,DELETE_MIN_AGE_MS,THRESHOLD};
