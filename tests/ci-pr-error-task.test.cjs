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
test('all categories have bounded deterministic strategy',()=>{
  for(const cat of ['SECURITY','ACCESS_CONFIG','INFRASTRUCTURE','MERGE_CONFLICT','BASE_ADVANCED',
    'BASE_OR_CI_ROUTING','AUTOMATION_PROCESS','AI_EXECUTOR','INTEGRATION',
    'TYPESCRIPT','TEST_FAILURE','SOURCE_CODE','UNKNOWN']){
    const x=strategyFor(cat);a.match(x.code,/^[A-Z0-9_]+$/);a.ok(x.minutes<=60);
  }
});
