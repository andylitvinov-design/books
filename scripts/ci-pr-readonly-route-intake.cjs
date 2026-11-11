'use strict';
/**
 * Persist the non-writing routing decision in the independent failed-Core intake
 * job, BEFORE GitHub's one-pending-run single-writer group can coalesce jobs.
 * Only deterministic review/triage states are eligible; all source/base/infra
 * changes remain exclusively in the existing guarded serialized worker.
 * No source token, model request, new queue, or workflow is introduced.
 */
const {route}=require('./ci-pr-commander-strategy-router.cjs');
const {sendCommanderCiRoute}=require('./ci-pr-commander-route-receipt.cjs');
const {repairableCoreTestFailure}=require('./ci-pr-error-task.cjs');

const REVIEW_ONLY=new Set([
  'SECURITY','ACCESS_CONFIG','MERGE_CONFLICT','UNKNOWN',
  'BASE_OR_CI_ROUTING','TEST_FAILURE','INTEGRATION',
  'AI_EXECUTOR','AUTOMATION_PROCESS'
]);
const REVIEW_STATES=new Set(['TASK_REQUIRES_REVIEW','TASK_ROUTED_TO_REVIEW']);

async function persistReadOnlyRoute({
  receipt,context,github,core,oidcToken,
  routeFn=route,sendFn=sendCommanderCiRoute
}={}){
  // A single authenticated Core source-test failure may use the protected
  // repair dispatcher; a review-only receipt must not preempt that lane.
  if(!REVIEW_ONLY.has(receipt?.category)||repairableCoreTestFailure(receipt?.classification)){
    return {outcome:'DEFERRED_TO_GUARDED_SINGLE_WRITER',attempted:false,recorded:false};
  }
  // route() independently validates the OIDC-associated inbox receipt, exact
  // PR + HEAD, ruleset, category, owner role and no-write classification.
  const decision=await routeFn({receipt,context,github,core,dryRun:false});
  if(!REVIEW_STATES.has(decision?.state)||
     decision.dispatchAccepted!==0||decision.dispatchAcknowledged!==false||
     decision.workerStarted!==false||decision.sourceWriteVerified!==false||
     decision.liveVerified!==false||
     decision.prNumber!==receipt.prNumber||decision.runId!==receipt.runId||
     decision.category!==receipt.category){
    throw Error('CI_READONLY_ROUTE_POLICY_NOT_PROVEN');
  }
  const delivery=await sendFn({
    routeResult:decision,receipt,core,oidcToken
  });
  // Never retry an uncertain callback without reconciling the inbox. The
  // task is already saved; a failed delivery must visibly fail the intake job.
  if(delivery?.sent!==true)
    throw Error('CI_READONLY_ROUTE_RECEIPT_NOT_CONFIRMED');
  return {outcome:'READONLY_ROUTE_RECORDED',attempted:true,recorded:true,
    prNumber:receipt.prNumber,runId:receipt.runId,category:receipt.category,
    routeState:decision.state,reason:decision.reason,
    dispatcherAccepted:0,workerStarted:false,liveVerified:false};
}
module.exports={persistReadOnlyRoute,REVIEW_ONLY};
