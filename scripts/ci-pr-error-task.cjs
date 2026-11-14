'use strict';
// Deterministic advisory task receipt on existing PR comments. Never grants execution.
const crypto=require('node:crypto');
const rules=require('./ci-pr-error-rules.v1.json');
const {trustedControlComment}=require('./ci-pr-task-state.cjs');
const REPO='andylitvinov-design/books',PROD='codex/public-book-library';
const SCHEMA='HH_CI_ERROR_TASK_V1',SHA=/^[a-f0-9]{40}$/i,KEY=/^[a-f0-9]{32}$/i;
const CODE=/^[A-Z0-9_]{3,120}$/;
const DISPATCH_SCHEMA='HH_CI_ERROR_DISPATCH_V1';
const REPAIR_EXECUTOR='github-actions:hh-pr-repair-worker.yml';
const CI_EXECUTOR='github-actions:hh-pr-ci-worker.yml';
const OWNER_EXECUTOR='github-owner:andylitvinov-design';
// A deterministic executor candidate is not an execution authorization.
// Only a signed exact-HEAD reservation, accepted workflow dispatch and
// subsequent worker CLAIMED receipt can advance this state.
// This one named Core test step is also an independently verified SOURCE
// gate (see classifyCoreFailureJobs). Other TEST_FAILURE specialists/browser
// checks remain diagnostic-only, without a code-writer reservation.
function repairableCoreTestFailure(c){
  return !!(c&&c.category==='TEST_FAILURE'&&
    c.failed_job==='core-lint-types-build'&&
    c.failed_step==='Mobile Dock Core geometry and iPhone keyboard contracts'&&
    c.reason_code==='FAILED_TEST_STEP_REQUIRES_TRIAGE'&&
    c.evidence_code==='FAILED_TEST_STEP_REQUIRES_TRIAGE'&&
    c.status==='DIAGNOSTIC_ONLY'&&
    c.source_write_authorized===false&&c.execution_authorized===false);
}
function executorPlan(category,root,classification){
  const eligible=(['SOURCE_CODE','TYPESCRIPT'].includes(category)||
    repairableCoreTestFailure(classification))&&
    root==='SOURCE_OR_PREFLIGHT'&&classification?.requires_human===false&&
    classification?.retry?.allowed===true&&
    classification?.recommended_status==='REROUTED';
  return {executor_id:eligible?REPAIR_EXECUTOR:OWNER_EXECUTOR,
    executor_kind:eligible?'github_actions':'owner_review',
    assignment_status:eligible?'SELECTED_NOT_DISPATCHED':'OWNER_REVIEW_REQUIRED'};
}
const FAIL=new Set(['failure','timed_out','startup_failure']);
const ROOTS=new Set(['SOURCE_OR_PREFLIGHT','RELEASE_GATE_ONLY','SPECIALIST_FAILED',
  'CI_PREFLIGHT_OR_ROUTING','CI_CONTRACT_OR_POLICY','CI_INFRA_OR_ENVIRONMENT','UNVERIFIED']);
const ROUTES=Object.freeze({
  SECURITY:['SECURITY_OWNER_REVIEW','REVIEW_FAILED_SECURITY_GATE',60],
  ACCESS_CONFIG:['OWNER_CONFIGURATION_CHANGE','VERIFY_PERMISSION_OR_CONFIGURATION',60],
  MERGE_CONFLICT:['SEMANTIC_CONFLICT_TRIAGE','ASSIGN_SEMANTIC_CONFLICT_OWNER',30],
  BASE_ADVANCED:['PROTECTED_BASE_RECONCILIATION','VERIFY_BASE_AND_SINGLE_WRITER',15],
  BASE_OR_CI_ROUTING:['CI_ROUTING_DIAGNOSIS','INSPECT_REQUIRED_HEAD_CHECKS',15],
  INFRASTRUCTURE:['BOUNDED_INFRA_DIAGNOSIS','VERIFY_TRANSIENT_PROOF_BEFORE_RETRY',15],
  AUTOMATION_PROCESS:['RECOVER_EXISTING_TASK','CHECK_LEASE_PROMPT_AND_WORKER_RECEIPTS',15],
  AI_EXECUTOR:['ZERO_COST_EXECUTOR_DIAGNOSIS','VALIDATE_FREE_MODEL_RESPONSE',30],
  INTEGRATION:['INTEGRATION_OWNER_DIAGNOSIS','VERIFY_IDEMPOTENT_INTEGRATION',30],
  TYPESCRIPT:['GUARDED_SOURCE_REPAIR','VERIFY_SOURCE_SCOPE_AND_CI',15],
  TEST_FAILURE:['TEST_FAILURE_TRIAGE','DIAGNOSE_PRODUCT_FIXTURE_OR_ORACLE',15],
  SOURCE_CODE:['GUARDED_SOURCE_REPAIR','VERIFY_SOURCE_SCOPE_AND_CI',15],
  UNKNOWN:['SECONDARY_DIAGNOSIS','INSPECT_CAUSAL_JOB_AND_CLASSIFY_AGAIN',15]
});
const key=parts=>crypto.createHash('sha256').update(parts.join(':')).digest('hex').slice(0,32);
function coreErrorTaskId(prNumber,headSha,runId,attempt){
  if(!Number.isSafeInteger(prNumber)||prNumber<1||!SHA.test(headSha||'')||
    !Number.isSafeInteger(runId)||runId<1||
    !Number.isSafeInteger(attempt)||attempt<1)
    return null;
  return key([REPO,prNumber,headSha.toLowerCase(),runId,attempt,'CORE']);
}
const iso=s=>typeof s==='string'&&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s)&&Number.isFinite(Date.parse(s));
function strategyFor(category,root='UNVERIFIED',canRetry=false){
  if(!['SECURITY','ACCESS_CONFIG'].includes(category)){
    if(['RELEASE_GATE_ONLY','CI_CONTRACT_OR_POLICY'].includes(root))
      return {code:'RELEASE_POLICY_TRIAGE',action:'VERIFY_REQUIRED_GATE_AND_POLICY',minutes:15};
    if(root==='SPECIALIST_FAILED')
      return {code:'SPECIALIST_TRIAGE',action:'VERIFY_INDEPENDENT_SPECIALIST_CHECK',minutes:15};
    if(root==='CI_PREFLIGHT_OR_ROUTING')
      return {code:'CI_ROUTING_DIAGNOSIS',action:'INSPECT_REQUIRED_HEAD_CHECKS',minutes:15};
  }
  const [code,action,minutes]=ROUTES[category]||ROUTES.UNKNOWN;
  if(category==='INFRASTRUCTURE'&&!canRetry)
    return {code:'INFRASTRUCTURE_OWNER_TRIAGE',action:'INVESTIGATE_NO_BLIND_RETRY',minutes:30};
  if(category==='AI_EXECUTOR'&&!canRetry)
    return {code:'FREE_PROVIDER_HOLD',action:'CHECK_FREE_MODEL_AND_QUOTA_NO_RETRY',minutes:30};
  return {code,action,minutes};
}
function makeCoreTask({pr,run,classification,root='UNVERIFIED',now=Date.now()}={}){
  if(!pr||!Number.isSafeInteger(pr.number)||pr.number<1||pr.state!=='open'||pr.draft||
      pr.base?.ref!==PROD||pr.head?.repo?.full_name!==REPO||!SHA.test(pr.head?.sha||'')||
      !run||!Number.isSafeInteger(run.id)||run.id<1||
      !Number.isSafeInteger(run.run_attempt)||run.run_attempt<1||
      run.name!=='HH PR core release gate'||
      String(run.path||'').split('@')[0]!=='.github/workflows/hh-pr-core-release.yml'||
      run.event!=='pull_request'||run.status!=='completed'||!FAIL.has(run.conclusion)||
      run.head_branch!==pr.head.ref||run.repository?.full_name!==REPO||
      run.head_repository?.full_name!==REPO||!ROOTS.has(root)||
      !classification||classification.status!=='DIAGNOSTIC_ONLY'||
      classification.ruleset_version!==rules.version||
      !Object.hasOwn(rules.categories,classification.category)||
      classification.source_write_authorized!==false||
      classification.execution_authorized!==false||!CODE.test(classification.reason_code||'')||
      !Number.isFinite(now)||now<=0)throw Error('UNVERIFIED_CORE_ERROR_TASK');
  const st=root==='SOURCE_OR_PREFLIGHT'&&repairableCoreTestFailure(classification)?
    {code:'GUARDED_SOURCE_REPAIR',action:'VERIFY_SOURCE_SCOPE_AND_CI',minutes:15}:
    strategyFor(classification.category,root,classification.retry?.allowed===true);
  return Object.freeze({
    schema:SCHEMA,event_kind:'CORE_CI_FAILED',
    task_id:coreErrorTaskId(pr.number,pr.head.sha,run.id,run.run_attempt),
    pr_number:pr.number,head_sha:pr.head.sha.toLowerCase(),run_id:run.id,
    run_attempt:run.run_attempt,category:classification.category,
    ruleset_version:rules.version,reason_code:classification.reason_code,root_code:root,
    confidence:Number.isFinite(classification.confidence)?classification.confidence:0,
    strategy_code:st.code,responsible_role:rules.categories[classification.category].responsible_role,
    ...executorPlan(classification.category,root,classification),
    next_action:st.action,recommended_status:classification.recommended_status||'UNCLASSIFIED',
    retry_allowed:classification.retry?.allowed===true,
    max_retry_attempts:Number.isSafeInteger(classification.retry?.max_attempts)?
      Math.min(2,Math.max(0,classification.retry.max_attempts)):0,
    requires_human:classification.requires_human===true,
    created_at:new Date(now).toISOString(),
    next_check_at:new Date(now+st.minutes*60_000).toISOString(),
    delivery_status:'CREATED_NOT_EXECUTED',
    source_write_authorized:false,execution_authorized:false
  });
}
function makeWorkerFollowUp({pr_number,head_sha,task_key,owner_run_id,
  state,reason_code,detail_code=null,now=Date.now()}={}){
  if(!Number.isSafeInteger(pr_number)||pr_number<1||!SHA.test(head_sha||'')||
     !KEY.test(task_key||'')||!/^\d{1,20}$/.test(String(owner_run_id||''))||
     !['FAILED','MANUAL','REJECTED','VERIFY_REQUIRED'].includes(state)||
     !CODE.test(reason_code||'')||(detail_code!==null&&!CODE.test(detail_code))||
     !Number.isFinite(now)||now<=0)throw Error('UNVERIFIED_WORKER_ERROR_TASK');
  const publisherFailure=reason_code==='SOURCE_PUBLISH_JOB_FAILURE';
  const legacySemantic=reason_code==='LEGACY_SEMANTIC_REVIEW_REQUIRED';
  // Verified source-publication errors take precedence over an older
  // deterministic candidate detail such as VERIFIED_SOURCE_PATCH.
  const cause=publisherFailure?reason_code:(detail_code||reason_code);
  // A verified sensitive/unsupported file was rejected BEFORE model
  // inference. Do not route it to AI_EXECUTOR or retry the free provider.
  const unsafeSourceScope=new Set([
    'FREE_AI_UNSAFE_SOURCE_SCOPE','SOURCE_SCOPE_UNSAFE_FOR_FREE_AI',
    'SOURCE_SCOPE_NOT_ACTIONABLE','NO_AUTOFIXABLE_ESLINT_CHANGE'
  ]).has(cause);
  // An absent focused test/TypeScript reproduction is a diagnostic gap,
  // NOT a failed model call: no provider was invoked at this stage.
  const reproductionMissing=new Set([
    'FREE_AI_NO_REPRODUCED_BOUNDED_FAILURE',
    'FREE_AI_NO_BOUNDED_TEST_COVERAGE',
    'FREE_AI_TYPECHECK_FAILURE_OUTSIDE_REPAIR_SCOPE',
    'FREE_AI_TYPECHECK_LINE_NOT_IN_SOURCE'
  ]).has(cause);
  const cat=publisherFailure?'AUTOMATION_PROCESS':
    legacySemantic?(detail_code==='GIT_TREE_CONFLICT'?'MERGE_CONFLICT':'SOURCE_CODE'):
    unsafeSourceScope?'SOURCE_CODE':
    reproductionMissing?'TEST_FAILURE':
    /^(?:FREE_AI_|CODEX_)/.test(cause)||/^FREE_AI_/.test(reason_code)?'AI_EXECUTOR':
    /(?:MERGE_CONFLICT|CONFLICT_REQUIRES_SOURCE_RESOLUTION|UNMERGED_PATHS)/i.test(cause+' '+reason_code)?
    'MERGE_CONFLICT':
    /^(?:CLAIM_|NO_CLAIM_|DISPATCH_|RESERVATION_|FINALIZER_)/.test(cause)?
    'AUTOMATION_PROCESS':'UNKNOWN';
  const st=legacySemantic?
    {code:cat==='MERGE_CONFLICT'?'SEMANTIC_CONFLICT_TRIAGE':'SEMANTIC_SOURCE_REPAIR_HANDOFF',
      action:cat==='MERGE_CONFLICT'?'ASSIGN_SEMANTIC_CONFLICT_OWNER':'ASSIGN_SEMANTIC_SOURCE_REPAIR_AGENT',minutes:30}:
    publisherFailure?
    {code:'PUBLISHER_DIAGNOSTIC_HOLD',
      action:'CHECK_PUBLISH_TOKEN_QUOTA_PERMISSIONS_AND_EXACT_HEAD',minutes:15}:
    unsafeSourceScope?
    {code:'MANUAL_SOURCE_SCOPE_REVIEW',
      action:'ASSIGN_OWNER_FOR_SENSITIVE_OR_UNSUPPORTED_SOURCE',minutes:30}:
    reproductionMissing?
    {code:'REPRODUCTION_PROOF_REQUIRED',
      action:'VERIFY_EXACT_HEAD_CORE_TYPESCRIPT_AND_TEST_COVERAGE',minutes:30}:
    strategyFor(cat,'UNVERIFIED',false);
  return Object.freeze({schema:SCHEMA,event_kind:'REPAIR_WORKER_FAILED',
    task_id:key([REPO,pr_number,head_sha.toLowerCase(),task_key,owner_run_id,'WORKER']),
    pr_number,head_sha:head_sha.toLowerCase(),parent_task_key:task_key,
    owner_run_id:String(owner_run_id),category:cat,ruleset_version:rules.version,
    reason_code:cause,strategy_code:st.code,
    responsible_role:legacySemantic?(cat==='MERGE_CONFLICT'?
      'semantic-conflict-resolver':'semantic-source-repair-agent'):
      unsafeSourceScope?'source-repair-owner':
      reproductionMissing?'ci-diagnostic-triage':rules.categories[cat].responsible_role,
    executor_id:OWNER_EXECUTOR,executor_kind:'owner_review',
    assignment_status:'OWNER_REVIEW_REQUIRED',
    next_action:st.action,recommended_status:cat==='UNKNOWN'?'UNCLASSIFIED':'MANUAL_REQUIRED',
    created_at:new Date(now).toISOString(),
    next_check_at:new Date(now+st.minutes*60_000).toISOString(),
    delivery_status:'CREATED_NOT_EXECUTED',
    source_write_authorized:false,execution_authorized:false});
}
function validTask(x){
  return Boolean(x&&x.schema===SCHEMA&&KEY.test(x.task_id||'')&&
    Number.isSafeInteger(x.pr_number)&&x.pr_number>0&&SHA.test(x.head_sha||'')&&
    Object.hasOwn(rules.categories,x.category)&&x.ruleset_version===rules.version&&
    CODE.test(x.strategy_code||'')&&CODE.test(x.next_action||'')&&
    typeof x.responsible_role==='string'&&x.responsible_role.length>0&&
    x.responsible_role.length<=64&&iso(x.created_at)&&iso(x.next_check_at)&&
    (x.executor_id===undefined||(
      [REPAIR_EXECUTOR,OWNER_EXECUTOR].includes(x.executor_id)&&
      x.executor_kind===(x.executor_id===REPAIR_EXECUTOR?'github_actions':'owner_review')&&
      x.assignment_status===(x.executor_id===REPAIR_EXECUTOR?
        'SELECTED_NOT_DISPATCHED':'OWNER_REVIEW_REQUIRED')))&&
    x.source_write_authorized===false&&x.execution_authorized===false);
}
const fence=String.fromCharCode(96).repeat(3);
function taskBody(x){
  if(!validTask(x))throw Error('INVALID_ERROR_TASK_RECEIPT');
  return '<!-- '+SCHEMA+' '+x.task_id+' -->\n'+
    '**CI/PR error task: diagnostic only, not executed.**\n'+
    'Strategy '+x.strategy_code+'; owner '+x.responsible_role+'; next '+x.next_action+'.\n'+
    'Executor target: '+(x.executor_id||OWNER_EXECUTOR)+
      ' ('+(x.assignment_status||'NOT_SELECTED')+'); no worker started.\n'+
    fence+'json\n'+JSON.stringify(x)+'\n'+fence;
}
function taskStatus(comments,task){
  if(!Array.isArray(comments)||!validTask(task))return null;
  for(const c of comments){
    if(!trustedControlComment(c))continue;
    const body=String(c.body||'');
    if(!body.includes('<!-- '+SCHEMA+' '))continue;
    const marker=body.match(/<!-- HH_CI_ERROR_TASK_V1 ([a-f0-9]{32}) -->/i);
    const chunk=body.split(fence+'json\n')[1]?.split('\n'+fence)[0];
    if(!marker||!chunk)return null;
    let other;try{other=JSON.parse(chunk);}catch{return null;}
    if(!validTask(other)||other.task_id!==marker[1])return null;
    if(other.task_id===task.task_id){
      if(other.pr_number!==task.pr_number||other.head_sha!==task.head_sha||
         other.event_kind!==task.event_kind)return null;
      return 'ALREADY_RECORDED';
    }
  }
  return 'MISSING';
}

/**
 * Read-only delivery/execution reconciliation from authenticated existing
 * HH_PR_TASK_V1 receipts. An event task receipt alone never proves delivery.
 * Ambiguous, untrusted, stale or partial history fails closed.
 */
/**
 * Bind only the latest authenticated error-task receipt for this exact
 * PR/HEAD. No unrelated task, untrusted comment or malformed receipt can
 * be used as causal delivery evidence.
 */
function latestErrorTaskId(comments,prNumber,headSha){
  if(!Array.isArray(comments)||!Number.isSafeInteger(prNumber)||
     !SHA.test(headSha||''))return null;
  let latest=null;
  for(const c of comments){
    if(!trustedControlComment(c))continue;
    const body=String(c.body||'');
    if(!body.startsWith('<!-- '+SCHEMA+' '))continue;
    const marker=body.match(/^<!-- HH_CI_ERROR_TASK_V1 ([a-f0-9]{32}) -->/);
    const chunk=body.split(fence+'json\n')[1]?.split('\n'+fence)[0];
    if(!marker||!chunk)return null;
    let x;try{x=JSON.parse(chunk);}catch{return null;}
    if(!validTask(x)||x.task_id!==marker[1])return null;
    if(x.pr_number===prNumber&&x.head_sha===headSha.toLowerCase()&&
       x.event_kind==='CORE_CI_FAILED')latest=x.task_id;
  }
  return latest;
}
// Persisted on the EXISTING signed reservation comment after GitHub's
// workflow_dispatch returns successfully. The reservation JSON remains first
// and still has state RESERVED, so a fast worker can verify the same lease.
function dispatchAcceptance(claim,acceptedAt=Date.now()){
  const executor=claim?.assigned_executor_id;
  const expected=claim?.lane==='ci'?CI_EXECUTOR:REPAIR_EXECUTOR;
  if(claim?.schema!=='HH_PR_TASK_V1'||claim.state!=='RESERVED'||
     !KEY.test(claim.task_key||'')||!SHA.test(claim.head_sha||'')||
     !Number.isSafeInteger(claim.pr_number)||claim.pr_number<1||
     !['repair','ci','legacy','conflict'].includes(claim.lane)||
     executor!==expected||!/^[1-9][0-9]{0,18}$/.test(String(claim.owner_run_id||''))||
     (claim.error_task_id!==undefined&&!KEY.test(claim.error_task_id))||
     !Number.isFinite(acceptedAt)||acceptedAt<=0)
     throw Error('UNVERIFIED_DISPATCH_ACCEPTANCE');
  return Object.freeze({schema:DISPATCH_SCHEMA,state:'DISPATCH_ACCEPTED_NOT_STARTED',
    task_key:claim.task_key,error_task_id:claim.error_task_id||null,
    pr_number:claim.pr_number,head_sha:claim.head_sha.toLowerCase(),
    executor_id:executor,dispatcher_run_id:String(claim.owner_run_id),
    accepted_at:new Date(acceptedAt).toISOString(),workflow_ref:'codex/bootstrap-books',
    worker_started:false,source_write_verified:false});
}
function dispatchAcceptanceBody(ack){
  if(!validDispatchAcceptance(ack))throw Error('INVALID_DISPATCH_ACCEPTANCE');
  return '<!-- '+DISPATCH_SCHEMA+' '+ack.task_key+' -->\n'+
    fence+'json\n'+JSON.stringify(ack)+'\n'+fence;
}
function validDispatchAcceptance(x){
  return Boolean(x&&x.schema===DISPATCH_SCHEMA&&
    x.state==='DISPATCH_ACCEPTED_NOT_STARTED'&&KEY.test(x.task_key||'')&&
    (x.error_task_id===null||KEY.test(x.error_task_id||''))&&
    Number.isSafeInteger(x.pr_number)&&x.pr_number>0&&SHA.test(x.head_sha||'')&&
    [REPAIR_EXECUTOR,CI_EXECUTOR].includes(x.executor_id)&&
    /^[1-9][0-9]{0,18}$/.test(String(x.dispatcher_run_id||''))&&
    iso(x.accepted_at)&&x.workflow_ref==='codex/bootstrap-books'&&
    x.worker_started===false&&x.source_write_verified===false);
}
function acceptedForTask(comments,task,records,workerTaskKey){
  const marker='<!-- '+DISPATCH_SCHEMA+' '+workerTaskKey+' -->';
  const matching=comments.filter(trustedControlComment).filter(c=>
    String(c.body||'').includes(marker));
  if(!matching.length)return null;
  // Ambiguous/overwritten history never upgrades a task to delivered.
  if(matching.length!==1)return false;
  const body=String(matching[0].body||'');
  const tail=body.split(marker)[1];
  const json=tail?.split(fence+'json\n')[1]?.split('\n'+fence)[0];
  let ack;try{ack=JSON.parse(json);}catch{return false;}
  if(!validDispatchAcceptance(ack)||ack.task_key!==workerTaskKey||
     ack.error_task_id!==task.task_id||ack.pr_number!==task.pr_number||
     ack.head_sha!==task.head_sha||ack.executor_id!==REPAIR_EXECUTOR||
     (task.executor_id&&task.executor_id!==ack.executor_id))return false;
  const reservation=records.find(x=>x.state==='RESERVED'&&
    x.task_key===ack.task_key&&x.error_task_id===ack.error_task_id&&
    x.pr_number===ack.pr_number&&x.head_sha===ack.head_sha&&
    x.owner_run_id===ack.dispatcher_run_id&&
    x.assigned_executor_id===ack.executor_id);
  return reservation?ack:false;
}
function taskLifecycle(comments,task,now=Date.now()){
  const status=taskStatus(comments,task);
  if(status===null)return {state:'HISTORY_UNVERIFIED',next_action:'RECHECK_SIGNED_HISTORY'};
  if(status==='MISSING')return {state:'TASK_MISSING',next_action:'CREATE_IDEMPOTENT_TASK'};
  const {parseRecords}=require('./ci-pr-task-state.cjs');
  const trusted=comments.filter(trustedControlComment);
  const records=parseRecords(trusted);
  if(!records)return {state:'HISTORY_UNVERIFIED',next_action:'RECHECK_SIGNED_HISTORY'};
  // An existing dispatcher task on the same PR/HEAD is NOT necessarily
  // causally linked to this exact Core failure (run ID + attempt). Only an
  // explicit error_task_id binding can establish delivery/execution proof.
  const same=records.filter(x=>x.pr_number===task.pr_number&&
    x.head_sha?.toLowerCase()===task.head_sha&&KEY.test(x.task_key||'')&&
    x.error_task_id===task.task_id);
  const latest=same.at(-1);
  if(!latest)return {state:'CLASSIFIED_NOT_DELIVERED',next_action:'RECONCILE_EXISTING_DISPATCHER'};
  if(['PUBLISHED','REPAIRED','DONE'].includes(latest.state)){
    return {state:'SOURCE_PUBLISHED_VERIFY_PENDING',next_action:'VERIFY_NEW_HEAD_REQUIRED_CHECKS',
      worker_task_key:latest.task_key};
  }
  if(['FAILED','MANUAL','REJECTED','UNCONFIRMED','VERIFY_REQUIRED'].includes(latest.state))
    return {state:'REPAIR_FAILED_REDIAGNOSE',next_action:'RECLASSIFY_WORKER_FAILURE_AND_ASSIGN_OWNER',
      worker_task_key:latest.task_key};
  if(latest.state==='CLAIMED')
    return {state:'EXECUTOR_CLAIMED_NOT_COMPLETED',next_action:'CHECK_WORKER_RUN_AND_FINALIZER',
      worker_task_key:latest.task_key};
  if(latest.state==='RESERVED'){
    const accepted=acceptedForTask(comments,task,records,latest.task_key);
    if(accepted===false)
      return {state:'HISTORY_UNVERIFIED',next_action:'RECHECK_SIGNED_HISTORY'};
    if(accepted){
      const overdue=Number.isFinite(now)&&
        now-Date.parse(accepted.accepted_at)>15*60_000;
      return {state:overdue?'WORKER_START_UNCONFIRMED_OVERDUE':
          'DISPATCH_ACCEPTED_NOT_WORKER_STARTED',
        next_action:overdue?'RECONCILE_WORKFLOW_RUN_NO_BLIND_RETRY':
          'WAIT_FOR_SIGNED_WORKER_CLAIM',
        worker_task_key:latest.task_key,executor_id:accepted.executor_id,
        dispatcher_run_id:accepted.dispatcher_run_id};
    }
    return {state:'RESERVED_DELIVERY_UNVERIFIED',
      next_action:'VERIFY_WORKFLOW_DISPATCH_AND_CLAIM',worker_task_key:latest.task_key};
  }
  return {state:'CLASSIFIED_NOT_DELIVERED',next_action:'RECONCILE_EXISTING_DISPATCHER'};
}

module.exports={makeCoreTask,makeWorkerFollowUp,strategyFor,taskBody,taskStatus,taskLifecycle,latestErrorTaskId,validTask,executorPlan,repairableCoreTestFailure,coreErrorTaskId,dispatchAcceptance,dispatchAcceptanceBody,validDispatchAcceptance,REPAIR_EXECUTOR,CI_EXECUTOR};
