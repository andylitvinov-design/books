'use strict';

/**
 * Commander CI task -> existing GitHub single-writer dispatcher, same workflow run.
 * The OIDC inbox must first confirm a unique task/chat. Advisory classification
 * can choose a lane but NEVER grants GitHub writes, retries, leases or merges.
 * Only the existing exact-HEAD Watchdog + Dispatcher can approve source Repair.
 * Does not create a workflow, queue or another paid provider.
 */
const {confirmedCoreEvent}=require('./ci-pr-event-handoff.cjs');
const {strategyFor,coreErrorTaskId,repairableCoreTestFailure}=require('./ci-pr-error-task.cjs');
const rules=require('./ci-pr-error-rules.v1.json');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/i;
const CATEGORIES=new Set(Object.keys(rules.categories));
const SAFE_SOURCE=new Set(['SOURCE_CODE','TYPESCRIPT']);
const HUMAN_HOLD=new Set(['SECURITY','ACCESS_CONFIG','MERGE_CONFLICT','UNKNOWN']);
const REVIEW_ONLY=new Set(['BASE_OR_CI_ROUTING','TEST_FAILURE','INTEGRATION','AI_EXECUTOR','AUTOMATION_PROCESS']);
// The private store may create a deterministic task/chat when the PR has none.
// All three values require a verified, owner-scoped persisted task receipt.
const PERSISTED_TASK_ASSOCIATIONS=new Set([
 'MATCHED_CHAT_EVENT_RECORDED',
 'TASK_ASSIGNED_CHAT_RECORDED_NOT_DISPATCHED',
 'AUTO_TASK_CREATED_NOT_DISPATCHED'
]);
const REPAIR_EXECUTOR='github-actions:hh-pr-repair-worker.yml';
const TASK_KEY=/^[a-f0-9]{32}$/i;

function receiptProof(receipt,context){
  if(!confirmedCoreEvent(context))return 'UNTRUSTED_CORE_EVENT';
  const run=context.payload.workflow_run;
  if(receipt?.accepted!==true||!UUID.test(receipt.inboxId||'')||
     !PERSISTED_TASK_ASSOCIATIONS.has(receipt.association))
    return 'CI_TASK_NOT_PROVEN_AND_LINKED';
  if(!Number.isSafeInteger(receipt.prNumber)||receipt.prNumber<1||
     receipt.runId!==run.id||!SHA.test(receipt.headSha||'')||
     receipt.headRef!==run.head_branch)
    return 'CI_TASK_EVENT_IDENTITY_MISMATCH';
  const links=run.pull_requests;
  if(Array.isArray(links)&&links.length>1)return 'CI_TASK_PR_LINK_AMBIGUOUS';
  if(Array.isArray(links)&&links.length===1&&(
       links[0].number!==receipt.prNumber ||
       !SHA.test(links[0]?.head?.sha||'') ||
       links[0].head.sha!==receipt.headSha))
    return 'CI_TASK_HEAD_MOVED';
  const c=receipt.classification;
  if(!c||c.schema!=='HH_CI_ERROR_CLASSIFICATION_V1'||
     c.ruleset_version!==rules.version||!CATEGORIES.has(c.category)||
     c.category!==receipt.category||
     c.status!=='DIAGNOSTIC_ONLY'||c.source_write_authorized!==false||
     c.execution_authorized!==false||
     c.responsible_role!==rules.categories[c.category].responsible_role ||
     typeof c.requires_human!=='boolean'||
     !Number.isFinite(c.confidence)||c.confidence<0||c.confidence>1 ||
     !c.retry||typeof c.retry.allowed!=='boolean'||
     !Number.isSafeInteger(c.retry.max_attempts)||c.retry.max_attempts<0||
     c.retry.max_attempts>2)
    return 'CLASSIFICATION_RECEIPT_INVALID';
  return null;
}

async function route({
  receipt,context,github,core,dryRun=false,
  baseUpdated=false,infraRerun=false,infraHold=false,existingCoreHandoff
}={}){
  const result={
    schema:'HH_COMMANDER_CI_STRATEGY_ROUTE_V1',
    state:'BLOCKED',reason:'UNVERIFIED',prNumber:null,runId:null,
    category:null,strategy:null,responsibleRole:null,
    executorId:null,workerTaskKey:null,errorTaskId:null,dispatchAcknowledged:false,
    dispatchAccepted:0,workerStarted:false,sourceWriteVerified:false,liveVerified:false
  };
  const violation=receiptProof(receipt,context);
  if(violation){result.reason=violation;return result;}
  const c=receipt.classification;
  const sourceTest=repairableCoreTestFailure(c);
  const strategy=sourceTest?
    {code:'GUARDED_SOURCE_REPAIR'}:strategyFor(c.category,'UNVERIFIED',c.retry.allowed);
  result.prNumber=receipt.prNumber;
  result.runId=receipt.runId;
  result.category=c.category;
  result.responsibleRole=c.responsible_role;
  result.strategy=strategy.code;
  // Existing bounded base synchronisation / targeted transient rerun steps
  // precede this receipt. Do not execute them for a second time.
  if(baseUpdated||infraRerun){
    result.state='EXISTING_RECOVERY_ACCEPTED';
    result.reason=baseUpdated?'BASE_SYNCHRONISATION_UPDATED':'BOUNDED_INFRA_RERUN_ACCEPTED';
    return result;
  }
  if(infraHold){
    result.state='TASK_AWAITING_EXISTING_RECOVERY';
    result.reason='INFRA_HOLD_NO_TARGETED_RERUN';
    return result;
  }
  if(HUMAN_HOLD.has(c.category)||c.requires_human===true){
    result.state='TASK_REQUIRES_REVIEW';
    result.reason='HUMAN_REVIEW_REQUIRED';
    return result;
  }
  if(c.category==='BASE_ADVANCED'){
    result.state='TASK_AWAITING_EXISTING_RECOVERY';
    result.reason='BASE_RECOVERY_NOT_PROVEN';
    return result;
  }
  if(c.category==='INFRASTRUCTURE'){
    result.state='TASK_AWAITING_EXISTING_RECOVERY';
    result.reason='INFRA_RERUN_NOT_PROVEN';
    return result;
  }
  if(REVIEW_ONLY.has(c.category)&&!sourceTest){
    result.state='TASK_ROUTED_TO_REVIEW';
    result.reason='NO_SAFE_AUTOMATIC_WRITER_FOR_CATEGORY';
    return result;
  }
  if(!(SAFE_SOURCE.has(c.category)||sourceTest)||c.recommended_status!=='REROUTED'||
     c.retry.allowed!==true||c.retry.max_attempts<1){
    result.state='TASK_REQUIRES_REVIEW';
    result.reason='SOURCE_REPAIR_POLICY_NOT_SATISFIED';
    return result;
  }
  if(typeof existingCoreHandoff!=='function'){
    result.reason='EXISTING_DISPATCHER_UNAVAILABLE';
    return result;
  }
  if(dryRun){
    result.state='WOULD_HANDOFF_GUARDED_SOURCE';
    result.reason='DRY_RUN';
    return result;
  }
  try{
    const handoff=await existingCoreHandoff({github,core,context,dryRun:false});
    const accepted=handoff?.dispatchAccepted===1&&handoff?.dispatchAcknowledged===true&&
      handoff?.prNumber===receipt.prNumber&&handoff?.headSha===receipt.headSha&&
      handoff?.executorId===REPAIR_EXECUTOR&&TASK_KEY.test(handoff?.workerTaskKey||'')&&
      handoff?.errorTaskId===coreErrorTaskId(receipt.prNumber,receipt.headSha,
        receipt.runId,context.payload.workflow_run.run_attempt);
    if(accepted){
      result.dispatchAccepted=1;
      result.dispatchAcknowledged=true;
      result.executorId=REPAIR_EXECUTOR;
      result.workerTaskKey=handoff.workerTaskKey;
      result.errorTaskId=handoff.errorTaskId;
      result.state='DISPATCH_ACCEPTED_NOT_WORKER_STARTED';
      result.reason='EXACT_HEAD_DISPATCH_RECEIPT_CONFIRMED';
    }else if(Number(handoff?.dispatchAccepted||0)>0||
      handoff?.outcome==='DISPATCH_ACCEPTANCE_UNVERIFIED'){
      result.state='DISPATCH_UNCONFIRMED_RECONCILE';
      result.reason='EXACT_HEAD_DISPATCH_ACK_NOT_PROVEN';
      result.blocked=handoff?.blocked||{};
    }else{
      result.state='TASK_WAITING_FOR_DISPATCH';
      result.reason=typeof handoff?.outcome==='string'?handoff.outcome:
        'DISPATCH_NOT_CONFIRMED';
      result.blocked=handoff?.blocked||{};
    }
  }catch(error){
    // Failed or timed-out dispatch can have taken effect. Never retry blindly.
    result.state='DISPATCH_UNCONFIRMED_RECONCILE';
    result.reason='EXISTING_DISPATCHER_RESULT_UNVERIFIED';
    core?.warning?.('COMMANDER_CI_ROUTE '+result.reason+' '+String(error?.name||'Error'));
  }
  return result;
}
module.exports={route,receiptProof};
