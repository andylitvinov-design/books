'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const rules=require('../scripts/ci-pr-error-rules.v1.json');
const {persistReadOnlyRoute,REVIEW_ONLY}=require('../scripts/ci-pr-readonly-route-intake.cjs');

const REPO='andylitvinov-design/books';
const HEAD='a'.repeat(40);
const INBOX='12341234-1234-4234-8234-123412341234';
const context={
 repo:{owner:'andylitvinov-design',repo:'books'},
 eventName:'workflow_run',ref:'refs/heads/codex/bootstrap-books',
 payload:{workflow_run:{
   id:42866812969,run_attempt:1,name:'HH PR core release gate',
   path:'.github/workflows/hh-pr-core-release.yml@refs/heads/codex/bootstrap-books',
   event:'pull_request',status:'completed',conclusion:'failure',
   repository:{full_name:REPO},head_repository:{full_name:REPO},
   head_branch:'fix/exact',head_sha:'b'.repeat(40),
   pull_requests:[{number:4217,head:{sha:HEAD}}]
 }}
};
const receipt=(category)=>({
 accepted:true,association:'AUTO_TASK_CREATED_NOT_DISPATCHED',
 inboxId:INBOX,prNumber:4217,headSha:HEAD,headRef:'fix/exact',
 runId:42866812969,category,
 classification:{
  schema:'HH_CI_ERROR_CLASSIFICATION_V1',ruleset_version:rules.version,
  category,confidence:0.98,status:'DIAGNOSTIC_ONLY',
  source_write_authorized:false,execution_authorized:false,
  responsible_role:rules.categories[category].responsible_role,
  recommended_status:rules.categories[category].recommended_status,
  requires_human:rules.categories[category].requires_human,
  retry:{allowed:rules.categories[category].retry.allowed,
   max_attempts:rules.categories[category].retry.max_attempts}
 }
});
test('every non-writing error category saves a real route on independent intake without dispatch',async()=>{
 assert.equal(REVIEW_ONLY.size,9);
 for(const category of REVIEW_ONLY){
  let seen=0,decision;
  const r=await persistReadOnlyRoute({receipt:receipt(category),context,github:{},
   core:{},oidcToken:'test-token-not-used-by-injected-sender',
   sendFn:async payload=>{seen++;decision=payload.routeResult;return {sent:true};}});
  assert.equal(r.outcome,'READONLY_ROUTE_RECORDED',category);
  assert.equal(r.recorded,true,category);
  assert.equal(seen,1,category);
  assert.ok(['TASK_REQUIRES_REVIEW','TASK_ROUTED_TO_REVIEW'].includes(r.routeState),category);
  assert.equal(decision.prNumber,4217);
  assert.equal(decision.dispatchAccepted,0);
  assert.equal(decision.dispatchAcknowledged,false);
  assert.equal(decision.workerStarted,false);
  assert.equal(decision.sourceWriteVerified,false);
  assert.equal(decision.liveVerified,false);
 }
});
test('source, TS, base and infrastructure errors stay in existing guarded writer',async()=>{
 for(const category of ['SOURCE_CODE','TYPESCRIPT','BASE_ADVANCED','INFRASTRUCTURE']){
  let called=false;
  const r=await persistReadOnlyRoute({receipt:receipt(category),context,
   sendFn:async()=>{called=true;throw Error('NOT_ALLOWED');}});
  assert.equal(r.outcome,'DEFERRED_TO_GUARDED_SINGLE_WRITER');
  assert.equal(r.attempted,false);
  assert.equal(called,false);
 }
});
test('forged association, category, HEAD and non-readonly state are refused before OIDC route callback',async()=>{
 const good=receipt('UNKNOWN');
 for(const bad of [
   {...good,association:'UNMATCHED'},
   {...good,headSha:'c'.repeat(40)},
   {...good,classification:{...good.classification,category:'SECURITY'}},
   {...good,classification:{...good.classification,execution_authorized:true}}
 ]){
  let called=false;
  await assert.rejects(()=>persistReadOnlyRoute({receipt:bad,context,
   sendFn:async()=>{called=true;return {sent:true};}}),
  /CI_READONLY_ROUTE_POLICY_NOT_PROVEN/);
  assert.equal(called,false);
 }
 await assert.rejects(()=>persistReadOnlyRoute({receipt:good,context,
  routeFn:async()=>({state:'DISPATCH_ACCEPTED_NOT_WORKER_STARTED',
   dispatchAccepted:1,dispatchAcknowledged:true,
   prNumber:4217,runId:good.runId,category:'UNKNOWN',
   workerStarted:false,sourceWriteVerified:false,liveVerified:false}),
  sendFn:async()=>{throw Error('should not send');}}),
 /CI_READONLY_ROUTE_POLICY_NOT_PROVEN/);
});
test('lost or rejected OIDC callback fails visibly without blind retry',async()=>{
 let calls=0;
 await assert.rejects(()=>persistReadOnlyRoute({receipt:receipt('UNKNOWN'),context,
  sendFn:async()=>{calls++;return {sent:false,reason:'DELIVERY_UNCONFIRMED_NO_BLIND_RETRY'};}}),
 /CI_READONLY_ROUTE_RECEIPT_NOT_CONFIRMED/);
 assert.equal(calls,1);
});
test('read-only callback precedes branch-isolated guarded source stage in same workflow',()=>{
 const yml=fs.readFileSync('.github/workflows/hh-pr-direct-core-failure.yml','utf8');
 const intake=yml.split('  ci_event_intake:\n')[1]?.split('  direct-core-failure:\n')[0];
 const writer=yml.split('  direct-core-failure:\n')[1]?.split('  core-slot-wakeup:\n')[0];
 assert.ok(intake&&writer);
 assert.match(intake,/persistReadOnlyRoute\(/);
 assert.match(intake,/ci-pr-readonly-route-intake\.cjs/);
 assert.doesNotMatch(intake,/createWorkflowDispatch|hh-control-tower-single-writer/);
 assert.match(writer,/group: hh-direct-core-pr-/);
 assert.match(writer,/github\.event\.workflow_run\.head_branch/);
 assert.match(writer,/cancel-in-progress: false/);
 assert.doesNotMatch(writer,/group: hh-control-tower-single-writer/);
 assert.match(writer,/ci-pr-event-handoff\.cjs/);
 assert.match(writer,/sendCommanderCiRoute/);
});
