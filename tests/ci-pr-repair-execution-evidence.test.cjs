'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {buildRepairExecutionEvidence:evidence}=require('../scripts/ci-pr-repair-execution-evidence.cjs');
const {normalizeModelAudit,normalizeBudgetedModelAudit,claimedRepairMissingSourceProof}=
 require('../scripts/ci-pr-repair-worker.cjs');
const {promptReceipt}=require('../scripts/ci-pr-repair-free-agent.cjs');
const {stageLine,validate}=require('../scripts/ci-pr-stage-receipts.cjs');
const HEAD='a'.repeat(40),COMMIT='b'.repeat(40),TASK='1'.repeat(32);
const START='2026-11-14T04:00:00.000Z',CALLED='2026-11-14T04:00:01.000Z';
const ANSWER='2026-11-14T04:00:02.000Z';
const freeConfig={claimStatus:'claimed',codeAvailable:true,configuredProvider:'openrouter',
 codeResult:'success',codeStatus:'proposed',codeJobStartedAt:START,
 codeVerifyResult:'success',codeVerifyStatus:'ready',
 sourcePublished:true,publishedSha:COMMIT,repairKind:'free_ai'};
const prompt=promptReceipt({sha:HEAD,files:['components/public-card.tsx']},
 'bounded safe compiler context',{tests:{ok:false,detail:'safe'}},
 {taskKey:TASK,runId:'123456',runAttempt:1});
const freeAudit=()=>({schema:'HH_FREE_AI_MODEL_RUN_V1',provider:'openrouter',
 model:'openrouter/free',provider_model:'recursive/flint-v1.0:free',
 executor_type:'free_ci_patch_proposer',pr_number:42,source_head:HEAD,
 run_id:'123456',run_attempt:1,started_at:START,model_call_started_at:CALLED,
 response_received_at:ANSWER,attempt_count:1,result:'PATCH_PROPOSED',
 patch_present:true,candidate_paths:['components/public-card.tsx'],
 prompt_receipt:prompt,prompt_prepared_at:START,prompt_delivery_status:'RESPONSE_OBSERVED'});
const ident={number:42,expectedSha:HEAD,runId:123456,runAttempt:1,taskKey:TASK};
function realFree(input=freeAudit()){return normalizeModelAudit(input,ident);}

test('CLAIMED and claim runner are not model invocation or a completed task',()=>{
 const got=evidence({claimStatus:'claimed',codeAvailable:true,configuredProvider:'openrouter'});
 assert.equal(got.executor_assignment_status,'EXECUTOR_ASSIGNED');
 assert.equal(got.executor_started_at,null);
 assert.equal(got.model_response_confirmed,false);
 assert.equal(got.patch_verified,false);
 assert.equal(got.model_patch_published_sha,null);
 assert.equal(got.completion_status,'NOT_COMPLETE_NO_PUBLISHED_SHA');
 assert.equal(claimedRepairMissingSourceProof({claim_status:'claimed',state:'FAILED',
  source_published:false}),true);
});

test('actual code_fix runner time is separate from provider invocation',()=>{
 const got=evidence({...freeConfig,modelRun:null});
 assert.equal(got.executor_started_at,START);
 assert.equal(got.model_response_confirmed,false);
 assert.equal(got.actual_provider,null);
 assert.equal(got.model_patch_published_sha,null);
});

test('openrouter/free alias preserves actual resolved :free model, without a secret',()=>{
 const run=realFree();
 assert.equal(run.model,'openrouter/free');
 assert.equal(run.provider_model,'recursive/flint-v1.0:free');
 const got=evidence({...freeConfig,modelRun:run});
 assert.equal(got.model_response_confirmed,true);
 assert.equal(got.actual_provider,'openrouter');
 assert.equal(got.actual_model,'recursive/flint-v1.0:free');
 assert.equal(got.patch_verified,true);
 assert.equal(got.model_patch_published_sha,COMMIT);
 assert.equal(got.completion_status,'SOURCE_COMMIT_ONLY_CI_MERGE_LIVE_UNVERIFIED');
 assert.equal(JSON.stringify(got).includes('sk-or-v1-'),false);
});

test('configured OpenRouter with no model receipt is explicitly not called',()=>{
 for(const run of [null,{...realFree(),provider_model:null},
  realFree({...freeAudit(),prompt_delivery_status:'ATTEMPTED_UNCONFIRMED',
    response_received_at:null})]){
  const got=evidence({...freeConfig,modelRun:run});
  assert.equal(got.model_response_confirmed,false);
  assert.equal(got.model_patch_published_sha,null);
 }
});

test('proposed candidate needs independent verifier and remote published SHA',()=>{
 const run=realFree();
 const unverified=evidence({...freeConfig,modelRun:run,codeVerifyResult:'failure'});
 assert.equal(unverified.patch_received,true);
 assert.equal(unverified.patch_verified,false);
 assert.equal(unverified.model_patch_published_sha,null);
 const unpublished=evidence({...freeConfig,modelRun:run,sourcePublished:false});
 assert.equal(unpublished.patch_verified,true);
 assert.equal(unpublished.model_patch_published_sha,null);
});

test('incorrect run, HEAD, task or virtual-router resolved model cannot prove LLM work',()=>{
 assert.equal(normalizeModelAudit(freeAudit(),{...ident,taskKey:'2'.repeat(32)}),null);
 assert.equal(normalizeModelAudit(freeAudit(),{...ident,expectedSha:COMMIT}),null);
 assert.equal(normalizeModelAudit(freeAudit(),{...ident,runId:123457}),null);
 assert.equal(normalizeModelAudit({...freeAudit(),provider_model:'openrouter/free'},ident),null);
 assert.equal(normalizeModelAudit({...freeAudit(),provider_model:'qwen/qwen3-coder-next'},ident),null);
});

test('bounded truncated-response retry remains exact signed task',()=>{
 const second=promptReceipt({sha:HEAD,files:['components/public-card.tsx']},
  'bounded retry source',{tests:{ok:false,detail:'safe'}},
  {taskKey:TASK,runId:'123456',runAttempt:1});
 const retried={...freeAudit(),attempt_count:2,retry_prompt_receipt:second,
  retry_reason:'TRUNCATED_EXACT_SOURCE_SINGLE_LINE'};
 assert.equal(realFree(retried).attempt_count,2);
 assert.equal(realFree({...retried,retry_prompt_receipt:{...second,task_key:'2'.repeat(32)}}),null);
});

const paidAudit=()=>({schema:'HH_PR_BUDGETED_MODEL_RUN_V1',provider:'openrouter_budgeted',
 model:'qwen/qwen3-coder-next',pr_number:42,source_head:HEAD,task_key:TASK,
 run_id:'123456',run_attempt:1,model_call_started_at:CALLED,
 response_received_at:ANSWER,cost_usd:0.001,result:'PATCH_PROPOSED'});
const paidConfig={claimStatus:'claimed',budgetedAvailable:true,paidResult:'success',
 paidStatus:'proposed',paidJobStartedAt:START,codeVerifyResult:'success',
 codeVerifyStatus:'ready',sourcePublished:true,publishedSha:COMMIT,repairKind:'budgeted_ai'};
test('trusted paid job requires matching actual response, cost and run metadata',()=>{
 const p=normalizeBudgetedModelAudit(paidAudit(),ident);
 const good=evidence({...paidConfig,paidModelRun:p});
 assert.equal(good.model_response_confirmed,true);
 assert.equal(good.actual_provider,'openrouter_budgeted');
 assert.equal(good.model_patch_published_sha,COMMIT);
 for(const altered of [{cost_usd:0.021},{task_key:'3'.repeat(32)},{run_id:'333'},
  {model:'openrouter/auto'},{response_received_at:'garbage'}])
  assert.equal(normalizeBudgetedModelAudit({...paidAudit(),...altered},ident),null);
 for(const changes of [{paidJobStartedAt:null},{paidModelRun:null},{budgetedAvailable:false}])
  assert.equal(evidence({...paidConfig,paidModelRun:p,...changes}).model_response_confirmed,false);
});
test('paid candidate label is never standalone evidence of model request',()=>{
 const claimed=evidence({claimStatus:'claimed',budgetedAvailable:true,
  paidStatus:'proposed',paidResult:'success',paidJobStartedAt:START});
 assert.equal(claimed.model_response_confirmed,false);
 assert.equal(claimed.patch_verified,false);
 assert.equal(claimed.model_patch_published_sha,null);
});

test('timestamp receipts bind to run/HEAD/task and never imply a source commit',()=>{
 const e={pr_number:42,head_sha:HEAD,run_id:123456,task_key:TASK,at:START};
 assert.ok(validate({stage:'code_executor_started',source:'github_actions_ai_job',...e}));
 assert.ok(validate({stage:'model_response_observed',source:'verified_model_response',...e}));
 assert.match(stageLine({stage:'model_response_observed',source:'verified_model_response',...e}),
  /HH_PR_STAGE_V1/);
 assert.equal(validate({stage:'model_response_observed',source:'repair_worker_claim',...e}),false);
 assert.equal(validate({stage:'source_published',source:'github_actions_ai_job',...e}),false);
});

test('all finalizers pass separate model and publisher proofs without new schedule',()=>{
 const yml=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.equal(yml.includes('HH_BUDGETED_AVAILABLE:'),true);
 assert.equal(yml.includes('HH_CONFIGURED_PROVIDER:'),true);
 assert.equal(yml.includes('HH_PAID_MODEL_AUDIT:'),true);
 assert.equal(yml.includes('paidModelAuditRaw:process.env.HH_PAID_MODEL_AUDIT'),true);
 assert.equal(yml.includes('modelAuditRaw:process.env.HH_MODEL_AUDIT'),true);
 assert.equal(yml.includes('ci-pr-repair-execution-evidence.cjs'),true);
 assert.equal(yml.includes('code_provider_configured'),false,
  'configured and actual provider must be distinguished in the signed final receipt');
 assert.equal(yml.includes('cron:'),false,'must not add a scheduler to Repair Worker');
});
