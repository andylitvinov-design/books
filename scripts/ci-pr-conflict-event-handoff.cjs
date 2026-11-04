'use strict';
/**
 * PR-targeted Conflict Repair handoff. Executed only from the existing
 * protected-production workflow with a trusted default-branch checkout.
 * The shared dispatcher owns exact-HEAD proof, signed history and labels.
 * No source modification, CI rerun, merge or new Actions workflow is created.
 */
const REPO='andylitvinov-design/books',PROD='codex/public-book-library';
const SHA=/^[a-f0-9]{40}$/i;
const ACTIONS=new Set(['opened','reopened','ready_for_review','synchronize']);
function conflictEventTarget(context){
 const pr=context?.payload?.pull_request;
 if(context?.repo?.owner+'/'+context?.repo?.repo!==REPO||
    context?.eventName!=='pull_request_target'||
    context.ref!=='refs/heads/'+PROD||
    !ACTIONS.has(context.payload?.action)||
    !Number.isSafeInteger(pr?.number)||pr.number<1||
    pr.state!=='open'||pr.draft||
    pr.base?.ref!==PROD||pr.head?.repo?.full_name!==REPO||
    !SHA.test(pr.head?.sha||''))return null;
 return {pr_number:pr.number,head_sha:pr.head.sha,action:context.payload.action};
}
async function runConflictEvent({github,core,context,dryRun=false,dispatchRun=null}){
 const target=conflictEventTarget(context);
 const result={schema:'HH_CONFLICT_EVENT_HANDOFF_V1',
  status:'IGNORED_EVENT',pr_number:target?.pr_number??null,
  head_sha:target?.head_sha??null,manual_handoffs:0,reason:null};
 if(!target)return result;
 const dispatch=dispatchRun||require('./ci-pr-queue-dispatcher.cjs').run;
 const outcome=await dispatch({github,core,context,dryRun,
  focusConflictPrNumber:target.pr_number});
 result.manual_handoffs=outcome?.manualConflictHandoffs||0;
 result.reason=outcome?.reason||null;
 result.status=result.manual_handoffs>0?'CONFLICT_ROUTED':
  outcome?.wouldManualConflictHandoffs?'WOULD_ROUTE_CONFLICT':
  result.reason||'NO_CONFIRMED_CONFLICT';
 return result;
}
module.exports={conflictEventTarget,runConflictEvent};