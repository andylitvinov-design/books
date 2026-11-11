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


test('route receipt accepts each authenticated task association state',()=>{
 for(const association of ['MATCHED_CHAT_EVENT_RECORDED',
  'TASK_ASSIGNED_CHAT_RECORDED_NOT_DISPATCHED','AUTO_TASK_CREATED_NOT_DISPATCHED']){
  const v=normalizedPayload(result(),{...receipt(),association});
  a.equal(v.inboxId,INBOX);
  a.equal(v.workerStarted,false);
 }
 for(const association of ['UNMATCHED','AMBIGUOUS_TASKS','MATCHED_TASK_NO_CHAT']){
  a.throws(()=>normalizedPayload(result(),{...receipt(),association}));
 }
});
test('Commander fallback constructs one deterministic private task and chat per exact source SHA',()=>{
 const code=fs.readFileSync('supabase/functions/agent-commander-private-store-v1/index.ts','utf8');
 const start=code.indexOf('async function ensureCiIncidentTask(');
 const end=code.indexOf('async function receiveGitHubWorkflowRun(');
 a.ok(start>0&&end>start);
 const helper=code.slice(start,end);
 a.match(helper,/stableScopeId\(ownerId,scope\)/);
 a.match(helper,/on conflict\(task_id\) do nothing/);
 a.match(helper,/CI_TASK_IDENTITY_UNVERIFIED/);
 a.match(helper,/CI_TASK_CHAT_UNVERIFIED/);
 a.match(helper,/CLASSIFIED_NOT_DISPATCHED/);
 a.match(helper,/AWAITING_EXECUTOR_NOT_DISPATCHED/);
 a.match(code,/ensureCiIncidentTask\(db,inboxOwnerId,event\)/);
 a.match(code,/AUTO_TASK_CREATED_NOT_DISPATCHED/);
});


test('CI route outcomes cannot violate the existing Commander chat execution_state CHECK',()=>{
 const source=fs.readFileSync('supabase/functions/agent-commander-private-store-v1/index.ts','utf8');
 const from=source.indexOf('function commanderCiChatExecutionState(routeState: string): string {');
 const next=source.indexOf('function normalizeLegacyZeroDispatchCiRoute(p: any): any {',from);
 const to=next>from?next:source.indexOf('async function receiveCommanderCiRoute(req,origin){',from);
 a.ok(from>=0&&to>from,'mapping exists before authenticated route receiver');
 const body=source.slice(from,to)
   .replace('routeState: string','routeState').replace('): string {',') {');
 const vm=require('node:vm');
 const mapping=vm.runInNewContext(body+'\ncommanderCiChatExecutionState',Object.create(null));
 const allowed=new Set(['UNVERIFIED_ASSIGNMENT_ONLY','AWAITING_EXECUTOR_NOT_DISPATCHED',
  'DISPATCHED_UNVERIFIED','WORKING_UNVERIFIED','BLOCKED',
  'SOURCE_VERIFIED','COMPLETED_UNVERIFIED']);
 const categories=new Map([
  ['TASK_REQUIRES_REVIEW','BLOCKED'],
  ['TASK_ROUTED_TO_REVIEW','BLOCKED'],
  ['TASK_AWAITING_EXISTING_RECOVERY','AWAITING_EXECUTOR_NOT_DISPATCHED'],
  ['TASK_WAITING_FOR_DISPATCH','AWAITING_EXECUTOR_NOT_DISPATCHED'],
  ['EXISTING_RECOVERY_ACCEPTED','DISPATCHED_UNVERIFIED'],
  ['DISPATCH_ACCEPTED_NOT_WORKER_STARTED','DISPATCHED_UNVERIFIED'],
  ['DISPATCH_UNCONFIRMED_RECONCILE','DISPATCHED_UNVERIFIED']
 ]);
 for(const [status,expected] of categories){
  a.equal(mapping(status),expected,status);
  a.ok(allowed.has(mapping(status)),status+' not in CHECK allowlist');
 }
 a.equal(mapping('UNEXPECTED'),'BLOCKED');
 a.match(source,/\[commanderCiChatExecutionState\(p\.state\),chats\[0\]\.chat_id,e\.inbox_owner_id\]/);
 a.doesNotMatch(source,/\[p\.state,chats\[0\]\.chat_id,e\.inbox_owner_id\]/);
});


test('legacy zero-dispatch route receipts are upgraded without granting an executor ACK',()=>{
 const edge=fs.readFileSync('supabase/functions/agent-commander-private-store-v1/index.ts','utf8');
 const first=edge.indexOf('function normalizeLegacyZeroDispatchCiRoute(p: any): any {');
 const last=edge.indexOf('async function receiveCommanderCiRoute(req,origin){',first);
 a.ok(first>0&&last>first);
 const vm=require('node:vm');
 const fn=vm.runInNewContext(edge.slice(first,last).replace('p: any): any','p)')+
   '\nnormalizeLegacyZeroDispatchCiRoute',Object.create(null));
 const legacy={schema:'HH_COMMANDER_CI_ROUTE_RECEIPT_V1',
   state:'TASK_ROUTED_TO_REVIEW',dispatchAccepted:0,workerStarted:false,
   sourceWriteVerified:false,liveVerified:false};
 const safe=fn(legacy);
 a.equal(safe.dispatchAccepted,0);
 a.equal(safe.dispatchAcknowledged,false);
 a.equal(safe.executorId,null);
 a.equal(safe.workerTaskKey,null);
 a.equal(safe.errorTaskId,null);
 a.equal(legacy.dispatchAcknowledged,undefined,'does not mutate original input');
 const positive={...legacy,dispatchAccepted:1};
 a.equal(fn(positive),positive,'never fills a missing positive dispatch ACK');
 const partial={...legacy,executorId:'some-agent'};
 a.equal(fn(partial),partial,'partial negative evidence still fails strict validation');
 const spoofed={...legacy,dispatchAcknowledged:true};
 a.equal(fn(spoofed),spoofed,'cannot downgrade a claimed positive ACK');
 a.match(edge,/p=normalizeLegacyZeroDispatchCiRoute\(p\);/);
 a.ok(edge.includes("p.dispatchAcknowledged!==(p.dispatchAccepted===1)"));
 a.ok(edge.includes('p.executorId!=="github-actions:hh-pr-repair-worker.yml"'));
});


test('OIDC route receipt allows only exact-event 0-to-1 dispatch promotion',()=>{
 const edge=fs.readFileSync('supabase/functions/agent-commander-private-store-v1/index.ts','utf8');
 const begin=edge.indexOf('function isMonotonicCiDispatchUpgrade(');
 const end=edge.indexOf('async function receiveCommanderCiRoute(req,origin){',begin);
 a.ok(begin>=0&&end>begin);
 const js=edge.slice(begin,end).replace(
   'prior: any, next: any): boolean','prior, next)');
 const fn=require('node:vm').runInNewContext(js+
   '\nisMonotonicCiDispatchUpgrade',Object.create(null));
 const prior={schema:'HH_COMMANDER_CI_ROUTE_RECEIPT_V1',
  inboxId:INBOX,prNumber:123,headSha:SHA,runId:456,
  category:'TYPESCRIPT',router:'GUARDED_SOURCE_REPAIR',
  responsibleRole:'free-code-repair-worker',
  state:'TASK_WAITING_FOR_DISPATCH',reason:'NOT_DISPATCHED_CRON_BACKSTOP',
  dispatchAccepted:0,dispatchAcknowledged:false,
  workerStarted:false,sourceWriteVerified:false,liveVerified:false,
  executorId:null,workerTaskKey:null,errorTaskId:null};
 const next={...prior,state:'DISPATCH_ACCEPTED_NOT_WORKER_STARTED',
  reason:'EXACT_HEAD_DISPATCH_RECEIPT_CONFIRMED',
  dispatchAccepted:1,dispatchAcknowledged:true,
  executorId:'github-actions:hh-pr-repair-worker.yml',
  workerTaskKey:'b'.repeat(32),errorTaskId:coreErrorTaskId(123,SHA,456,1)};
 a.equal(fn(prior,next),true);
 for(const allowed of ['TASK_WAITING_FOR_DISPATCH','DISPATCH_UNCONFIRMED_RECONCILE',
   'TASK_AWAITING_EXISTING_RECOVERY'])a.equal(fn({...prior,state:allowed},next),true);
 for(const changed of [
  {...prior,state:'TASK_ROUTED_TO_REVIEW'},
  {...prior,state:'DISPATCH_ACCEPTED_NOT_WORKER_STARTED',dispatchAccepted:1},
  {...prior,dispatchAcknowledged:true},
  {...prior,executorId:'github-actions:hh-pr-repair-worker.yml'},
  {...prior,workerStarted:true},
  {...prior,sourceWriteVerified:true}
 ])a.equal(fn(changed,next),false);
 for(const changed of [
  {...next,headSha:'c'.repeat(40)},{...next,prNumber:124},
  {...next,runId:457},{...next,inboxId:'b'.repeat(36)},
  {...next,category:'SOURCE_CODE'},
  {...next,workerStarted:true},{...next,sourceWriteVerified:true},
  {...next,dispatchAccepted:0},{...next,dispatchAcknowledged:false},
  {...next,executorId:'fake'},
  {...next,workerTaskKey:'invalid'}, {...next,errorTaskId:'invalid'}
 ])a.equal(fn(prior,changed),false);
 a.equal(fn(next,prior),false,'no 1→0 downgrade even if a late backstop arrives');
});

test('accepted dispatch upgrades one row under row lock, archives previous state and creates a distinct chat receipt',()=>{
 const edge=fs.readFileSync('supabase/functions/agent-commander-private-store-v1/index.ts','utf8');
 const begin=edge.indexOf('async function receiveCommanderCiRoute(req,origin){');
 const end=edge.indexOf('\nasync function handler(req){',begin);
 const code=edge.slice(begin,end);
 a.match(code,/select ci_event_id,repository,workflow_run_id.*for update/s);
 a.match(code,/if\(!isMonotonicCiDispatchUpgrade\(prior,record\)\)/);
 a.match(code,/record\.previousRouteState=prior\.state/);
 a.match(code,/record\.previousRouteReason=prior\.reason/);
 a.match(code,/and route_receipt=\$4::text::jsonb returning ci_event_id/);
 a.match(code,/and route_receipt is null returning ci_event_id/);
 a.match(code,/CI_ROUTE_CONCURRENT_WRITE_ABORTED/);
 a.match(code,/prior\?":dispatch-accepted":""/);
 a.match(code,/UPGRADED_TO_DISPATCH_ACCEPTED/);
 a.match(code,/exactCoreFailureTaskId\(e\)/);
 a.match(code,/verifyGitHubActionsOidc\(req\)/);
 a.match(code,/ROUTE_RECEIPT_IMMUTABLE_CONFLICT/);
 const list=edge.split('if(action==="commander_list_ci_events"){')[1]?.split('if(action==="commander_list_model_preferences"){')[0]||'';
 a.match(list,/assignment_receipt,route_receipt,route_recorded_at/);
 a.match(list,/where inbox_owner_id=\$3::uuid/);
});
