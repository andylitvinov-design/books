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
    run.head_branch!==task.head_ref||
    !LIVE_STATUSES.has(run.status)||!Number.isSafeInteger(run.id)||run.id<1)
    return false;
 const at=Date.parse(run.created_at||'');
 if(!Number.isFinite(at)||at<requestedAt-SLACK)return false;
 // PR workflow runs may report a synthetic merge SHA. Do not equate it
 // with source HEAD or infer PR association from the branch name alone.
 return Array.isArray(run.pull_requests)&&run.pull_requests.some(p=>
   p.number===task.pr_number&&p.head?.sha===task.head_sha&&
   p.base?.ref===PROD);
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
     const response=await limited('ci-wake-core-history',()=>github.request(
       'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
         owner,repo,workflow_id:'hh-pr-core-release.yml',
         branch:task.head_ref,event:'pull_request',per_page:30
       }));
     const history=response?.data;
     if(!history||!Number.isSafeInteger(history.total_count)||
        !Array.isArray(history.workflow_runs)||history.workflow_runs.length>30||
        history.workflow_runs.length>history.total_count){
       result.state='CORE_HISTORY_UNVERIFIED';return result;
     }
     zeroHistory=history.total_count===0&&history.workflow_runs.length===0;
     run=history.workflow_runs.find(r=>provenCoreRun(r,task,previous.requestedAt));
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
   } else {
     result.state='CI_CORE_CONFIRMED';result.coreRunId=run.id;
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
         reason_code:state==='CI_WAKE_UNDELIVERED'?'NO_PR_CORE_AFTER_20_MINUTES':'VERIFIED_REAL_PR_CORE',
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
     await limited('ci-wake-manual-hold',()=>github.rest.issues.addLabels({
       owner,repo,issue_number:task.pr_number,labels:['hh:ci-wake-unverified']
     }));
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
module.exports={receiptState,provenCoreRun,reconcileCiWake};
