'use strict';

const REPO='andylitvinov-design/books';
const CORE_NAME='HH PR core release gate';
const CORE_PATH='.github/workflows/hh-pr-core-release.yml';
const SHA=/^[a-f0-9]{40}$/i;
const LIVE=new Set(['queued','in_progress','waiting','pending','requested','completed']);
// A GITHUB_TOKEN-created pull_request.synchronize may report a workflow
// run with conclusion=action_required and ZERO jobs, needing approval.
// It is NOT a Core runner or a checked source SHA. Fail closed, then let
// the existing signed CI-wake/Watchdog lane recover via owner-authored PR
// metadata rather than counting the appearance of a run as coverage.
const EXECUTED_CONCLUSIONS=new Set(['success','failure','timed_out']);

function isExactHeadCoreRun(run,{prNumber,branch,sha,baseRef='codex/public-book-library',publishedAt=null}={}) {
  if(!run||typeof run!=='object'||!Number.isSafeInteger(prNumber)||prNumber<1||
     typeof branch!=='string'||!branch||!SHA.test(sha||''))return false;
  if(run.name!==CORE_NAME||String(run.path||'').split('@')[0]!==CORE_PATH||
     run.event!=='pull_request'||!LIVE.has(run.status)||
     (run.status==='completed'&&!EXECUTED_CONCLUSIONS.has(run.conclusion))||
     run.repository?.full_name!==REPO||run.head_repository?.full_name!==REPO||
     run.head_branch!==branch||!Number.isSafeInteger(run.id)||run.id<1||
     !Array.isArray(run.pull_requests))return false;
  const created=Date.parse(run.created_at||'');
  if(!Number.isFinite(created))return false;
  if(Number.isFinite(publishedAt)&&created<publishedAt-10_000)return false;
  return run.pull_requests.some(pr=>pr?.number===prNumber&&
    pr.head?.sha===sha&&pr.base?.ref===baseRef);
}

function findExactHeadCoreRun(runs,identity) {
  if(!Array.isArray(runs))return null;
  return runs.find(run=>isExactHeadCoreRun(run,identity))||null;
}

// A run record alone is not a completed check. Require a real primary
// Actions job and its GitHub runner timestamps before calling a child SHA
// Core-executed. A queued job remains pending; action_required has no jobs.
function coreExecutionState(run,jobs){
 if(!run||!Array.isArray(jobs)||jobs.length>100)return 'UNVERIFIED';
 if(run.status==='completed'&&!EXECUTED_CONCLUSIONS.has(run.conclusion))
   return 'UNVERIFIED';
 const primary=jobs.filter(j=>j?.name==='core-lint-types-build');
 if(run.status==='queued'||run.status==='waiting'||run.status==='pending'||
    run.status==='requested')return 'QUEUED';
 if(primary.length!==1)return 'UNVERIFIED';
 const job=primary[0];
 if(job.status==='queued'||job.status==='waiting'||job.status==='pending')
   return 'QUEUED';
 const started=Number.isFinite(Date.parse(job.started_at||''))&&
   typeof job.runner_name==='string'&&job.runner_name.length>0;
 if(!started)return 'UNVERIFIED';
 if(job.status==='in_progress'&&run.status==='in_progress')return 'RUNNING';
 if(job.status==='completed'&&run.status==='completed'&&
    EXECUTED_CONCLUSIONS.has(job.conclusion))return 'CONFIRMED';
 return 'UNVERIFIED';
}

// After a scoped GITHUB_TOKEN source commit, GitHub may emit an
// approval-only pull_request.synchronize workflow (0 jobs). An owner PAT
// can request a REAL pull_request.edited Core wave without touching source,
// reviews, check conclusions, Git refs, merge state or branch protection.
// Exactly one marker per PR×HEAD; this is a request, NEVER a CI success proof.
// GITHUB_TOKEN-authored source may yield action_required with zero jobs.
// After proving an exact-HEAD jobless Core, request ONE owner-PAT Draft → Ready.
// PR-body edited stopped triggering Core after protected production PR #4543.
async function requestOwnerCoreWake({token,prNumber,sha,fetchImpl=global.fetch}={}){
 const status=value=>({status:value,sourceChanged:false,coreRunVerified:false});
 if(!Number.isSafeInteger(prNumber)||prNumber<1||!SHA.test(sha||'')||
    typeof token!=='string'||!token||typeof fetchImpl!=='function')
   return status('OWNER_WAKE_INVALID_ARGUMENTS');
 const owner='andylitvinov-design',endpoint='/repos/'+REPO+'/pulls/'+prNumber;
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};
 const api=async(method,path,body)=>{
   try{
     const response=await fetchImpl('https://api.github.com'+path,{
       method,headers,redirect:'error',signal:AbortSignal.timeout(15000),
       ...(body?{body:JSON.stringify(body)}:{})
     });
     if(!response?.ok)return null;
     return await response.json();
   }catch{return null;}
 };
 if((await api('GET','/user'))?.login!==owner)
   return status('OWNER_PAT_IDENTITY_UNVERIFIED');
 const pr=await api('GET',endpoint);
 const same=(live,draft)=>live?.number===prNumber&&live.state==='open'&&
   live.draft===draft&&live.head?.sha===sha&&
   live.head?.ref===pr?.head?.ref&&live.head.repo?.full_name===REPO&&
   live.base?.ref==='codex/public-book-library'&&live.body===pr?.body;
 if(!pr||!same(pr,false)||pr.user?.login!==owner||
    pr.mergeable===false||pr.mergeable_state==='dirty'||pr.auto_merge!=null||
    typeof pr.body!=='string'||pr.body.length>50000||
    typeof pr.node_id!=='string'||!/^PR_[A-Za-z0-9_-]+$/.test(pr.node_id))
   return status('OWNER_WAKE_PR_HEAD_OR_SCOPE_CHANGED');
 const marker='<!-- HH_OWNER_POST_REPAIR_CORE_READY_V2 pr='+prNumber+' sha='+sha+' -->';
 // An idempotency receipt is a one-shot attempt, NOT a CI green result.
 let complete=false;
 for(let page=1;page<=5;page++){
   const batch=await api('GET','/repos/'+REPO+'/issues/'+prNumber+
     '/comments?per_page=100&page='+page);
   if(!Array.isArray(batch)||batch.length>100)
     return status('OWNER_READY_COMMENT_HISTORY_UNVERIFIED');
   if(batch.some(row=>row?.user?.login===owner&&
       typeof row.body==='string'&&row.body.includes(marker)))
     return status('OWNER_READY_ALREADY_REQUESTED');
   if(batch.length<100){complete=true;break;}
 }
 if(!complete)return status('OWNER_READY_COMMENT_HISTORY_UNVERIFIED');
 // No duplicate wave while a real Core is active, or if a code job already ran.
 // The only recoverable case is a trusted action_required workflow with 0 jobs.
 const runs=await api('GET','/repos/'+REPO+
   '/actions/workflows/hh-pr-core-release.yml/runs?branch='+
   encodeURIComponent(pr.head.ref)+'&event=pull_request&per_page=100');
 if(!Number.isSafeInteger(runs?.total_count)||runs.total_count<1||
    runs.total_count>100||!Array.isArray(runs.workflow_runs)||
    runs.workflow_runs.length!==runs.total_count)
   return status('OWNER_READY_CORE_HISTORY_UNVERIFIED');
 let jobless=null;
 for(const run of runs.workflow_runs){
   if(run?.event!=='pull_request'||!Number.isSafeInteger(run?.id)||
      run.id<1||run.head_branch!==pr.head.ref)
     return status('OWNER_READY_CORE_HISTORY_UNVERIFIED');
   if(['queued','in_progress','waiting','pending','requested'].includes(run.status))
     return status('OWNER_READY_CORE_ALREADY_ACTIVE');
   const exact=run.head_sha===sha||(Array.isArray(run.pull_requests)&&
     run.pull_requests.some(x=>x.number===prNumber&&x.head?.sha===sha&&
       x.base?.ref==='codex/public-book-library'));
   if(!exact)continue;
   if(run.status!=='completed'||run.conclusion!=='action_required')
     return status('OWNER_READY_EXISTING_CORE_NOT_RETRYABLE');
   if(jobless)return status('OWNER_READY_DUPLICATE_JOBLESS_HISTORY');
   jobless=run.id;
 }
 if(!jobless)return status('OWNER_READY_JOBLESS_CORE_NOT_PROVEN');
 const jobs=await api('GET','/repos/'+REPO+'/actions/runs/'+jobless+'/jobs?per_page=2');
 if(!Number.isSafeInteger(jobs?.total_count)||jobs.total_count!==0||
    !Array.isArray(jobs.jobs)||jobs.jobs.length!==0)
   return status('OWNER_READY_ZERO_JOB_PROOF_MISSING');
 const current=await api('GET',endpoint);
 if(!same(current,false)||current.node_id!==pr.node_id)
   return status('OWNER_READY_PR_CHANGED_BEFORE_WAKE');
 // Durable intent comes before mutation: uncertain webhook delivery cannot
 // initiate an uncontrolled retry. The original PR body and HEAD stay intact.
 const receipt=await api('POST','/repos/'+REPO+'/issues/'+prNumber+'/comments',{
   body:marker+'\nOne-shot owner-authored Draft → Ready for exact-HEAD Core. '+
     'Previously observed action_required had zero jobs. Not CI PASS or merge.'
 });
 if(!Number.isSafeInteger(receipt?.id)||receipt.id<1)
   return status('OWNER_READY_INTENT_UNVERIFIED');
 const mutate=async action=>{
   const query='mutation($id:ID!){'+action+
     '(input:{pullRequestId:$id}){pullRequest{id isDraft}}}';
   const response=await api('POST','/graphql',{query,variables:{id:pr.node_id}});
   return !response?.errors?.length&&
     response?.data?.[action]?.pullRequest?.id===pr.node_id&&
     response.data[action].pullRequest.isDraft===(action==='convertPullRequestToDraft');
 };
 if(!await mutate('convertPullRequestToDraft')||
    !same(await api('GET',endpoint),true))
   return status('OWNER_READY_DRAFT_TRANSITION_UNVERIFIED');
 if(!await mutate('markPullRequestReadyForReview')||
    !same(await api('GET',endpoint),false))
   return status('OWNER_READY_RESTORE_REQUIRED');
 return status('OWNER_READY_EVENT_REQUESTED');
}

module.exports={REPO,CORE_NAME,CORE_PATH,isExactHeadCoreRun,findExactHeadCoreRun,coreExecutionState,requestOwnerCoreWake};
