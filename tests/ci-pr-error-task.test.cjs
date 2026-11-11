'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const {classifyRedCiError}=require('../scripts/ci-pr-red-ci-classifier.cjs');
const {makeCoreTask,makeWorkerFollowUp,strategyFor,taskBody,taskStatus}=require('../scripts/ci-pr-error-task.cjs');
const sha='a'.repeat(40),repo='andylitvinov-design/books';
const pr={number:4024,state:'open',draft:false,head:{ref:'repair-4024',sha,repo:{full_name:repo}},
  base:{ref:'codex/public-book-library'}};
const run={id:42681313511,run_attempt:1,name:'HH PR core release gate',
  path:'.github/workflows/hh-pr-core-release.yml@refs/heads/codex/bootstrap-books',
  event:'pull_request',status:'completed',conclusion:'failure',head_branch:'repair-4024',
  repository:{full_name:repo},head_repository:{full_name:repo}};
const now=1794312000000;
const classify=(step,extra={})=>classifyRedCiError({pr,
  jobs:[{name:'core-lint-types-build',conclusion:'failure',
    steps:[{name:step,conclusion:'failure'}]}],...extra});
const task=(step,other={})=>makeCoreTask({pr,run,classification:classify(step),
  root:'SOURCE_OR_PREFLIGHT',now,...other});
const bot=body=>({body,user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'}});
test('Core failure has a stable owned and strategy-selected task, no write rights',()=>{
  const x=task('TypeScript check');
  a.equal(x.category,'TYPESCRIPT');a.equal(x.strategy_code,'GUARDED_SOURCE_REPAIR');
  a.equal(x.task_id,task('TypeScript check').task_id);
  a.equal(x.source_write_authorized,false);a.equal(x.execution_authorized,false);
  a.ok(Date.parse(x.next_check_at)>Date.parse(x.created_at));
  a.equal(taskStatus([],x),'MISSING');
  a.equal(taskStatus([bot(taskBody(x))],x),'ALREADY_RECORDED');
});
test('event/run attempt and HEAD are distinct; duplicate callback is idempotent',()=>{
  const x=task('TypeScript check'),y=task('TypeScript check',{run:{...run,run_attempt:2}});
  a.notEqual(x.task_id,y.task_id);
  a.equal(taskStatus([bot(taskBody(x)),bot(taskBody(x))],x),'ALREADY_RECORDED');
});
test('security and credentials cannot be routed to source repair',()=>{
  for(const [step,cat,strategy] of [['Secret scan failed','SECURITY','SECURITY_OWNER_REVIEW'],
    ['Permission denied','ACCESS_CONFIG','OWNER_CONFIGURATION_CHANGE']]){
    const x=task(step);a.equal(x.category,cat);a.equal(x.strategy_code,strategy);
    a.equal(x.retry_allowed,false);a.equal(x.execution_authorized,false);
  }
});
test('policy and specialist root outrank source hypotheses',()=>{
  a.equal(task('TypeScript check',{root:'CI_CONTRACT_OR_POLICY'}).strategy_code,'RELEASE_POLICY_TRIAGE');
  a.equal(task('TypeScript check',{root:'SPECIALIST_FAILED'}).strategy_code,'SPECIALIST_TRIAGE');
});
test('unknown and failing infrastructure get owner/next action, not silent drop',()=>{
  const unknown=makeCoreTask({pr,run,classification:classifyRedCiError({pr,jobs:[]}),now});
  a.equal(unknown.category,'UNKNOWN');a.equal(unknown.strategy_code,'SECONDARY_DIAGNOSIS');
  const transient=classifyRedCiError({pr,jobs:[{name:'runner',conclusion:'startup_failure',steps:[]}]});
  a.equal(makeCoreTask({pr,run,classification:transient,now}).retry_allowed,true);
  a.equal(task('Disk quota exceeded').retry_allowed,false);
});
test('invalid/fork/stale events and corrupt authenticated receipt fail closed',()=>{
  const x=task('TypeScript check'), classification=classify('TypeScript check');
  const bad=x=>a.throws(()=>makeCoreTask({pr,run,classification,now,...x}),/UNVERIFIED_CORE/);
  bad({pr:{...pr,head:{...pr.head,repo:{full_name:'foreign/repo'}}}});
  bad({pr:{...pr,draft:true}});bad({run:{...run,conclusion:'success'}});
  bad({run:{...run,head_branch:'wrong'}});bad({classification:{...classification,execution_authorized:true}});
  a.equal(taskStatus([{body:taskBody(x)}],x),'MISSING');
  a.equal(taskStatus([bot(taskBody(x).replace('"pr_number":4024','"pr_number":4025'))],x),null);
});
test('invalid free AI patch response creates distinct post-worker task',()=>{
  const x=makeWorkerFollowUp({pr_number:4024,head_sha:sha,
    task_key:'c'.repeat(32),owner_run_id:'42681313511',state:'MANUAL',
    reason_code:'NO_SOURCE_COMMIT',detail_code:'FREE_AI_OPENROUTER_PATCH_RESPONSE_INVALID',now});
  a.equal(x.category,'AI_EXECUTOR');a.equal(x.strategy_code,'FREE_PROVIDER_HOLD');
  a.equal(x.responsible_role,'free-executor-router');
  a.equal(taskStatus([bot(taskBody(x))],x),'ALREADY_RECORDED');
  a.throws(()=>makeWorkerFollowUp({pr_number:4024,head_sha:sha,task_key:'c'.repeat(32),
    owner_run_id:'1',state:'PUBLISHED',reason_code:'SUCCESS'}),/UNVERIFIED_WORKER/);
});
test('unsafe source refusal is an owner source-review task, never an AI model retry',()=>{
 const x=makeWorkerFollowUp({pr_number:4217,head_sha:sha,
   task_key:'b'.repeat(32),owner_run_id:'42867102351',state:'FAILED',
   reason_code:'FREE_AI_JOB_FAILED_NO_SOURCE_COMMIT',
   detail_code:'FREE_AI_UNSAFE_SOURCE_SCOPE',now});
 a.equal(x.category,'SOURCE_CODE');
 a.equal(x.strategy_code,'MANUAL_SOURCE_SCOPE_REVIEW');
 a.equal(x.responsible_role,'source-repair-owner');
 a.equal(x.next_action,'ASSIGN_OWNER_FOR_SENSITIVE_OR_UNSUPPORTED_SOURCE');
 a.equal(x.executor_kind,'owner_review');
 a.equal(x.recommended_status,'MANUAL_REQUIRED');
 a.equal(x.source_write_authorized,false);
 a.equal(x.execution_authorized,false);
 a.equal(taskStatus([],x),'MISSING');
 a.equal(taskStatus([bot(taskBody(x))],x),'ALREADY_RECORDED');
});

test('all categories have bounded deterministic strategy',()=>{
  for(const cat of ['SECURITY','ACCESS_CONFIG','INFRASTRUCTURE','MERGE_CONFLICT','BASE_ADVANCED',
    'BASE_OR_CI_ROUTING','AUTOMATION_PROCESS','AI_EXECUTOR','INTEGRATION',
    'TYPESCRIPT','TEST_FAILURE','SOURCE_CODE','UNKNOWN']){
    const x=strategyFor(cat);a.match(x.code,/^[A-Z0-9_]+$/);a.ok(x.minutes<=60);
  }
});


test('delivery/execution reconciliation never equates classification with worker execution',()=>{
 const {taskLifecycle}=require('../scripts/ci-pr-error-task.cjs');
 const x=task('TypeScript check');
 a.deepEqual(taskLifecycle([],x),{state:'TASK_MISSING',next_action:'CREATE_IDEMPOTENT_TASK'});
 a.equal(taskLifecycle([bot(taskBody(x))],x).state,'CLASSIFIED_NOT_DELIVERED');
 const key='b'.repeat(32);
 const receipt=state=>bot('<!-- HH_PR_TASK_V1 -->\n'+
  String.fromCharCode(96).repeat(3)+'json\n'+
  JSON.stringify({schema:'HH_PR_TASK_V1',task_key:key,pr_number:x.pr_number,
    head_sha:x.head_sha,error_task_id:x.task_id,state})+'\n'+String.fromCharCode(96).repeat(3));
 const unrelated=bot(receipt('PUBLISHED').body.replace(x.task_id,'c'.repeat(32)));
 a.equal(taskLifecycle([bot(taskBody(x)),unrelated],x).state,'CLASSIFIED_NOT_DELIVERED',
  'an unrelated task on the same PR/HEAD cannot prove this failure was delivered');
 a.equal(taskLifecycle([bot(taskBody(x)),receipt('RESERVED')],x).state,'RESERVED_DELIVERY_UNVERIFIED');
 a.equal(taskLifecycle([bot(taskBody(x)),receipt('CLAIMED')],x).state,'EXECUTOR_CLAIMED_NOT_COMPLETED');
 a.equal(taskLifecycle([bot(taskBody(x)),receipt('FAILED')],x).state,'REPAIR_FAILED_REDIAGNOSE');
 a.equal(taskLifecycle([bot(taskBody(x)),receipt('PUBLISHED')],x).state,'SOURCE_PUBLISHED_VERIFY_PENDING');
 a.equal(taskLifecycle([bot(taskBody(x)),{body:receipt('CLAIMED').body}],x).state,'CLASSIFIED_NOT_DELIVERED');
});
test('concrete executor selection remains diagnostic until signed dispatch and worker claim',()=>{
 const {taskLifecycle,dispatchAcceptance,dispatchAcceptanceBody,REPAIR_EXECUTOR}=
   require('../scripts/ci-pr-error-task.cjs');
 const {commentBody,parseRecords}=require('../scripts/ci-pr-task-state.cjs');
 const source=task('TypeScript check');
 a.equal(source.executor_id,REPAIR_EXECUTOR);
 a.equal(source.executor_kind,'github_actions');
 a.equal(source.assignment_status,'SELECTED_NOT_DISPATCHED');
 a.equal(source.execution_authorized,false);
 const security=task('Secret scan failed');
 a.equal(security.executor_id,'github-owner:andylitvinov-design');
 a.equal(security.assignment_status,'OWNER_REVIEW_REQUIRED');
 const noSource=task('TypeScript check',{root:'RELEASE_GATE_ONLY'});
 a.equal(noSource.executor_id,'github-owner:andylitvinov-design');
 const base={schema:'HH_PR_TASK_V1',task_key:'b'.repeat(32),
   pr_number:source.pr_number,head_sha:source.head_sha,lane:'repair',
   error_task_id:source.task_id,assigned_executor_id:REPAIR_EXECUTOR,
   state:'RESERVED',owner_run_id:'42'};
 const recorded=bot(taskBody(source));
 const reserved=bot(commentBody(base));
 a.equal(taskLifecycle([recorded,reserved],source,now).state,'RESERVED_DELIVERY_UNVERIFIED');
 const ack=dispatchAcceptance(base,now);
 a.equal(ack.worker_started,false);
 const accepted=bot(commentBody(base)+'\n'+dispatchAcceptanceBody(ack));
 a.deepEqual(parseRecords([accepted]),[base],
   'appended ACK preserves the exact reservation worker will claim');
 const state=taskLifecycle([recorded,accepted],source,now);
 a.equal(state.state,'DISPATCH_ACCEPTED_NOT_WORKER_STARTED');
 a.equal(state.executor_id,REPAIR_EXECUTOR);
 a.equal(state.dispatcher_run_id,'42');
 a.equal(taskLifecycle([recorded,accepted],source,now+16*60000).state,
   'WORKER_START_UNCONFIRMED_OVERDUE');
 const claimed=bot(commentBody({...base,state:'CLAIMED',owner_run_id:'103',
   executor_run_id:'103',worker_started:true}));
 a.equal(taskLifecycle([recorded,accepted,claimed],source,now).state,
   'EXECUTOR_CLAIMED_NOT_COMPLETED');
 a.equal(taskLifecycle([recorded,bot(accepted.body.replace(source.task_id,'c'.repeat(32)))],source,now).state,
   'CLASSIFIED_NOT_DELIVERED','forged task key cannot establish causal delivery');
 a.equal(taskLifecycle([recorded,{body:accepted.body}],source,now).state,
   'CLASSIFIED_NOT_DELIVERED','untrusted dispatch is not proof');
 a.throws(()=>dispatchAcceptance({...base,assigned_executor_id:'untrusted-bot'},now),
   /UNVERIFIED_DISPATCH_ACCEPTANCE/);
 a.throws(()=>dispatchAcceptance({...base,pr_number:0},now),
   /UNVERIFIED_DISPATCH_ACCEPTANCE/);
});
test('watchdog requires signed task readback before allowing a real transient retry',()=>{
 const fs=require('node:fs');
 const src=fs.readFileSync('scripts/ci-pr-ten-minute-watchdog.cjs','utf8');
 a.match(src,/taskStatus\(verified,task\)!=='ALREADY_RECORDED'/);
 a.match(src,/\(dryRun\|\|errorTaskDurable\) && shouldRetryTransientCoreFailure/);
 a.match(src,/HH_CI_ERROR_TASK_LIFECYCLE/);
});

test('only authenticated exact-HEAD error task binds dispatcher causal delivery',()=>{
 const {latestErrorTaskId,taskLifecycle}=require('../scripts/ci-pr-error-task.cjs');
 const x=task('TypeScript check');
 a.equal(latestErrorTaskId([bot(taskBody(x))],x.pr_number,x.head_sha),x.task_id);
 a.equal(latestErrorTaskId([{body:taskBody(x)}],x.pr_number,x.head_sha),null);
 a.equal(latestErrorTaskId([bot(taskBody(x))],x.pr_number+1,x.head_sha),null);
 a.equal(latestErrorTaskId([bot(taskBody(x))],x.pr_number,'b'.repeat(40)),null);
 const other=task('TypeScript check',{run:{...run,run_attempt:2}});
 a.equal(latestErrorTaskId([bot(taskBody(x)),bot(taskBody(other))],x.pr_number,x.head_sha),other.task_id);
 const marker='<!-- HH_PR_TASK_V1 -->';
 const receipt=state=>bot(marker+'\n'+String.fromCharCode(96).repeat(3)+'json\n'+
  JSON.stringify({schema:'HH_PR_TASK_V1',task_key:'b'.repeat(32),
    pr_number:x.pr_number,head_sha:x.head_sha,error_task_id:x.task_id,state})+
  '\n'+String.fromCharCode(96).repeat(3));
 a.equal(taskLifecycle([bot(taskBody(x)),receipt('RESERVED')],x).state,'RESERVED_DELIVERY_UNVERIFIED');
 a.equal(taskLifecycle([bot(taskBody(x)),receipt('CLAIMED')],x).state,'EXECUTOR_CLAIMED_NOT_COMPLETED');
});


test('real Repair Worker #4217 no-autofixable scope is owner review not free-model retry',()=>{
 for(const detail_code of [
  'NO_AUTOFIXABLE_ESLINT_CHANGE','FREE_AI_UNSAFE_SOURCE_SCOPE',
  'SOURCE_SCOPE_UNSAFE_FOR_FREE_AI','SOURCE_SCOPE_NOT_ACTIONABLE'
 ]){
  const x=makeWorkerFollowUp({
   pr_number:4217,head_sha:'e'.repeat(40),
   task_key:'a'.repeat(32),owner_run_id:'42867102351',
   state:'FAILED',reason_code:'FREE_AI_JOB_FAILED_NO_SOURCE_COMMIT',
   detail_code,now});
  a.equal(x.category,'SOURCE_CODE');
  a.equal(x.strategy_code,'MANUAL_SOURCE_SCOPE_REVIEW');
  a.equal(x.responsible_role,'source-repair-owner');
  a.equal(x.executor_id,'github-owner:andylitvinov-design');
  a.equal(x.assignment_status,'OWNER_REVIEW_REQUIRED');
  a.equal(x.source_write_authorized,false);
  a.equal(x.execution_authorized,false);
  a.equal(x.recommended_status,'MANUAL_REQUIRED');
 }
 const genuineProviderFailure=makeWorkerFollowUp({pr_number:4217,
  head_sha:'e'.repeat(40),task_key:'a'.repeat(32),
  owner_run_id:'42867102351',state:'FAILED',
  reason_code:'FREE_AI_OPENROUTER_PATCH_RESPONSE_INVALID',now});
 a.equal(genuineProviderFailure.category,'AI_EXECUTOR',
  'real model reply failures still use their own provider diagnosis');
});


test('model-free TypeScript reproduction failure stays owned, never misclassified as provider failure',()=>{
 for(const detail_code of [
  'FREE_AI_NO_REPRODUCED_BOUNDED_FAILURE',
  'FREE_AI_NO_BOUNDED_TEST_COVERAGE',
  'FREE_AI_TYPECHECK_FAILURE_OUTSIDE_REPAIR_SCOPE',
  'FREE_AI_TYPECHECK_LINE_NOT_IN_SOURCE'
 ]){
  const x=makeWorkerFollowUp({pr_number:4234,head_sha:sha,
   task_key:'b'.repeat(32),owner_run_id:'42876455977',
   state:'MANUAL',reason_code:'FREE_AI_NO_VERIFIED_SOURCE_CHANGE',
   detail_code,now});
  a.equal(x.category,'TEST_FAILURE');
  a.equal(x.strategy_code,'REPRODUCTION_PROOF_REQUIRED');
  a.equal(x.responsible_role,'ci-diagnostic-triage');
  a.equal(x.next_action,'VERIFY_EXACT_HEAD_CORE_TYPESCRIPT_AND_TEST_COVERAGE');
  a.equal(x.source_write_authorized,false);
  a.equal(x.execution_authorized,false);
  a.equal(x.assignment_status,'OWNER_REVIEW_REQUIRED');
 }
});


test('real Core mobile source-contract failure selects guarded worker but other test failures do not',()=>{
 const step='Mobile Dock Core geometry and iPhone keyboard contracts';
 const x=task(step);
 a.equal(x.category,'TEST_FAILURE');
 a.equal(x.failed_step,undefined);
 a.equal(x.strategy_code,'GUARDED_SOURCE_REPAIR');
 a.equal(x.executor_id,'github-actions:hh-pr-repair-worker.yml');
 a.equal(x.assignment_status,'SELECTED_NOT_DISPATCHED');
 a.equal(x.source_write_authorized,false);
 a.equal(x.execution_authorized,false);
 for(const other of [
  task(step,{root:'SPECIALIST_FAILED'}),
  task(step,{root:'CI_PREFLIGHT_OR_ROUTING'}),
  task('Run unit tests'),
  task('WebKit browser tests')
 ]){
  a.equal(other.executor_id,'github-owner:andylitvinov-design');
  a.equal(other.assignment_status,'OWNER_REVIEW_REQUIRED');
  a.notEqual(other.strategy_code,'GUARDED_SOURCE_REPAIR');
 }
 const bogus=classify(step);
 const spoofed=makeCoreTask({pr,run,root:'SOURCE_OR_PREFLIGHT',now,
  classification:{...bogus,failed_step:'A fake test failure'}});
 a.equal(spoofed.assignment_status,'OWNER_REVIEW_REQUIRED');
});
