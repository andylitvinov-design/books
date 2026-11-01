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
module.exports={needsWake,readyHistory,wake,DISPATCHER};