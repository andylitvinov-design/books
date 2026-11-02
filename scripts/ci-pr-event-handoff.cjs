'use strict';
/**
 * One-allocated-runner, event-triggered handoff. The trusted Watchdog first
 * verifies the exact current PR HEAD and the causal CI jobs; only a confirmed
 * source failure or a proven conflict proceeds to the signed dispatcher.
 * Cron uses the existing independent reconciliation path as a fallback.
 */
const REPO='andylitvinov-design/books';
const DEFAULT='codex/bootstrap-books';
const CORE='HH PR core release gate';
const FAILURES=new Set(['failure','timed_out','startup_failure']);
function confirmedCoreEvent(context){
 const event=context?.payload?.workflow_run;
 return Boolean(context?.repo?.owner+'/'+context?.repo?.repo===REPO &&
   context?.ref==='refs/heads/'+DEFAULT &&
   context?.eventName==='workflow_run' &&
   event?.name===CORE &&
   typeof event?.path==='string' &&
   event.path.split('@')[0]==='.github/workflows/hh-pr-core-release.yml' &&
   event.event==='pull_request' && event.status==='completed' &&
   FAILURES.has(event.conclusion) &&
   event.repository?.full_name===REPO &&
   event.head_repository?.full_name===REPO &&
   Number.isSafeInteger(event.id) && event.id>0 &&
   Number.isSafeInteger(event.run_attempt) && event.run_attempt>0 &&
   typeof event.head_branch==='string' && event.head_branch.length>0 &&
   /^[0-9a-f]{40}$/i.test(event.head_sha||''));
}
async function run({github,core,context,dryRun=false,reconcileRun=null,dispatchRun=null}){
 const result={schema:'HH_CONFIRMED_CORE_EVENT_HANDOFF_V1',
  outcome:'UNVERIFIED_EVENT',prNumber:null,dispatchAccepted:0,
  reason:null};
 if(!confirmedCoreEvent(context))return result;
 const reconcile=reconcileRun||require('./ci-pr-ten-minute-watchdog.cjs').run;
 const dispatch=dispatchRun||require('./ci-pr-queue-dispatcher.cjs').run;
 const evidence=await reconcile({github,core,context,dryRun,
  hasMergeToken:false,eventFastPath:true});
 const number=evidence?.eventPrNumber;
 if(!Number.isSafeInteger(number)||number<1){
  result.outcome='EVENT_PR_ASSOCIATION_UNVERIFIED';return result;
 }
 result.prNumber=number;
 if(evidence?.apiRateLimited||evidence?.inventoryComplete===false){
  result.outcome='API_UNAVAILABLE_CRON_BACKSTOP';return result;
 }
 if(!(evidence?.verifiedSourceFailures>0||evidence?.conflictLabelsQueued>0)){
  result.outcome='NO_CONFIRMED_REPAIRABLE_FAILURE';return result;
 }
 // The dispatcher re-reads live PR, owner leases, history, worker capacity,
 // and exact-head proof before reserving or dispatching anything.
 const handed=await dispatch({github,core,context,dryRun,focusPrNumber:number});
 result.dispatchAccepted=Number(handed?.dispatchAccepted||0);
 result.outcome=result.dispatchAccepted?'DISPATCH_ACCEPTED':
   dryRun?'WOULD_DISPATCH_OR_BLOCKED':'NOT_DISPATCHED_CRON_BACKSTOP';
 result.reason=handed?.reason||null;
 result.blocked=handed?.blocked||{};
 return result;
}
module.exports={confirmedCoreEvent,run};
