'use strict';
// Audit-only evidence. This module MUST NEVER grant write/merge authorization.
const SHA=/^[a-f0-9]{40}$/i;
const TIME=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(x)&&Number.isFinite(Date.parse(x));
const JOB_TERMINAL=new Set(['success','failure','cancelled']);
function buildRepairExecutionEvidence(input={}){
 const {claimStatus='',configuredProvider='',codeAvailable=false,
  budgetedAvailable=false,codeResult='skipped',codeStatus='skipped',
  codeJobStartedAt=null,modelRun=null,paidResult='skipped',
  paidStatus='skipped',paidJobStartedAt=null,paidModelRun=null,
  codeVerifyResult='skipped',codeVerifyStatus='skipped',
  sourcePublished=false,publishedSha=null,repairKind=null}=input;
 const configured=codeAvailable===true&&['openrouter','opencode'].includes(configuredProvider)?
  configuredProvider:null;
 const paidConfigured=budgetedAvailable===true;
 // A CLAIMED receipt is only assignment of an owner, never proof of an LLM.
 const assigned=claimStatus==='claimed'&&(configured||paidConfigured);
 const freeStarted=assigned&&configured&&JOB_TERMINAL.has(codeResult)&&
  TIME(codeJobStartedAt)?codeJobStartedAt:null;
 const paidStarted=assigned&&paidConfigured&&JOB_TERMINAL.has(paidResult)&&
  TIME(paidJobStartedAt)?paidJobStartedAt:null;
 const free=freeStarted&&modelRun?.provider===configured&&
  modelRun?.executor_type==='free_ci_patch_proposer'?modelRun:null;
 const prompt=free?.prompt_receipt;
 const freeAttempt=Boolean(free&&prompt?.schema==='HH_PR_PROMPT_RECEIPT_V1'&&
  TIME(free.prompt_prepared_at)&&TIME(free.model_call_started_at)&&
  Number.isInteger(free.attempt_count)&&free.attempt_count>=1&&free.attempt_count<=2&&
  Date.parse(free.model_call_started_at)>=Date.parse(freeStarted)&&
  Date.parse(free.model_call_started_at)>=Date.parse(free.prompt_prepared_at)&&
  ['ATTEMPTED_UNCONFIRMED','RESPONSE_OBSERVED'].includes(free.prompt_delivery_status));
 // The virtual openrouter/free alias is NOT the resolved model identity.
 const actualFreeModel=free?.provider==='openrouter'?free.provider_model:free?.model;
 const realFreeModel=free?.provider==='openrouter'?
  typeof actualFreeModel==='string'&&/^[A-Za-z0-9][\w.-]*\/[A-Za-z0-9][\w.-]*:free$/.test(actualFreeModel):Boolean(actualFreeModel);
 const freeResponse=Boolean(freeAttempt&&realFreeModel&&
  free.prompt_delivery_status==='RESPONSE_OBSERVED'&&
  TIME(free.response_received_at)&&
  Date.parse(free.response_received_at)>=Date.parse(free.model_call_started_at));
 // Paid receipt is generated only after an actually verified Qwen response,
 // a $0.02 max-cost check, a proposed bounded patch and ledger settlement.
 const paid=paidStarted&&paidModelRun?.schema==='HH_PR_BUDGETED_MODEL_RUN_V1'&&
  paidModelRun.provider==='openrouter_budgeted'&&
  paidModelRun.model==='qwen/qwen3-coder-next'&&
  paidModelRun.result==='PATCH_PROPOSED'&&
  Number.isFinite(paidModelRun.cost_usd)&&paidModelRun.cost_usd>=0&&paidModelRun.cost_usd<=0.02?
  paidModelRun:null;
 const paidAttempt=Boolean(paid&&TIME(paid.model_call_started_at)&&
  Date.parse(paid.model_call_started_at)>=Date.parse(paidStarted));
 const paidResponse=Boolean(paidAttempt&&paidStatus==='proposed'&&
  TIME(paid.response_received_at)&&
  Date.parse(paid.response_received_at)>=Date.parse(paid.model_call_started_at));
 const freeProposed=Boolean(freeResponse&&codeResult==='success'&&
  codeStatus==='proposed'&&free.patch_present===true&&free.result==='PATCH_PROPOSED');
 const paidProposed=paidResponse;
 const modelProposed=freeProposed||paidProposed;
 const verified=Boolean(modelProposed&&codeVerifyResult==='success'&&codeVerifyStatus==='ready');
 const sourceSha=sourcePublished===true&&SHA.test(publishedSha||'')?publishedSha:null;
 const modelSha=verified&&['free_ai','budgeted_ai'].includes(repairKind)?sourceSha:null;
 const observed=paidResponse||freeResponse;
 const attempted=paidAttempt||freeAttempt;
 const provider=paidResponse?'openrouter_budgeted':freeResponse?configured:null;
 const model=paidResponse?'qwen/qwen3-coder-next':freeResponse?actualFreeModel:null;
 const responseAt=paidResponse?paid.response_received_at:freeResponse?free.response_received_at:null;
 const startedAt=paidStarted||freeStarted;
 const stage=modelSha?'COMMIT_PUBLISHED_CI_UNVERIFIED':verified?'PATCH_VERIFIED_NOT_PUBLISHED':
  modelProposed?'PATCH_PROPOSED_NOT_VERIFIED':observed?'MODEL_RESPONSE_CONFIRMED_NO_PATCH':
  attempted?'MODEL_REQUEST_ATTEMPTED_UNCONFIRMED':startedAt?'EXECUTOR_STARTED_NO_MODEL_PROOF':
  assigned?'EXECUTOR_ASSIGNED_NOT_STARTED':'NO_EXECUTOR_ASSIGNED';
 return {schema:'HH_PR_AI_EXECUTION_EVIDENCE_V1',
  configured_provider:configured,budgeted_provider_configured:paidConfigured,
  executor_assignment_status:assigned?'EXECUTOR_ASSIGNED':'NOT_ASSIGNED',
  executor_started_at:startedAt||null,free_executor_started_at:freeStarted,
  paid_executor_started_at:paidStarted,model_request_attempted:attempted,
  model_response_confirmed:observed,model_response_at:responseAt,
  actual_provider:provider,actual_model:model,patch_received:modelProposed,
  patch_verified:verified,source_published_sha:sourceSha,
  model_patch_published_sha:modelSha,stage,
  completion_status:sourceSha?'SOURCE_COMMIT_ONLY_CI_MERGE_LIVE_UNVERIFIED':'NOT_COMPLETE_NO_PUBLISHED_SHA'};
}
module.exports={buildRepairExecutionEvidence};
