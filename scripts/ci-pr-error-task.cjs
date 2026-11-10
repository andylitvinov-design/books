'use strict';
// Deterministic advisory task receipt on existing PR comments. Never grants execution.
const crypto=require('node:crypto');
const rules=require('./ci-pr-error-rules.v1.json');
const {trustedControlComment}=require('./ci-pr-task-state.cjs');
const REPO='andylitvinov-design/books',PROD='codex/public-book-library';
const SCHEMA='HH_CI_ERROR_TASK_V1',SHA=/^[a-f0-9]{40}$/i,KEY=/^[a-f0-9]{32}$/i;
const CODE=/^[A-Z0-9_]{3,120}$/;
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
  const st=strategyFor(classification.category,root,classification.retry?.allowed===true);
  return Object.freeze({
    schema:SCHEMA,event_kind:'CORE_CI_FAILED',
    task_id:key([REPO,pr.number,pr.head.sha.toLowerCase(),run.id,run.run_attempt,'CORE']),
    pr_number:pr.number,head_sha:pr.head.sha.toLowerCase(),run_id:run.id,
    run_attempt:run.run_attempt,category:classification.category,
    ruleset_version:rules.version,reason_code:classification.reason_code,root_code:root,
    confidence:Number.isFinite(classification.confidence)?classification.confidence:0,
    strategy_code:st.code,responsible_role:rules.categories[classification.category].responsible_role,
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
  const cause=detail_code||reason_code;
  const cat=/^(?:FREE_AI_|CODEX_)/.test(cause)||/^FREE_AI_/.test(reason_code)?'AI_EXECUTOR':
    /^(?:CLAIM_|NO_CLAIM_|DISPATCH_|RESERVATION_|FINALIZER_)/.test(cause)?
    'AUTOMATION_PROCESS':'UNKNOWN';
  const st=strategyFor(cat,'UNVERIFIED',false);
  return Object.freeze({schema:SCHEMA,event_kind:'REPAIR_WORKER_FAILED',
    task_id:key([REPO,pr_number,head_sha.toLowerCase(),task_key,owner_run_id,'WORKER']),
    pr_number,head_sha:head_sha.toLowerCase(),parent_task_key:task_key,
    owner_run_id:String(owner_run_id),category:cat,ruleset_version:rules.version,
    reason_code:cause,strategy_code:st.code,responsible_role:rules.categories[cat].responsible_role,
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
    x.source_write_authorized===false&&x.execution_authorized===false);
}
const fence=String.fromCharCode(96).repeat(3);
function taskBody(x){
  if(!validTask(x))throw Error('INVALID_ERROR_TASK_RECEIPT');
  return '<!-- '+SCHEMA+' '+x.task_id+' -->\n'+
    '**CI/PR error task: diagnostic only, not executed.**\n'+
    'Strategy '+x.strategy_code+'; owner '+x.responsible_role+'; next '+x.next_action+'.\n'+
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
module.exports={makeCoreTask,makeWorkerFollowUp,strategyFor,taskBody,taskStatus,validTask};
