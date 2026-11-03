'use strict';
/**
 * Reconcile metadata-only CI handoffs with a real Core Actions run.
 * A CI_WAKE_REQUESTED receipt proves only a PAT metadata event, not a Core run.
 * No source writes, status fabrication, paid AI calls or unbounded retries.
 */
const {PROD,REPO,SHA,validPR,commentBody,parseRecords,
  trustedControlComment,readCompleteIssueComments,externalOwnerLeaseStatus}=
  require('./ci-pr-task-state.cjs');
const CORE='hh-pr-core-release.yml';
const GRACE_MS=25*60*1000;
const LABEL='hh:ci-wake-unconfirmed';
const ACCEPTED_ENDINGS=new Set(['success','failure','timed_out','startup_failure','action_required']);
function signedWake(task,comments){
 if(!Array.isArray(comments))return null;
 const records=parseRecords(comments.filter(trustedControlComment));
 if(!records)return null;
 const wake=records.filter(x=>x.task_key===task.task_key &&
   x.head_sha===task.head_sha && x.lane==='ci' &&
   x.pr_number===task.pr_number && x.state==='CI_WAKE_REQUESTED' &&
   x.source_published===false && Number.isFinite(Date.parse(x.created_at||'')));
 return wake.length?wake.at(-1):null;
}
function runAssociation(run,task){
 if(run?.event!=='pull_request')return 'OTHER';
 if(run.head_branch!==task.head_ref){
  return Array.isArray(run.pull_requests)&&run.pull_requests.some(p=>p.number===task.pr_number)
   ?'UNKNOWN':'OTHER';
 }
 if(!SHA.test(run.head_sha||''))return 'UNKNOWN';
 const links=run.pull_requests;
 if(links!==undefined&&links!==null&&!Array.isArray(links))return 'UNKNOWN';
 if(Array.isArray(links)&&links.length&&
   !links.some(pr=>pr.number===task.pr_number))return 'OTHER';
 const related=Array.isArray(links)?
   links.find(pr=>pr.number===task.pr_number):null;
 if(related?.head?.sha && related.head.sha!==task.head_sha)
   return 'OTHER_HEAD';
 // Synthetic pull_request merge commits must prove their second parent is
 // this exact HEAD. A PR link alone may be recomputed after the run began.
 if(run.head_sha===task.head_sha)return 'EXACT';
 return 'MERGE_PARENT_REQUIRED';
}
async function inspectCore({github,limited,owner,repo,task,wake,now}){
 const when=Date.parse(wake.created_at);
 if(!Number.isFinite(when)||when>now+60000)
   return {state:'UNKNOWN',reason:'INVALID_WAKE_TIMESTAMP'};
 const created='>='+new Date(when-60000).toISOString();
 let history;
 try{
  history=(await limited('ci-wake-core-runs',()=>github.request(
   'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',
   {owner,repo,workflow_id:CORE,branch:task.head_ref,event:'pull_request',
    created,per_page:100}))).data;
 }catch{return {state:'UNKNOWN',reason:'CORE_HISTORY_UNAVAILABLE'};}
 if(!Number.isSafeInteger(history?.total_count)||
    !Array.isArray(history.workflow_runs)||
    history.total_count>100||history.workflow_runs.length!==history.total_count)
   return {state:'UNKNOWN',reason:'CORE_HISTORY_INCOMPLETE'};
 let uncertain=false, inspectedParents=0;
 for(const run of history.workflow_runs){
  const createdAt=Date.parse(run.created_at||'');
  if(!Number.isFinite(createdAt)||createdAt<when-60000||createdAt>now+60000){
   uncertain=true;continue;
  }
  let identity=runAssociation(run,task);
  if(identity==='OTHER'||identity==='OTHER_HEAD')continue;
  if(identity==='MERGE_PARENT_REQUIRED'){
   if(++inspectedParents>3){uncertain=true;continue;}
   try{
    const commit=(await limited('ci-wake-merge-parent',()=>github.request(
     'GET /repos/{owner}/{repo}/git/commits/{commit_sha}',
     {owner,repo,commit_sha:run.head_sha}))).data;
    if(!Array.isArray(commit?.parents)||commit.parents.length!==2){
     uncertain=true;continue;
    }
    identity=commit.parents[1]?.sha===task.head_sha?'EXACT':'OTHER_HEAD';
   }catch{uncertain=true;continue;}
  }
  if(identity==='UNKNOWN'){uncertain=true;continue;}
  if(identity!=='EXACT')continue;
  if(!Number.isSafeInteger(run.id)||run.id<1){
   uncertain=true;continue;
  }
  if(run.status==='in_progress')
   return {state:'RUNNING',reason:'CORE_RUNNING',runId:run.id};
  if(run.status==='completed'&&ACCEPTED_ENDINGS.has(run.conclusion))
   return {state:'CONFIRMED',reason:'CORE_EXECUTED',runId:run.id,
    conclusion:run.conclusion};
  if(['queued','waiting','pending','requested'].includes(run.status))
   return {state:'QUEUED',reason:'CORE_RUN_QUEUED',runId:run.id};
  if(run.status==='completed'&&['cancelled','skipped'].includes(run.conclusion))
   return {state:now-when>=GRACE_MS?'STALLED':'WAITING',
    reason:'CORE_RUN_CANCELLED_OR_SKIPPED',runId:run.id};
  uncertain=true;
 }
 if(uncertain)return {state:'UNKNOWN',reason:'CORE_ASSOCIATION_UNVERIFIED'};
 if(now-when<GRACE_MS)
  return {state:'WAITING',reason:'CORE_REGISTRATION_GRACE'};
 return {state:'STALLED',reason:'NO_CORE_RUN_AFTER_WAKE'};
}
async function reconcile({github,limited,owner,repo,task,pr,comments,now,dryRun=false}){
 const wake=signedWake(task,comments);
 if(!wake)return {state:'UNKNOWN',reason:'CI_WAKE_RECEIPT_UNTRUSTED'};
 const result=await inspectCore({github,limited,owner,repo,task,wake,now});
 if(!['CONFIRMED','RUNNING','STALLED'].includes(result.state)||dryRun)
  return result;
 // A new PR HEAD or another owner's lease invalidates every planned write.
 let live;
 try{live=(await limited('ci-wake-exact-head',()=>github.rest.pulls.get({
  owner,repo,pull_number:task.pr_number}))).data;
 }catch{return {state:'UNKNOWN',reason:'LIVE_PR_UNAVAILABLE'};}
 if(!validPR(live)||live.head?.sha!==task.head_sha||
    live.head?.ref!==task.head_ref||live.base?.ref!==PROD||
    !live.labels?.some(l=>l.name==='hh:ci-needed'))
  return {state:'UNKNOWN',reason:'CI_WAKE_PR_MOVED'};
 let complete;
 try{
  complete=await readCompleteIssueComments(github,owner,repo,task.pr_number,limited);
 }catch{return {state:'UNKNOWN',reason:'CI_WAKE_OWNER_HISTORY_UNAVAILABLE'};}
 if(!complete||!signedWake(task,complete)||
   externalOwnerLeaseStatus(complete,task.head_sha,now)!=='FREE')
  return {state:'UNKNOWN',reason:'CI_WAKE_OWNER_UNVERIFIED'};
 const records=parseRecords(complete);
 if(!records)return {state:'UNKNOWN',reason:'CI_WAKE_HISTORY_MALFORMED'};
 if(records.some(x=>x.task_key===task.task_key&&x.head_sha===task.head_sha&&
     ['CI_CORE_CONFIRMED','CI_WAKE_UNCONFIRMED'].includes(x.state)))
  return {state:'UNKNOWN',reason:'CI_WAKE_ALREADY_RECONCILED'};
 if(result.state==='RUNNING')return result;
 if(result.state==='STALLED'){
  // Fail closed: no source commit, no second draft/ready mutation, no fake CI.
  // A distinct visible manual CI-wake label replaces the self-looping queue hint.
  try{
   await limited('ci-wake-label',async()=>{
    try{return await github.rest.issues.addLabels({owner,repo,
      issue_number:task.pr_number,labels:[LABEL]});}
    catch(e){
     if(e?.status!==422)throw e;
     try{await github.rest.issues.createLabel({owner,repo,name:LABEL,
       color:'fbca04',description:'Core run unconfirmed after accepted metadata wake'});
     }catch(createError){if(createError?.status!==422)throw createError;}
     return github.rest.issues.addLabels({owner,repo,
       issue_number:task.pr_number,labels:[LABEL]});
    }
   });
  }catch{return {state:'UNKNOWN',reason:'CI_WAKE_LABEL_UNAVAILABLE'};}
 }
 const state=result.state==='CONFIRMED'?'CI_CORE_CONFIRMED':'CI_WAKE_UNCONFIRMED';
 try{
  await limited('ci-wake-signed-result',()=>github.rest.issues.createComment({
   owner,repo,issue_number:task.pr_number,body:commentBody({
    ...task,state,source_published:false,
    reason_code:result.reason,core_run_id:result.runId||null,
    core_conclusion:result.conclusion||null,owner_run_id:'watchdog',
    created_at:new Date(now).toISOString()
   })}));
 }catch{return {state:'UNKNOWN',reason:'CI_WAKE_RESULT_RECEIPT_FAILED'};}
 // The next event scan can still observe true Core failure and route source repair.
 try{
  const current=(await limited('ci-wake-final-head',()=>github.rest.pulls.get({
   owner,repo,pull_number:task.pr_number}))).data;
  if(current?.head?.sha!==task.head_sha||current?.base?.ref!==PROD)
   return {state:result.state,reason:'CI_WAKE_RECEIPT_WRITTEN_HEAD_MOVED'};
  await limited('ci-wake-retire-label',()=>github.rest.issues.removeLabel({
   owner,repo,issue_number:task.pr_number,name:'hh:ci-needed'}));
 }catch{return {state:result.state,reason:'CI_WAKE_RECEIPT_WRITTEN_LABEL_PENDING'};}
 return result;
}
module.exports={CORE,GRACE_MS,LABEL,signedWake,runAssociation,inspectCore,reconcile};
