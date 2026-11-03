'use strict';
/**
 * Exact-HEAD confirmation for PAT-authored Ready-for-review Core wake.
 * An accepted metadata event is not proof of a real PR Core workflow.
 * Never retries a privileged PR edit or claims a check passed.
 */
const {PROD,REPO,parseRecords,trustedControlComment,commentBody}=require('./ci-pr-task-state.cjs');
const CORE='.github/workflows/hh-pr-core-release.yml';
const MAX_AGE=20*60_000;
const SLACK=3*60_000;
const LIVE_STATUSES=new Set(['queued','in_progress','completed','waiting','pending','requested']);
const EXECUTED_CONCLUSIONS=new Set(['success','failure','timed_out']);
const SHA=/^[a-f0-9]{40}$/i;
const signedFor=(task,comments)=>{
 if(!Array.isArray(comments))return null;
 const signed=comments.filter(trustedControlComment);
 const records=parseRecords(signed);
 if(!records)return null;
 const relevant=records.filter(r=>r.task_key===task.task_key&&r.head_sha===task.head_sha&&
   r.pr_number===task.pr_number&&r.lane==='ci');
 return relevant;
};
function receiptState(task,comments) {
 const records=signedFor(task,comments);
 if(!records)return {status:'UNVERIFIED_HISTORY'};
 if(records.some(r=>r.state==='CI_CORE_CONFIRMED'))return {status:'CONFIRMED'};
 if(records.some(r=>r.state==='CI_WAKE_UNDELIVERED'))return {status:'ESCALATED'};
 const wake=records.filter(r=>r.state==='CI_WAKE_REQUESTED').at(-1);
 if(!wake)return {status:'NO_SIGNED_WAKE'};
 const requestedAt=Date.parse(wake.observed_at||wake.created_at||'');
 if(!Number.isFinite(requestedAt))return {status:'INVALID_WAKE_TIME'};
 return {status:'AWAITING_CORE',requestedAt};
}
function provenCoreRun(run,task,requestedAt){
 if(!run||run.event!=='pull_request'||run.name!=='HH PR core release gate'||
    run.path?.split('@')[0]!==CORE||run.repository?.full_name!==REPO||
    run.head_repository?.full_name!==REPO||
    run.head_branch!==task.head_ref||!SHA.test(task.head_sha||'')||
    !LIVE_STATUSES.has(run.status)||!Number.isSafeInteger(run.id)||run.id<1)
    return false;
 const at=Date.parse(run.created_at||'');
 if(!Number.isFinite(at)||at<requestedAt-SLACK)return false;
 // GitHub legitimately returns pull_requests:[] for recent PR Core runs.
 // That is not an absent run: an exact source SHA + trusted head repo/ref
 // still proves the event tested this source. Never use branch alone.
 if(!Array.isArray(run.pull_requests))return false;
 if(run.pull_requests.length===0)
   return run.head_sha===task.head_sha;
 // A synthetic test-merge SHA can be accepted only with GitHub's explicit
 // PR number, exact source SHA and production target association.
 return run.pull_requests.some(p=>p.number===task.pr_number&&
   p.head?.sha===task.head_sha&&p.base?.ref===PROD);
}
async function verifiedCoreJob({run,github,limited,owner,repo}){
 let jobs;
 try{
   const response=await limited('ci-wake-executed-jobs',()=>
     github.rest.actions.listJobsForWorkflowRun({
       owner,repo,run_id:run.id,per_page:100,filter:'latest'
     }));
   const data=response?.data;
   if(!Number.isSafeInteger(data?.total_count)||data.total_count>100||
      !Array.isArray(data.jobs)||data.jobs.length!==data.total_count)
     return {state:'UNKNOWN',reason:'CORE_JOB_HISTORY_INCOMPLETE'};
   jobs=data.jobs;
 }catch{return {state:'UNKNOWN',reason:'CORE_JOB_HISTORY_UNAVAILABLE'};}
 const coreJobs=jobs.filter(job=>job.name==='core-lint-types-build');
 if(coreJobs.length!==1)return {state:'UNKNOWN',reason:'CORE_PRIMARY_JOB_UNVERIFIED'};
 const job=coreJobs[0];
 const started=Number.isFinite(Date.parse(job.started_at||''))&&
   typeof job.runner_name==='string'&&job.runner_name.length>0;
 if(!started)return {state:'WAITING',reason:'CORE_RUNNER_NOT_STARTED'};
 if(job.status==='in_progress')return {state:'RUNNING',jobId:job.id};
 if(job.status==='completed'&&EXECUTED_CONCLUSIONS.has(job.conclusion))
   return {state:'EXECUTED',jobId:job.id};
 return {state:'UNKNOWN',reason:'CORE_JOB_NOT_EXECUTED'};
}
async function reconcileCiWake({task,comments,now,dryRun,github,owner,repo,limited}){
 const previous=receiptState(task,comments);
 const result={state:previous.status,coreRunId:null,receiptWritten:false,
   hintCleared:false,manualFlagged:false};
 if(!['AWAITING_CORE','CONFIRMED','ESCALATED'].includes(previous.status))return result;
 if(previous.status==='ESCALATED')result.state='CI_WAKE_UNDELIVERED';
 let run=null,zeroHistory=false;
 if(previous.status==='AWAITING_CORE'){
   try{
     // The created-time filter excludes historical runs before this wake.
     // Without it, an old PR can remain "unverified" forever even when no
     // Core run has appeared after an accepted Ready event.
     const created='>='+new Date(previous.requestedAt-SLACK).toISOString();
     const response=await limited('ci-wake-core-history',()=>github.request(
       'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
         owner,repo,workflow_id:'hh-pr-core-release.yml',
         branch:task.head_ref,event:'pull_request',created,per_page:100
       }));
     const history=response?.data;
     if(!history||!Number.isSafeInteger(history.total_count)||
        history.total_count<0||history.total_count>100||
        !Array.isArray(history.workflow_runs)||
        history.workflow_runs.length!==history.total_count){
       result.state='CORE_HISTORY_UNVERIFIED';return result;
     }
     zeroHistory=history.total_count===0;
     run=history.workflow_runs
       .filter(r=>provenCoreRun(r,task,previous.requestedAt))
       .sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))[0];
   }catch{result.state='CORE_HISTORY_UNAVAILABLE';return result;}
   if(!run){
     const elapsed=now-previous.requestedAt;
     if(!Number.isFinite(elapsed)||elapsed<0){
       result.state='WAKE_TIME_UNVERIFIED';return result;
     }
     if(elapsed<MAX_AGE){result.state='CI_WAKE_AWAITING_CORE';return result;}
     // An incomplete/inconclusive branch history is not evidence that
     // an accepted GitHub event failed to arrive.
     if(!zeroHistory){
       result.state='CI_WAKE_CORE_ASSOCIATION_UNVERIFIED';return result;
     }
     result.state='CI_WAKE_UNDELIVERED';
     result.reasonCode='NO_PR_CORE_AFTER_20_MINUTES';
   } else {
     result.coreRunId=run.id;
     // GitHub can refresh run.pull_requests to the current HEAD after a
     // historic synthetic merge was checked. Require the actual merge
     // commit's second parent to be this exact source before any receipt.
     if(run.head_sha!==task.head_sha){
       if(!SHA.test(run.head_sha||'')){
         result.state='CORE_SYNTHETIC_PARENT_UNVERIFIED';return result;
       }
       let parents;
       try{
         const verified=await limited('ci-wake-core-merge-parent',()=>github.request(
           'GET /repos/{owner}/{repo}/git/commits/{commit_sha}',
           {owner,repo,commit_sha:run.head_sha}));
         parents=verified?.data?.parents;
       }catch{
         result.state='CORE_SYNTHETIC_PARENT_UNVERIFIED';return result;
       }
       if(!Array.isArray(parents)||parents.length!==2||
          parents[1]?.sha!==task.head_sha){
         result.state='CORE_SYNTHETIC_PARENT_UNVERIFIED';return result;
       }
     }
     const elapsed=now-previous.requestedAt;
     if(['queued','waiting','pending','requested'].includes(run.status)){
       result.state='CI_CORE_QUEUED';return result;
     }
     if(run.status==='completed'&&!EXECUTED_CONCLUSIONS.has(run.conclusion)){
       // A skipped/cancelled/startup-failed workflow is not proof that a
       // runner executed the required Core job.
       result.state=elapsed>=MAX_AGE?'CI_WAKE_UNDELIVERED':'CI_CORE_INTERRUPTED';
       result.reasonCode='CORE_WORKFLOW_INTERRUPTED_BEFORE_PROOF';
       if(result.state==='CI_CORE_INTERRUPTED')return result;
     } else {
       const proof=await verifiedCoreJob({run,github,limited,owner,repo});
       result.coreJobId=proof.jobId||null;
       if(proof.state==='EXECUTED'&&run.status==='completed'){
         result.state='CI_CORE_CONFIRMED';
         result.reasonCode='VERIFIED_CORE_RUNNER_EXECUTED';
       }else if(proof.state==='RUNNING'||(proof.state==='EXECUTED'&&run.status==='in_progress')){
         result.state='CI_CORE_RUNNING';return result;
       }else if(proof.state==='WAITING'){
         result.state='CI_CORE_WAITING_RUNNER';return result;
       }else{
         result.state=proof.reason||'CORE_JOB_EVIDENCE_UNVERIFIED';return result;
       }
     }
   }
 }
 async function exactHead(){
   const live=(await limited('ci-wake-current-head',()=>github.rest.pulls.get({
     owner,repo,pull_number:task.pr_number}))).data;
   return live?.state==='open'&&!live.draft&&
      live.base?.ref===PROD&&live.head?.sha===task.head_sha&&
      live.head?.ref===task.head_ref&&live.head?.repo?.full_name===REPO&&
      live.labels?.some(l=>l.name==='hh:ci-needed');
 }
 if(dryRun)return result;
 if(!await exactHead()){result.state='CI_WAKE_HEAD_OR_QUEUE_CHANGED';return result;}
 if(previous.status==='AWAITING_CORE'){
   const state=result.state==='CI_CORE_CONFIRMED'?'CI_CORE_CONFIRMED':
     result.state==='CI_WAKE_UNDELIVERED'?'CI_WAKE_UNDELIVERED':null;
   if(!state)return result;
   try{
     await limited('ci-wake-durable-outcome',()=>github.rest.issues.createComment({
       owner,repo,issue_number:task.pr_number,
       body:commentBody({...task,state,source_published:false,
         core_run_id:result.coreRunId,
         reason_code:result.reasonCode||
           (state==='CI_WAKE_UNDELIVERED'?'NO_PR_CORE_AFTER_20_MINUTES':'VERIFIED_REAL_PR_CORE'),
         core_job_id:result.coreJobId||null,
         created_at:new Date(now).toISOString()})
     }));
     result.receiptWritten=true;
   }catch{result.state='CI_WAKE_RECEIPT_UNAVAILABLE';return result;}
 }
 if(!await exactHead()){result.state='CI_WAKE_HEAD_MOVED_AFTER_RECEIPT';return result;}
 if(result.state==='CI_WAKE_UNDELIVERED'){
   // Explain the permanent problem; never trigger a second Ready/Draft
   // transition or a no-op source commit from a missing Core response.
   try{
     const label='hh:ci-wake-unverified';
     const add=()=>limited('ci-wake-manual-hold',()=>github.rest.issues.addLabels({
       owner,repo,issue_number:task.pr_number,labels:[label]
     }));
     try{await add();}
     catch(error){
       if(Number(error?.status)!==422)throw error;
       // First use on a repository where the new diagnostic label does not
       // yet exist. A concurrent creator returning 422 is also harmless.
       try{
         await limited('create-ci-wake-label',()=>github.rest.issues.createLabel({
           owner,repo,name:label,color:'fbca04',
           description:'CI wake requested but real exact-head PR Core run unverified'
         }));
       }catch(createError){if(Number(createError?.status)!==422)throw createError;}
       await add();
     }
     result.manualFlagged=true;
   }catch{result.state='CI_WAKE_MANUAL_LABEL_UNAVAILABLE';return result;}
 }
 try{
   if(!await exactHead()){result.state='CI_WAKE_HEAD_MOVED_BEFORE_RETIRE';return result;}
   await limited('ci-wake-retire-queue-hint',()=>github.rest.issues.removeLabel({
     owner,repo,issue_number:task.pr_number,name:'hh:ci-needed'
   }));
   result.hintCleared=true;
 }catch{result.state='CI_WAKE_QUEUE_RETIRE_UNAVAILABLE';}
 return result;
}

/**
 * Recover only a *signed* former manual CI wake hold when independent,
 * exact-current-HEAD Core evidence now exists. The original unverified wake
 * is NOT retried, a green Core job is NOT a green Specialist/merge gate, and
 * neither a label nor a GitHub HTTP response counts as runner execution.
 * On any uncertain association, preserve both labels and hand off for review.
 */
async function recoverVerifiedCiManualHold({task,comments,now,dryRun,github,owner,repo,limited}){
 const fail=reason=>({state:'CI_MANUAL_HOLD_REMAINS',reason,cleared:false});
 if(!task||task.lane!=='ci'||!SHA.test(task.head_sha||'')||
    !Number.isSafeInteger(task.pr_number)||task.pr_number<1||
    !Array.isArray(comments)||!Number.isFinite(now))
   return fail('INVALID_CURRENT_TASK');
 const signed=parseRecords(comments.filter(trustedControlComment));
 const holds=signed?.filter(r=>r.pr_number===task.pr_number&&r.lane==='ci'&&
    r.state==='CI_WAKE_UNDELIVERED'&&SHA.test(r.head_sha||''))||[];
 if(!holds.length)return fail('NO_SIGNED_UNDELIVERED_WAKE');
 try{
  const data=(await limited('ci-hold-current-core-check',()=>github.rest.checks.listForRef({
   owner,repo,ref:task.head_sha,check_name:'core-lint-types-build',
   per_page:100,filter:'latest'
  }))).data;
  if(!Number.isSafeInteger(data?.total_count)||data.total_count<1||
     data.total_count>100||!Array.isArray(data.check_runs)||
     data.check_runs.length!==data.total_count)
   return fail('CURRENT_CORE_CHECKS_INCOMPLETE');
  const check=data.check_runs.find(c=>c?.name==='core-lint-types-build'&&
   Number.isSafeInteger(c.id)&&c.id>0&&c.app?.id===15368&&
   c.head_sha===task.head_sha&&c.status==='completed'&&
   c.conclusion==='success'&&Number.isFinite(Date.parse(c.started_at||''))&&
   c.pull_requests?.some(p=>p.number===task.pr_number&&p.head?.sha===task.head_sha));
  if(!check)return fail('CURRENT_HEAD_CORE_NOT_GREEN');
  const job=(await limited('ci-hold-real-core-job',()=>
   github.rest.actions.getJobForWorkflowRun({owner,repo,job_id:check.id}))).data;
  if(job?.id!==check.id||job.name!=='core-lint-types-build'||
     !Number.isSafeInteger(job.run_id)||job.run_id<1||
     job.status!=='completed'||job.conclusion!=='success'||
     !Number.isFinite(Date.parse(job.started_at||''))||
     typeof job.runner_name!=='string'||!job.runner_name.trim())
   return fail('CURRENT_HEAD_CORE_RUNNER_NOT_PROVEN');
  const run=(await limited('ci-hold-core-workflow-ancestry',()=>
   github.rest.actions.getWorkflowRun({owner,repo,run_id:job.run_id}))).data;
  if(run?.id!==job.run_id||run.name!=='HH PR core release gate'||
     run.event!=='pull_request'||run.status!=='completed'||
     run.repository?.full_name!==REPO||run.head_repository?.full_name!==REPO||
     run.head_sha!==task.head_sha||run.head_branch!==task.head_ref||
     !Array.isArray(run.pull_requests)||
     !run.pull_requests.some(p=>p.number===task.pr_number&&
       p.head?.sha===task.head_sha&&p.base?.ref===PROD))
   return fail('CURRENT_HEAD_CORE_ANCESTRY_NOT_PROVEN');
  const sameHead=holds.filter(h=>h.head_sha===task.head_sha);
  const latestHold=sameHead.length?Math.max(...sameHead.map(h=>
    Date.parse(h.created_at||''))):null;
  if(sameHead.length&&(!Number.isFinite(latestHold)||
     Date.parse(job.started_at)<latestHold))
   return fail('SAME_HEAD_HOLD_NOT_SUPERSEDED_BY_CORE');
  const current=async(requireBoth)=>{
   const p=(await limited('ci-hold-read-current-pr',()=>github.rest.pulls.get({
    owner,repo,pull_number:task.pr_number
   }))).data;
   const labels=new Set((p?.labels||[]).map(l=>l.name));
   return p?.state==='open'&&!p.draft&&p.head?.sha===task.head_sha&&
     p.head?.ref===task.head_ref&&p.head?.repo?.full_name===REPO&&
     p.base?.ref===PROD&&labels.has('hh:ci-wake-unverified')&&
     (!requireBoth||labels.has('hh:ci-needed'));
  };
  if(!await current(true))return fail('CURRENT_HEAD_OR_LABEL_CHANGED');
  const proof={coreRunId:run.id,coreJobId:job.id,headSha:task.head_sha};
  if(dryRun)return {state:'CI_HOLD_RECOVERABLE_DRY_RUN',cleared:false,...proof};
  // Remove the optional wake request first. A partial cleanup must never
  // generate a redundant CI worker dispatch on the following sweep.
  await limited('ci-hold-retire-ci-needed',()=>github.rest.issues.removeLabel({
   owner,repo,issue_number:task.pr_number,name:'hh:ci-needed'
  }));
  if(!await current(false))
   return {state:'CI_HOLD_PARTIAL_CLEANUP_VERIFY_HEAD',cleared:false,...proof};
  await limited('ci-hold-retire-unverified',()=>github.rest.issues.removeLabel({
   owner,repo,issue_number:task.pr_number,name:'hh:ci-wake-unverified'
  }));
  return {state:'CI_HOLD_RECOVERED_VERIFIED_CORE',cleared:true,...proof};
 }catch(error){
  return fail('CORE_EVIDENCE_OR_CLEANUP_UNAVAILABLE');
 }
}

module.exports={receiptState,provenCoreRun,verifiedCoreJob,reconcileCiWake,recoverVerifiedCiManualHold};
