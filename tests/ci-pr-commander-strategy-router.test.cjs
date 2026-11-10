'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {route,receiptProof}=require('../scripts/ci-pr-commander-strategy-router.cjs');
const rules=require('../scripts/ci-pr-error-rules.v1.json');

const REPO='andylitvinov-design/books', SHA='a'.repeat(40);
const INBOX='82371234-2371-4237-8237-123412341234';
function context(){
 return {repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_run',
  payload:{workflow_run:{
   id:42831850720,run_attempt:1,name:'HH PR core release gate',
   path:'.github/workflows/hh-pr-core-release.yml@refs/heads/codex/bootstrap-books',
   event:'pull_request',status:'completed',conclusion:'failure',
   head_sha:'b'.repeat(40),head_branch:'fix/ci',
   repository:{full_name:REPO},head_repository:{full_name:REPO},
   pull_requests:[{number:4024,head:{sha:SHA}}]
  }}
 };
}
function receipt(category='TYPESCRIPT'){
 const p=rules.categories[category];
 return {
  accepted:true,association:'MATCHED_CHAT_EVENT_RECORDED',
  inboxId:INBOX,prNumber:4024,headSha:SHA,headRef:'fix/ci',runId:42831850720,
  category,classification:{
   schema:'HH_CI_ERROR_CLASSIFICATION_V1',category,ruleset_version:rules.version,
   status:'DIAGNOSTIC_ONLY',confidence:0.98,source_write_authorized:false,
   execution_authorized:false,responsible_role:p.responsible_role,
   recommended_status:p.recommended_status,requires_human:p.requires_human,
   retry:{allowed:p.retry.allowed,max_attempts:p.retry.max_attempts}
  }
 };
}
test('source repair starts ONLY via existing guarded single-writer after unique Commander task',async()=>{
 let calls=0, args;
 const result=await route({receipt:receipt(),context:context(),github:{},core:{},existingCoreHandoff:async a=>{
   calls++;args=a;return {dispatchAccepted:1,outcome:'DISPATCH_ACCEPTED'};
 }});
 assert.equal(result.state,'DISPATCH_ACCEPTED_NOT_WORKER_STARTED');
 assert.equal(result.dispatchAccepted,1);
 assert.equal(result.workerStarted,false);
 assert.equal(result.sourceWriteVerified,false);
 assert.equal(result.liveVerified,false);
 assert.equal(args.context.eventName,'workflow_run');
 assert.equal(calls,1);
});
test('source task with blocked dispatcher is NOT described as executed',async()=>{
 const result=await route({receipt:receipt('SOURCE_CODE'),context:context(),
  existingCoreHandoff:async()=>({dispatchAccepted:0,outcome:'NOT_DISPATCHED_CRON_BACKSTOP',
   blocked:{WORKER_BUSY:1}})});
 assert.equal(result.state,'TASK_WAITING_FOR_DISPATCH');
 assert.equal(result.dispatchAccepted,0);
 assert.deepEqual(result.blocked,{WORKER_BUSY:1});
});
test('all 13 classified categories have explicit route, but only source and TypeScript may request guarded source handoff',async()=>{
 const categories=Object.keys(rules.categories);
 assert.equal(categories.length,13);
 for(const cat of categories){
  let calls=0;
  const r=await route({receipt:receipt(cat),context:context(),
   existingCoreHandoff:async()=>{calls++;return {dispatchAccepted:1};}});
  assert.ok(r.state&&r.strategy&&r.responsibleRole,cat);
  assert.equal(calls,['TYPESCRIPT','SOURCE_CODE'].includes(cat)?1:0,cat);
  if(['SECURITY','ACCESS_CONFIG','MERGE_CONFLICT','UNKNOWN'].includes(cat))
   assert.equal(r.state,'TASK_REQUIRES_REVIEW',cat);
  else if(['BASE_ADVANCED','INFRASTRUCTURE'].includes(cat))
   assert.equal(r.state,'TASK_AWAITING_EXISTING_RECOVERY',cat);
  else if(!['TYPESCRIPT','SOURCE_CODE'].includes(cat))
   assert.equal(r.state,'TASK_ROUTED_TO_REVIEW',cat);
 }
});
test('existing bounded base and infrastructure recovery is respected, not duplicated',async()=>{
 for(const change of [{baseUpdated:true},{infraRerun:true}]){
  let calls=0;
  const r=await route({receipt:receipt('INFRASTRUCTURE'),context:context(),...change,
   existingCoreHandoff:async()=>{calls++;return {dispatchAccepted:1};}});
  assert.equal(r.state,'EXISTING_RECOVERY_ACCEPTED');
  assert.equal(calls,0);
 }
});
test('infrastructure hold without proven rerun retains task without starting source repair',async()=>{
 let calls=0;
 const r=await route({receipt:receipt('TYPESCRIPT'),context:context(),infraHold:true,
  existingCoreHandoff:async()=>{calls++;return {dispatchAccepted:1};}});
 assert.equal(r.state,'TASK_AWAITING_EXISTING_RECOVERY');
 assert.equal(r.reason,'INFRA_HOLD_NO_TARGETED_RERUN');
 assert.equal(calls,0);
});
test('missing, ambiguous, moved, or forged task association must fail closed',async()=>{
 const cases=[
  {accepted:false},{association:'UNMATCHED'},{association:'AMBIGUOUS_TASKS'},
  {association:'MATCHED_TASK_NO_CHAT'},{inboxId:'fake'},
  {headSha:'c'.repeat(40)},{headRef:'wrong'},{prNumber:4025},{runId:42},
  {classification:{...receipt().classification,execution_authorized:true}},
  {classification:{...receipt().classification,source_write_authorized:true}},
  {classification:{...receipt().classification,responsible_role:'untrusted'}},
  {classification:{...receipt().classification,category:'SECURITY'}},
  {classification:{...receipt().classification,ruleset_version:'0.0.0'}}
 ];
 for(const changes of cases){
  let calls=0;
  const result=await route({receipt:{...receipt(),...changes},context:context(),
   existingCoreHandoff:async()=>{calls++;return {dispatchAccepted:1};}});
  assert.equal(result.state,'BLOCKED',JSON.stringify(changes));
  assert.equal(calls,0);
 }
 const bad=context();bad.ref='refs/heads/not-authorized';
 assert.equal(receiptProof(receipt(),bad),'UNTRUSTED_CORE_EVENT');
});
test('uncertain and duplicate dispatch errors do not retry a second worker',async()=>{
 let calls=0;
 const result=await route({receipt:receipt(),context:context(),core:{warning:()=>{}},
  existingCoreHandoff:async()=>{calls++;throw Error('timeout');}});
 assert.equal(calls,1);
 assert.equal(result.state,'DISPATCH_UNCONFIRMED_RECONCILE');
 assert.equal(result.dispatchAccepted,0);
});
test('dry run is read-only even when source is actionable',async()=>{
 let calls=0;
 const r=await route({receipt:receipt(),context:context(),dryRun:true,
  existingCoreHandoff:async()=>{calls++;return {dispatchAccepted:1};}});
 assert.equal(r.state,'WOULD_HANDOFF_GUARDED_SOURCE');
 assert.equal(calls,0);
});
test('the existing workflow executes OIDC task association BEFORE source dispatch, without an added workflow',()=>{
 const file=fs.readFileSync(path.join(__dirname,'../.github/workflows/hh-pr-direct-core-failure.yml'),'utf8');
 const o=file.indexOf('id: commander_ci_event');
 const r=file.indexOf("'/scripts/ci-pr-commander-strategy-router.cjs'");
 assert.ok(o>0&&r>o);
 assert.match(file,/HH_COMMANDER_CI_RECEIPT: \$\{\{ steps\.commander_ci_event\.outputs\.verified_receipt_json \}\}/);
 assert.match(file,/ci-pr-event-handoff\.cjs/);
 assert.match(file,/HH_DIRECT_CORE_HANDOFF/);
 const bridge=fs.readFileSync(path.join(__dirname,'../scripts/ci-pr-hermes-event-bridge.cjs'),'utf8');
 assert.match(bridge,/association: typeof receipt\.association === 'string'/);
 assert.match(bridge,/classification: diagnostics\.classification/);
});
