'use strict';
/**
 * Exact-PR GitHub pull_request_target -> Conflict Repair handoff.
 * Run only trusted default-branch code; never checkout or execute PR head.
 * This is a one-PR event adapter for the EXISTING signed dispatcher lease,
 * not a second queue, full PR scan, source writer or CI rerun.
 */
const REPO='andylitvinov-design/books';
const PROD='codex/public-book-library';
const SHA=/^[0-9a-f]{40}$/i;
const ACTIONS=new Set(['opened','reopened','synchronize','ready_for_review']);
// Manual semantic repair is NOT a permission to write source; however it
// must not hide an already-proven DIRTY PR from read-only conflict triage.
const HARD_HOLDS=new Map([
 ['hh:hold','EXPLICIT_OWNER_HOLD'],
 ['hh:blocked','POLICY_BLOCKED'],
 ['hh:worker-claimed','SOURCE_OWNER_ALREADY_CLAIMED'],
 ['hh:direction-override:invalid','INVALID_DIRECTION_OVERRIDE']
]);
const CONFLICT='hh:conflict-repair-needed';
function trustedConflictEvent(context){
 const pr=context?.payload?.pull_request;
 return Boolean(context?.repo?.owner+'/'+context?.repo?.repo===REPO &&
  context.eventName==='pull_request_target' &&
  context.ref==='refs/heads/codex/bootstrap-books' &&
  ACTIONS.has(context.payload?.action) &&
  Number.isSafeInteger(pr?.number)&&pr.number>0 &&
  pr.state==='open'&&!pr.draft&&pr.base?.ref===PROD &&
  pr.head?.repo?.full_name===REPO&&SHA.test(pr.head?.sha||''));
}
// Exact-HEAD Ready timing piggybacks on the existing trusted PR-event runner.
// This never dispatches CI, changes a source branch, authorizes merge or deploys.
async function publishReadyStage({github,context}={}) {
 const skipped=reason=>({status:'SKIPPED',reason});
 if(!trustedConflictEvent(context)||
    !['opened','ready_for_review'].includes(context.payload.action)||
    !Number.isSafeInteger(context.runId)||context.runId<1)
   return skipped('NOT_VERIFIED_READY_EVENT');
 if(typeof github?.rest?.pulls?.get!=='function'||
    typeof github?.rest?.issues?.createComment!=='function')
   return skipped('GITHUB_API_UNAVAILABLE');
 const {owner,repo}=context.repo,eventPr=context.payload.pull_request;
 const live=(await github.rest.pulls.get({owner,repo,pull_number:eventPr.number})).data;
 if(!live||live.number!==eventPr.number||live.state!=='open'||live.draft||
    live.user?.login!==owner||live.base?.ref!==PROD||
    live.head?.repo?.full_name!==REPO||
    live.head?.sha!==eventPr.head.sha||live.head?.ref!==eventPr.head.ref)
   return skipped('SOURCE_HEAD_OR_OWNER_CHANGED');
 const opened=context.payload.action==='opened';
 const {stageLine}=require('./ci-pr-stage-receipts.cjs');
 const line=stageLine({stage:'ready',pr_number:eventPr.number,
   head_sha:live.head.sha,run_id:context.runId,
   at:opened?eventPr.created_at:new Date().toISOString(),
   source:opened?'pr_opened_ready':'ready_event_observed'});
 const posted=await github.rest.issues.createComment({
   owner,repo,issue_number:eventPr.number,
   body:line+'\nReady event observed on verified PR HEAD; not CI-green or merge proof.'
 });
 if(!Number.isSafeInteger(posted?.data?.id))
   return {status:'WRITE_UNVERIFIED',prNumber:eventPr.number};
 return {status:'RECORDED',prNumber:eventPr.number,headSha:live.head.sha};
}

function currentDirty(pr,eventPr){
 return Boolean(pr&&pr.number===eventPr.number&&pr.state==='open'&&!pr.draft&&
  pr.base?.ref===PROD&&pr.head?.repo?.full_name===REPO&&
  pr.user?.login===REPO.split('/')[0]&&pr.head?.sha===eventPr.head.sha&&
  pr.head?.ref===eventPr.head.ref&&
  pr.mergeable===false&&pr.mergeable_state==='dirty');
}
async function run({github,core,context,dryRun=false,dispatchRun=null,readPr=null,queueOnly=false}={}){
 const result={schema:'HH_CONFLICT_EVENT_HANDOFF_V1',outcome:'UNVERIFIED_EVENT',
  prNumber:null,headSha:null,labelAdded:false,dispatchAccepted:0,
  manualConflictHandoffs:0,reason:null,blockingLabel:null,
  nextAction:null,sourceCommitVerified:false,mergeAuthorized:false};
 if(!trustedConflictEvent(context))return result;
 const eventPr=context.payload.pull_request;
 const {owner,repo}=context.repo;
 result.prNumber=eventPr.number;result.headSha=eventPr.head.sha;
 const read=readPr||(()=>github.rest.pulls.get({owner,repo,pull_number:eventPr.number}));
 let response;
 try{response=await read();}catch(error){
  result.outcome='PR_READ_UNAVAILABLE';result.reason=String(error.message||error).slice(0,180);
  return result;
 }
 let pr=response?.data;
 if(!currentDirty(pr,eventPr)){
  result.outcome=pr?.head?.sha!==eventPr.head.sha?'STALE_EVENT':
   pr?.mergeable===null?'MERGEABILITY_UNKNOWN_BACKSTOP':'NO_VERIFIED_DIRTY_CONFLICT';
  return result;
 }
 const labels=new Set((pr.labels||[]).map(x=>x.name));
 const hardHold=[...HARD_HOLDS].find(([name])=>labels.has(name));
 if(hardHold){
  result.outcome='BLOCKED_EXISTING_OWNER_OR_POLICY';
  result.blockingLabel=hardHold[0];result.reason=hardHold[1];
  result.nextAction='REVIEW_EXPLICIT_HOLD_OR_SOURCE_OWNER';
  return result;
 }
 // A terminal semantic handoff deliberately removes the conflict queue hint.
 // Do not re-label it on every synchronize/Ready event: that produces an
 // endless "conflict detected -> manual handoff" loop with no source patch.
 if(labels.has('hh:repair-manual')&&!labels.has(CONFLICT)){
  result.outcome='MANUAL_CONFLICT_AWAITING_SOURCE_PATCH';
  result.reason='NO_VERIFIED_SEMANTIC_SOURCE_COMMIT';
  result.nextAction='SEMANTIC_OWNER_REPAIR_AND_EXACT_HEAD_CI';
  return result;
 }
 if(!labels.has(CONFLICT)){
  if(dryRun){result.outcome='WOULD_ROUTE_CONFLICT';return result;}
  try{
   await github.rest.issues.addLabels({owner,repo,issue_number:eventPr.number,labels:[CONFLICT]});
  }catch(error){
   result.outcome='CONFLICT_LABEL_WRITE_UNAVAILABLE';
   result.reason=String(error.message||error).slice(0,180);
   return result;
  }
  result.labelAdded=true;
  // Never dispatch based solely on label-write HTTP acceptance.
  // Re-read the exact HEAD and current label before obtaining a worker lease.
  try{response=await read();}catch(error){
   result.outcome='LABEL_READBACK_UNAVAILABLE';return result;
  }
  pr=response?.data;
  if(!currentDirty(pr,eventPr)||
     !(pr.labels||[]).some(label=>label.name===CONFLICT)){
   result.outcome='CONFLICT_LABEL_READBACK_UNVERIFIED';return result;
  }
 }
 // The unprivileged PR-local event job may only produce a verified hint.
 // An actual manual handoff still belongs exclusively to the already
 // serialized Watchdog/Control Tower, with full leases, budgets and receipts.
 // This keeps a stuck/conflicted PR out of unrelated PRs' writer slots.
 // The hint was either verified already or verified by an exact-HEAD re-read
 // after the only label write above.
 if(queueOnly){
  result.outcome='CONFLICT_QUEUE_HINT_VERIFIED';
  result.reason='SERIALIZED_WATCHDOG_HANDOFF_PENDING';
  result.nextAction='EXISTING_WATCHDOG_CONFLICT_TRIAGE';
  return result;
 }
 const dispatch=dispatchRun||require('./ci-pr-queue-dispatcher.cjs').run;
 try{
  const routed=await dispatch({github,core,context,dryRun,
   focusPrNumber:eventPr.number,focusPrSnapshot:pr});
  result.dispatchAccepted=Number(routed?.dispatchAccepted||0);
  result.manualConflictHandoffs=Number(routed?.manualConflictHandoffs||0);
  result.outcome=result.manualConflictHandoffs>0?'MANUAL_CONFLICT_HANDOFF':
   result.dispatchAccepted>0?'DISPATCH_ACCEPTED':
   'CONFLICT_QUEUE_PENDING_OR_BLOCKED';
  result.blocked=routed?.blocked||{};
  const blockedCodes=Object.keys(result.blocked).filter(k=>result.blocked[k]>0);
  result.reason=routed?.reason||
    (blockedCodes.length===1?blockedCodes[0]:null);
  result.nextAction=result.manualConflictHandoffs>0?
   'SEMANTIC_OWNER_REPAIR_AND_EXACT_HEAD_CI':
   result.dispatchAccepted>0?'VERIFY_WORKER_AND_PUBLISHED_SHA':
   result.blocked.CONFLICT_ALREADY_HANDED_OFF?
    'SEMANTIC_OWNER_REPAIR_AND_EXACT_HEAD_CI':'RECONCILE_CONFLICT_QUEUE';
 }catch(error){
  result.outcome='DISPATCH_UNAVAILABLE';
  result.reason=String(error.message||error).slice(0,180);
 }
 return result;
}
module.exports={trustedConflictEvent,currentDirty,publishReadyStage,run};
