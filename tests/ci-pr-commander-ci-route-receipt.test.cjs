'use strict';
const {test}=require('node:test');
const a=require('node:assert/strict');
const fs=require('node:fs');
const {normalizedPayload,sendCommanderCiRoute,ENDPOINT}=require('../scripts/ci-pr-commander-route-receipt.cjs');
const {coreErrorTaskId}=require('../scripts/ci-pr-error-task.cjs');
const SHA='a'.repeat(40),INBOX='12341234-1234-4234-8234-123412341234';
const receipt=()=>({
 accepted:true,association:'MATCHED_CHAT_EVENT_RECORDED',inboxId:INBOX,
 prNumber:123,headSha:SHA,headRef:'fix/task',runId:456,category:'TYPESCRIPT',
 classification:{responsible_role:'free-code-repair-worker'}
});
const result=()=>({
 state:'DISPATCH_ACCEPTED_NOT_WORKER_STARTED',reason:'EXISTING_DISPATCHER_ACCEPTED',
 strategy:'GUARDED_SOURCE_REPAIR',responsibleRole:'free-code-repair-worker',
 prNumber:123,runId:456,category:'TYPESCRIPT',dispatchAccepted:1,
 dispatchAcknowledged:true,executorId:'github-actions:hh-pr-repair-worker.yml',
 workerTaskKey:'b'.repeat(32),errorTaskId:coreErrorTaskId(123,SHA,456,1),
 workerStarted:false,sourceWriteVerified:false,liveVerified:false
});
test('accepted dispatch is explicitly not worker, source, CI or LIVE proof',()=>{
 const r=normalizedPayload(result(),receipt());
 a.equal(r.schema,'HH_COMMANDER_CI_ROUTE_RECEIPT_V1');
 a.equal(r.dispatchAccepted,1);
 a.equal(r.dispatchAcknowledged,true);
 a.equal(r.executorId,'github-actions:hh-pr-repair-worker.yml');
 a.equal(r.workerTaskKey,'b'.repeat(32));
 a.equal(r.errorTaskId,coreErrorTaskId(123,SHA,456,1));
 a.equal(r.workerStarted,false);
 a.equal(r.sourceWriteVerified,false);
 a.equal(r.liveVerified,false);
});
test('unsupported categories and forged execution evidence are refused',()=>{
 for(const mutation of [
  {state:'COMPLETED'},{state:'DISPATCH_ACCEPTED_NOT_WORKER_STARTED',workerStarted:true},
  {sourceWriteVerified:true},{liveVerified:true},{prNumber:124},{runId:457},
  {category:'SECURITY'},{dispatchAccepted:0},{dispatchAccepted:3},
  {reason:'not valid'},{responsibleRole:'stranger'},
  {dispatchAcknowledged:false},{executorId:'fake-worker'},
  {workerTaskKey:'not-a-task-key'},{workerTaskKey:null},
  {errorTaskId:null},{errorTaskId:'c'.repeat(31)}
 ])a.throws(()=>normalizedPayload({...result(),...mutation},receipt()));
 a.throws(()=>normalizedPayload(result(),{...receipt(),association:'UNMATCHED'}));
 a.throws(()=>normalizedPayload(result(),{...receipt(),inboxId:'bad'}));
});
test('new auto-created Commander tasks are accepted with exact event identity',()=>{
 for(const association of ['AUTO_TASK_CREATED_NOT_DISPATCHED',
   'TASK_ASSIGNED_CHAT_RECORDED_NOT_DISPATCHED']){
  const p=normalizedPayload(result(),{...receipt(),association});
  a.equal(p.executorId,'github-actions:hh-pr-repair-worker.yml');
 }
});
test('non-code diagnostic or manual routes can record zero dispatches',()=>{
 const r=normalizedPayload({
  ...result(),state:'TASK_REQUIRES_REVIEW',dispatchAccepted:0,
  dispatchAcknowledged:false,executorId:null,workerTaskKey:null,errorTaskId:null,
  blocked:{WORKER_BUSY:1}
 },receipt());
 a.equal(r.state,'TASK_REQUIRES_REVIEW');
 a.equal(r.dispatchAccepted,0);
 a.equal(r.blocked.WORKER_BUSY,1);
});
test('sends one OIDC-only callback to pinned existing Edge Function endpoint',async()=>{
 let calls=0,request;
 const r=await sendCommanderCiRoute({
  routeResult:result(),receipt:receipt(),oidcToken:'a'.repeat(220),
  fetchImpl:async(url,options)=>{
   calls++;request={url,options};
   return {ok:true,status:202,text:async()=>JSON.stringify({recorded:true,outcome:'RECORDED'})};
  }
 });
 a.equal(calls,1);a.equal(r.sent,true);
 a.equal(request.url,ENDPOINT);
 a.equal(request.options.method,'POST');
 a.equal(request.options.headers.authorization,'Bearer '+'a'.repeat(220));
 const body=JSON.parse(request.options.body);
 a.equal(body.headSha,SHA);
 a.equal(body.dispatchAcknowledged,true);
 a.equal(body.executorId,'github-actions:hh-pr-repair-worker.yml');
 a.equal(body.workerTaskKey,'b'.repeat(32));
 a.equal(body.errorTaskId,coreErrorTaskId(123,SHA,456,1));
 a.equal(body.workerStarted,false);
 a.equal(body.sourceWriteVerified,false);
});
test('timeout, invalid OIDC, and unexpected receipt fail closed without blind retries',async()=>{
 let calls=0;
 const t=await sendCommanderCiRoute({routeResult:result(),receipt:receipt(),
  oidcToken:'a'.repeat(200),fetchImpl:async()=>{calls++;throw Error('timeout');}});
 a.equal(t.sent,false);a.equal(calls,1);
 const noOidc=await sendCommanderCiRoute({routeResult:result(),receipt:receipt(),
  oidcToken:'',fetchImpl:async()=>{calls++;}});
 a.equal(noOidc.reason,'OIDC_TOKEN_MISSING');
 a.equal(calls,1);
 const rejected=await sendCommanderCiRoute({routeResult:result(),receipt:receipt(),
  oidcToken:'a'.repeat(200),fetchImpl:async()=>({ok:true,status:202,
   text:async()=>JSON.stringify({recorded:false,outcome:'REJECTED'})})});
 a.equal(rejected.sent,false);
});
test('existing Commander private store validates and persists immutable route receipts',()=>{
 const s=fs.readFileSync('supabase/functions/agent-commander-private-store-v1/index.ts','utf8');
 const migration=fs.readFileSync('supabase/migrations/20261110153100_commander_ci_route_receipt_v1.sql','utf8');
 const workflow=fs.readFileSync('.github/workflows/hh-pr-direct-core-failure.yml','utf8');
 a.match(s,/async function receiveCommanderCiRoute\(req,origin\)/);
 a.match(s,/await verifyGitHubActionsOidc\(req\)/);
 a.match(s,/e\.oidc_workflow_ref!==claims\.workflow_ref/);
 a.match(s,/CI_ROUTE_SOURCE_NOT_VERIFIED/);
 a.match(s,/ROUTE_RECEIPT_IMMUTABLE_CONFLICT/);
 a.match(s,/COMMANDER_CHAT_NOT_UNIQUE/);
 a.match(s,/route_receipt=\$1::text::jsonb/);
 a.match(s,/GITHUB_OIDC_ROUTE_ONLY_NOT_EXECUTION/);
 a.match(s,/ciLatestRoute/);
 a.match(s,/CI_ROUTE_CAUSAL_TASK_MISMATCH/);
 a.match(s,/exactCoreFailureTaskId/);
 a.match(s,/route_receipt,route_recorded_at/);
 a.match(migration,/ALTER TABLE business_brain\.commander_ci_event_inbox/);
 const from=workflow.indexOf("const {route}=require(");
 const delivery=workflow.indexOf("const {sendCommanderCiRoute}=require(");
 a.ok(from>0&&delivery>from);
 a.match(workflow,/HH_COMMANDER_CI_ROUTE_RECEIPT/);
});
