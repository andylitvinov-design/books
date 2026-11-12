'use strict';
// HH_STALE_MERGED_QUEUE_CLEANUP_V1
// Called only inside the EXISTING scheduled Watchdog runner when the recorded
// Actions queue is over 100. Never starts CI, edits source, or merges a PR.
// Restrict cancellation to first-attempt QUEUED pull_request runs whose
// original source SHA is proven ancestral to the final SHA of one unique,
// already MERGED production PR. Open/held/unmerged/manual reruns stay untouched.
const OWNER='andylitvinov-design', REPO='books';
const FULL=OWNER+'/'+REPO, PROD='codex/public-book-library';
const CONTROL='codex/bootstrap-books', SHA=/^[a-f0-9]{40}$/i;
const GRACE=30*60*1000, THRESHOLD=100;
const MAX_CANCELS=12,MAX_BRANCHES=12,MAX_COMPARES=14;
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
 return context?.repo?.owner===OWNER&&context.repo.repo===REPO&&
  context.ref==='refs/heads/'+CONTROL&&context.eventName==='schedule';
}
async function runCleanup({github,context,core={info(){},warning(){}},
 observedQueued,observedRemaining,now=Date.now(),maxCancels=MAX_CANCELS}={}){
 const out={schema:'HH_STALE_MERGED_QUEUE_CLEANUP_V1',status:'HOLD',
  scanned:0,checked_branches:0,proved_shas:0,eligible:0,
  cancel_accepted:[],skipped:0,partial:true,errors:[]};
 if(!trustedContext(context))return {...out,status:'UNTRUSTED_CONTEXT'};
 if(!Number.isSafeInteger(observedQueued)||observedQueued<=THRESHOLD||
    !Number.isSafeInteger(observedRemaining)||observedRemaining<250)
  return {...out,status:'NO_CONFIRMED_BUDGET_OR_PRESSURE'};
 if(!github?.rest?.actions?.listWorkflowRunsForRepo||
    !github.rest.actions.getWorkflowRun||!github.rest.actions.cancelWorkflowRun||
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
 for(const item of response.workflow_runs){
  if(out.cancel_accepted.length>=limit)break;
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
  try{
   await github.rest.actions.cancelWorkflowRun({owner:OWNER,repo:REPO,run_id:item.id});
   out.cancel_accepted.push({run_id:item.id,pr:pr.number,
    old_head:item.head_sha.slice(0,12)});
  }catch(error){
   out.errors.push('CANCEL_DENIED:'+String(error?.status||'unknown'));
   out.partial=true;
   if([403,429].includes(Number(error?.status)))break;
  }
 }
 out.status=out.errors.length?'PARTIAL_ERRORS':
  out.cancel_accepted.length?'CANCELLATION_ACCEPTED_NOT_TERMINAL':'NO_PROVEN_STALE_RUN';
 out.partial=out.partial||response.total_count>response.workflow_runs.length||
  out.cancel_accepted.length>=limit;
 core.info('HH_STALE_MERGED_QUEUE_CLEANUP '+JSON.stringify(out));
 return out;
}
module.exports={queuedPRRun,mergedProduction,uniqueRunOwner,validComparison,
 trustedContext,runCleanup,MAX_CANCELS};
