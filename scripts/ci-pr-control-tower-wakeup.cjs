'use strict';
/** Trusted event handoff: wake the single-writer dispatcher only for durable queue work. */
const DEFAULT='codex/bootstrap-books';
const DISPATCHER='hh-pr-queue-dispatcher.yml';
const COOLDOWN_MS=120000;
const BUSY=new Set(['queued','in_progress','pending','requested','waiting']);
const safeCount=v=>Number.isSafeInteger(v)&&v>0?v:0;
function needsWake(summary,enabled,hasToken,dryRun){
  if(!enabled||!hasToken||dryRun||!summary)return false;
  return ['sourceRepairQueued','conflictLabelsQueued','ciBootstrapQueued',
    'repairQueueBacklog','ciQueueBacklog'].some(k=>safeCount(summary[k])>0);
}
function readyHistory(history,now){
  if(!Array.isArray(history)||history.length>5)return false;
  return !history.some(r=>{
    if(!r||!Number.isSafeInteger(r.id)||!r.status)return true;
    if(BUSY.has(r.status))return true;
    const created=Date.parse(r.created_at||'');
    return !Number.isFinite(created)||created>now+60000||now-created<COOLDOWN_MS;
  });
}
async function wake({github,owner,repo,summary,enabled,hasToken,dryRun,
  limited,log=()=>{},now=Date.now()}){
  if(!needsWake(summary,enabled,hasToken,dryRun))return 'NOT_ACTIONABLE';
  try{
    const history=(await limited('control-tower-recent',()=>github.request(
      'GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs',{
        owner,repo,workflow_id:DISPATCHER,per_page:5}))).data;
    if(!readyHistory(history?.workflow_runs,now))return 'BUSY_OR_COOLDOWN';
    await limited('control-tower-dispatch',()=>github.request(
      'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',{
        owner,repo,workflow_id:DISPATCHER,ref:DEFAULT,inputs:{dry_run:'false'}}));
    log('DISPATCHED single-writer Control Tower for durable queued PR work');
    return 'DISPATCH_ACCEPTED';
  }catch(error){
    log('Control Tower handoff deferred: '+String(error.message||error).slice(0,180));
    return 'HANDOFF_UNAVAILABLE';
  }
}
// A finished useful worker may be the only event that frees its lane. GitHub
// suppresses some recursive workflow_run callbacks from GITHUB_TOKEN dispatches.
// The dispatcher's existing single-writer lease coalesces concurrent wakeups;
// its delayed scan still enforces fresh capacity, owner leases and task receipts.
async function wakeAfterWorker({github,context,kind,status,dryRun=false,log=()=>{}}){
  const permitted=kind==='repair' ? ['manual_conflict','manual_required','committed'] :
    kind==='ci' ? ['started'] : [];
  if(dryRun||context?.repo?.owner+'/'+context?.repo?.repo!=='andylitvinov-design/books'||
     context.ref!=='refs/heads/'+DEFAULT||!['schedule','workflow_dispatch'].includes(context.eventName)||
     !Number.isSafeInteger(context.runId)||context.runId<1||!permitted.includes(status))return 'NOT_ACTIONABLE';
  try{
    await github.rest.actions.createWorkflowDispatch({owner:context.repo.owner,repo:context.repo.repo,
      workflow_id:DISPATCHER,ref:DEFAULT,inputs:{dry_run:'false',completion_wake:'true',worker_run_id:String(context.runId)}});
    return 'DISPATCH_ACCEPTED';
  }catch(error){log('Worker completion wake deferred: '+String(error.message||error).slice(0,160));return 'HANDOFF_UNAVAILABLE';}
}
// Poll the actual originating run rather than guessing when its runner exits.
// Fail closed after one minute, then leave cron to retry; success requires the
// existing 30-second cooldown after the observed terminal timestamp.
async function waitForWorkerCompletion({github,owner,repo,runId,clock=Date.now,
  sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
  if(owner!=='andylitvinov-design'||repo!=='books'||!/^\d{1,16}$/.test(String(runId))||
     !Number.isSafeInteger(Number(runId))||Number(runId)<1)return false;
  for(let attempt=0;attempt<12;attempt++){
    let run;try{run=(await github.rest.actions.getWorkflowRun({owner,repo,run_id:Number(runId)})).data;}
    catch{return false;}
    if(run?.id!==Number(runId)||run.repository?.full_name!==owner+'/'+repo||run.head_branch!==DEFAULT||
       !['HH PR source Repair Worker','HH zero-cost PR CI worker'].includes(run.name))return false;
    if(run.status==='completed'){
      const elapsed=clock()-Date.parse(run.updated_at||'');
      if(run.conclusion!=='success'||!Number.isFinite(elapsed)||elapsed<0)return false;
      if(elapsed<31000)await sleep(31000-elapsed);
      return true;
    }
    if(!['queued','in_progress','pending','requested','waiting'].includes(run.status))return false;
    await sleep(5000);
  }
  return false;
}
module.exports={needsWake,readyHistory,wake,wakeAfterWorker,waitForWorkerCompletion,DISPATCHER};