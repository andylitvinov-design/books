'use strict';
// Reclaim only GitHub workflow shells that are over 14 days old,
// refer to an already-merged production PR and have ZERO unfinished jobs.
// The normal Core, Specialist, Native AutoMerge and owner leases remain intact.
// Never delete an active/current PR run, protected production push, or
// scheduled/owner workflow: the previous source event is not a live check.
const {trustedContext}=require('./ci-pr-merged-queue-cleanup.cjs');
const FULL='andylitvinov-design/books',OWNER='andylitvinov-design',
 REPO='books',PROD='codex/public-book-library',CONTROL='codex/bootstrap-books';
const SHA=/^[0-9a-f]{40}$/i;
const DELETE_AFTER=14*24*60*60*1000+60*60*1000;
const FINISH_GRACE=60*60*1000,MAX_DELETE=2,MAX_INSPECT=5;
const RECLAIMABLE=new Map([
 ['HH PR core release gate',{event:'pull_request',path:'.github/workflows/hh-pr-core-release.yml'}],
 ['HH PR 10-minute watchdog',{event:'pull_request_target',path:'.github/workflows/hh-pr-ten-minute-watchdog.yml'}]
]);
const parse=s=>{const t=Date.parse(s||'');return Number.isFinite(t)?t:null;};
function expiredTerminalShell(run,now){
 const p=RECLAIMABLE.get(run?.name);
 const created=parse(run?.created_at),updated=parse(run?.updated_at);
 return Boolean(Number.isFinite(now)&&p&&run&&
  Number.isSafeInteger(run.id)&&run.id>0&&run.status==='in_progress'&&
  run.conclusion===null&&run.run_attempt===1&&
  run.event===p.event&&String(run.path||'').split('@')[0]===p.path&&
  run.repository?.full_name===FULL&&run.head_repository?.full_name===FULL&&
  typeof run.head_branch==='string'&&run.head_branch.length>0&&
  run.head_branch!==PROD&&run.head_branch!==CONTROL&&
  SHA.test(run.head_sha||'')&&
  Array.isArray(run.pull_requests)&&run.pull_requests.length<=1&&
  created!==null&&updated!==null&&updated>=created&&
  created<=now-DELETE_AFTER&&updated<=now-FINISH_GRACE);
}
function linkedMergedPR(run,pr,now){
 if(!expiredTerminalShell(run,now)||!pr||pr.state!=='closed'||
    pr.merged!==true||pr.draft===true||
    pr.base?.ref!==PROD||pr.base?.repo?.full_name!==FULL||
    pr.head?.repo?.full_name!==FULL||
    pr.head?.ref!==run.head_branch||!SHA.test(pr.head.sha||'')||
    !Number.isSafeInteger(pr.number)||pr.number<1)return false;
 if(run.pull_requests.length===1){
  const link=run.pull_requests[0];
  if(link?.number!==pr.number||link.base?.ref!==PROD||
    (link.head?.ref&&link.head.ref!==run.head_branch))return false;
 }
 const at=parse(run.created_at),started=parse(pr.created_at),merged=parse(pr.merged_at);
 return at!==null&&started!==null&&merged!==null&&
  started<=at&&at<=merged&&merged<=now-FINISH_GRACE;
}
function jobsFullyTerminated(page,now){
 if(!Number.isFinite(now)||!Number.isSafeInteger(page?.total_count)||
    page.total_count<1||page.total_count>100||!Array.isArray(page.jobs)||
    page.jobs.length!==page.total_count)return false;
 const ids=new Set();
 return page.jobs.every(job=>{
  if(!Number.isSafeInteger(job?.id)||job.id<1||ids.has(job.id)||
    job.status!=='completed'||typeof job.conclusion!=='string'||
    !['success','failure','skipped','cancelled','neutral','timed_out','action_required','stale'].includes(job.conclusion)||
    parse(job.completed_at)===null||parse(job.completed_at)>now-FINISH_GRACE)return false;
  ids.add(job.id);return true;
 });
}
function sameShell(a,b,now){
 return expiredTerminalShell(a,now)&&expiredTerminalShell(b,now)&&
  a.id===b.id&&a.name===b.name&&a.path===b.path&&
  a.event===b.event&&a.status===b.status&&
  a.head_sha===b.head_sha&&a.head_branch===b.head_branch&&
  a.created_at===b.created_at&&a.updated_at===b.updated_at&&
  a.run_attempt===b.run_attempt;
}
async function run({github,context,now=Date.now(),observedQueued,observedRemaining,
 core={info(){}},maxDelete=MAX_DELETE}={}){
 const result={schema:'HH_TERMINAL_GHOST_PR_PRUNE_V1',status:'HOLD',
   scanned:0,eligible:0,attempts:0,deleted:[],unverified:[],
   denied:[],skipped:0,errors:[]};
 const report=()=>{core.info('HH_TERMINAL_GHOST_PR_PRUNE '+JSON.stringify(result));return result;};
 if(!trustedContext(context)||!Number.isSafeInteger(observedQueued)||
    observedQueued<=40||!Number.isSafeInteger(observedRemaining)||
    observedRemaining<350||!Number.isFinite(now))
  {result.status='NO_TRUSTED_PRESSURE_OR_BUDGET';return report();}
 const a=github?.rest?.actions,pulls=github?.rest?.pulls;
 if(!a?.listWorkflowRunsForRepo||!a.getWorkflowRun||
    !a.listJobsForWorkflowRun||!pulls?.list||!pulls.get||
    !(a.deleteWorkflowRun||github?.request))
  {result.status='REQUIRED_API_UNAVAILABLE';return report();}
 let page;
 try{page=(await a.listWorkflowRunsForRepo({owner:OWNER,repo:REPO,
   status:'in_progress',per_page:100,page:1}))?.data;}
 catch(e){result.status='ACTIVE_INVENTORY_UNAVAILABLE';return report();}
 if(!Number.isSafeInteger(page?.total_count)||page.total_count>100||
    !Array.isArray(page.workflow_runs)||page.workflow_runs.length!==page.total_count)
  {result.status='ACTIVE_INVENTORY_UNVERIFIED';return report();}
 result.scanned=page.total_count;
 // Oldest first. Even if a live run is appended concurrently, it cannot
 // pass the mandatory exact-run/readback and all-terminal-job precondition.
 const candidates=page.workflow_runs.filter(x=>expiredTerminalShell(x,now))
  .sort((x,y)=>parse(x.created_at)-parse(y.created_at)).slice(0,MAX_INSPECT);
 for(const candidate of candidates){
  if(result.attempts>=Math.min(MAX_DELETE,Math.max(1,Math.floor(maxDelete))))break;
  try{
   const found=(await pulls.list({owner:OWNER,repo:REPO,
     state:'all',head:OWNER+':'+candidate.head_branch,per_page:2,page:1}))?.data;
   if(!Array.isArray(found)||found.length!==1){result.skipped++;continue;}
   const assoc=found[0];
   // A list response is only a hint: pull.get must explicitly prove merged.
   if(assoc.number<1||assoc.head?.ref!==candidate.head_branch||
      assoc.base?.ref!==PROD){result.skipped++;continue;}
   const [rr,jj,pp]=await Promise.all([
    a.getWorkflowRun({owner:OWNER,repo:REPO,run_id:candidate.id}),
    a.listJobsForWorkflowRun({owner:OWNER,repo:REPO,
      run_id:candidate.id,per_page:100}),
    pulls.get({owner:OWNER,repo:REPO,pull_number:assoc.number})
   ]);
   const fresh=rr?.data,jobs=jj?.data,pr=pp?.data;
   if(!sameShell(candidate,fresh,now)||!linkedMergedPR(fresh,pr,now)||
      pr.number!==assoc.number||!jobsFullyTerminated(jobs,now)){
    result.skipped++;continue;
   }
   result.eligible++;
   // The API allows deletion of a run older than two weeks; successful
   // HTTP 204 is still NOT terminal proof until the exact run returns 404.
   result.attempts++;
   let response;
   try{
    response=a.deleteWorkflowRun?
     await a.deleteWorkflowRun({owner:OWNER,repo:REPO,run_id:fresh.id}):
     await github.request('DELETE /repos/{owner}/{repo}/actions/runs/{run_id}',
      {owner:OWNER,repo:REPO,run_id:fresh.id});
    if(response?.status!==204)
     throw Object.assign(Error('DELETE_NOT_CONFIRMED'),{status:response?.status||0});
   }catch(err){
    const code=Number(err?.status||0);
    result.denied.push({run_id:fresh.id,status:code});
    if([403,404,409,422,429].includes(code))break;
    continue;
   }
   try{
    await a.getWorkflowRun({owner:OWNER,repo:REPO,run_id:fresh.id});
    result.unverified.push({run_id:fresh.id,pr:pr.number});
   }catch(check){
    if(check?.status===404)result.deleted.push({run_id:fresh.id,pr:pr.number});
    else result.unverified.push({run_id:fresh.id,pr:pr.number});
   }
  }catch(err){result.errors.push('PROOF_UNAVAILABLE:'+String(err?.status||'unknown'));break;}
 }
 result.status=result.deleted.length?'DELETED_READBACK_404':
  result.unverified.length?'DELETE_UNVERIFIED':
  result.denied.length?'GITHUB_DELETE_DENIED':
  result.errors.length?'PROOF_UNAVAILABLE':'NO_VERIFIED_TERMINAL_GHOST';
 return report();
}
module.exports={run,expiredTerminalShell,linkedMergedPR,jobsFullyTerminated,sameShell,
 DELETE_AFTER,MAX_DELETE};
