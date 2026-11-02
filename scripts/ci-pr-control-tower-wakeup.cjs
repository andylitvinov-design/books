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
    // PR contract and push audit run in separate jobs. They cannot own the
    // single-writer dispatch lease or suppress a needed task handoff.
    if(['pull_request','push'].includes(r.event))return false;
    if(BUSY.has(r.status))return true;
    if(r.status!=='completed')return true;
    // Cooldown starts after the real dispatcher exits, not when it was queued.
    const completed=Date.parse(r.updated_at||r.created_at||'');
    return !Number.isFinite(completed)||completed>now+60000||now-completed<COOLDOWN_MS;
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
    kind==='ci' ? ['started','requested'] : [];
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
async function relayCompletionWake({github,context,wait=waitForWorkerCompletion,log=()=>{}}){
  const inputs=context?.payload?.inputs||{},runId=String(inputs.worker_run_id||'');
  if(context?.repo?.owner+'/'+context?.repo?.repo!=='andylitvinov-design/books'||
     context.ref!=='refs/heads/'+DEFAULT||context.eventName!=='workflow_dispatch'||
     String(inputs.completion_wake)!=='true'||String(inputs.dry_run)!=='false'||
     !/^\d{1,16}$/.test(runId)||!Number.isSafeInteger(Number(runId))||Number(runId)<1)return 'NOT_ACTIONABLE';
  try{
    if(!await wait({github,owner:context.repo.owner,repo:context.repo.repo,runId}))return 'WORKER_UNVERIFIED';
    await github.rest.actions.createWorkflowDispatch({owner:context.repo.owner,repo:context.repo.repo,
      workflow_id:DISPATCHER,ref:DEFAULT,inputs:{dry_run:'false'}});
    return 'DISPATCH_ACCEPTED';
  }catch(error){log('Worker completion relay deferred: '+String(error.message||error).slice(0,160));return 'HANDOFF_UNAVAILABLE';}
}

// When GitHub silently delays its scheduled Watchdog, a *real* Control Tower
// cycle can wake the same trusted workflow. Do not confuse workflow_run
// wrappers with reconciliation, and do not create a second pending tick.
const WATCHDOG='hh-pr-ten-minute-watchdog.yml';
const WATCHDOG_CRON_GRACE_MS=35*60_000;
const WATCHDOG_MANUAL_COOLDOWN_MS=11*60_000;
function watchdogCronDecision(schedule,manual,now){
  if(!Number.isFinite(now)||!Array.isArray(schedule)||!Array.isArray(manual)||
     schedule.length>5||manual.length>5)return 'WATCHDOG_HISTORY_UNVERIFIED';
  const active=new Set(['queued','in_progress','pending','requested','waiting']);
  const valid=run=>run&&Number.isSafeInteger(run.id)&&
    ['completed',...active].includes(run.status)&&
    Number.isFinite(Date.parse(run.created_at||''));
  if([...schedule,...manual].some(run=>!valid(run)))return 'WATCHDOG_HISTORY_UNVERIFIED';
  if([...schedule,...manual].some(run=>active.has(run.status)))
    return 'WATCHDOG_ALREADY_RUNNING';
  const lastCron=schedule.length?Math.max(...schedule.map(r=>Date.parse(r.created_at))):null;
  if(lastCron!==null&&(lastCron>now+60_000||now-lastCron<WATCHDOG_CRON_GRACE_MS))
    return lastCron>now+60_000?'WATCHDOG_CLOCK_UNVERIFIED':'WATCHDOG_CRON_HEALTHY';
  const recent=manual.some(run=>{
    const created=Date.parse(run.created_at);
    return created>now+60_000||
      now-created<WATCHDOG_MANUAL_COOLDOWN_MS;
  });
  if(recent)return 'WATCHDOG_MANUAL_RECENT';
  return 'WAKE_STALE_WATCHDOG';
}
async function wakeStaleWatchdog({github,context,summary,dryRun=false,
  now=Date.now(),log=()=>{}}){
  const info={decision:'NOT_ELIGIBLE',dispatchAccepted:false,cronAgeMinutes:null};
  const report=()=>{log('HH_WATCHDOG_CRON_BACKSTOP '+JSON.stringify(info));return info;};
  if(dryRun||context?.repo?.owner+'/'+context?.repo?.repo!=='andylitvinov-design/books'||
     context.ref!=='refs/heads/'+DEFAULT||
     !['schedule','workflow_run','workflow_dispatch'].includes(context.eventName)||
     !Number.isSafeInteger(summary?.production)||summary.production<1)return report();
  const {owner,repo}=context.repo;
  try{
    const read=async event=>{
      const response=await github.rest.actions.listWorkflowRuns({
        owner,repo,workflow_id:WATCHDOG,event,per_page:5});
      const data=response?.data;
      if(!Number.isSafeInteger(data?.total_count)||data.total_count<0||
         !Array.isArray(data.workflow_runs)||data.workflow_runs.length>5||
         data.total_count<data.workflow_runs.length)
        throw Error('INCOMPLETE_WATCHDOG_EVENT_HISTORY');
      return data.workflow_runs;
    };
    const [schedule,manual]=await Promise.all([read('schedule'),read('workflow_dispatch')]);
    const last=schedule.length?Math.max(...schedule.map(x=>Date.parse(x.created_at||''))):null;
    if(last!==null&&Number.isFinite(last)&&last<=now)
      info.cronAgeMinutes=Math.floor((now-last)/60_000);
    info.decision=watchdogCronDecision(schedule,manual,now);
    if(info.decision!=='WAKE_STALE_WATCHDOG')return report();
    // The controller's single-writer job serializes all wake decisions.
    // GITHUB_TOKEN workflow_dispatch is an allowed Actions recursion exception.
    await github.rest.actions.createWorkflowDispatch({owner,repo,workflow_id:WATCHDOG,
      ref:DEFAULT,inputs:{dry_run:'false'}});
    info.dispatchAccepted=true;info.decision='EVENT_WATCHDOG_WAKE_ACCEPTED';
  }catch(error){
    info.decision='WATCHDOG_WAKE_UNAVAILABLE';
    info.error=String(error.message||error).slice(0,150);
  }
  return report();
}

module.exports={needsWake,readyHistory,wake,wakeAfterWorker,waitForWorkerCompletion,relayCompletionWake,DISPATCHER,watchdogCronDecision,wakeStaleWatchdog};