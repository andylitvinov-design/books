'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(
  'supabase/functions/agent-commander-private-store-v1/index.ts','utf8');
test('OIDC route states map into the physical Postgres chat execution enum',()=>{
 const match=source.match(/const CI_ROUTE_CHAT_STATE=Object\.freeze\((\{[\s\S]*?\})\);/);
 assert.ok(match,'route -> chat state map required');
 const map=JSON.parse(match[1]);
 const routes=[
  'TASK_REQUIRES_REVIEW','TASK_ROUTED_TO_REVIEW','TASK_AWAITING_EXISTING_RECOVERY',
  'EXISTING_RECOVERY_ACCEPTED','DISPATCH_ACCEPTED_NOT_WORKER_STARTED',
  'TASK_WAITING_FOR_DISPATCH','DISPATCH_UNCONFIRMED_RECONCILE'
 ];
 assert.deepEqual(Object.keys(map).sort(),routes.sort());
 for(const chatState of Object.values(map))
   assert.ok(new Set(['BLOCKED','AWAITING_EXECUTOR_NOT_DISPATCHED',
     'DISPATCHED_UNVERIFIED']).has(chatState),chatState);
 assert.equal(map.DISPATCH_ACCEPTED_NOT_WORKER_STARTED,'DISPATCHED_UNVERIFIED');
 assert.equal(map.TASK_WAITING_FOR_DISPATCH,'AWAITING_EXECUTOR_NOT_DISPATCHED');
 assert.equal(map.TASK_REQUIRES_REVIEW,'BLOCKED');
});
test('route receipts remain exact and worker claims are never fabricated',()=>{
 assert.match(source,/CI_ROUTE_CHAT_STATE\[p\.state\],chats\[0\]\.chat_id/);
 assert.doesNotMatch(source,/\[p\.state,chats\[0\]\.chat_id/);
 assert.match(source,/execution_state in \('COMPLETED_UNVERIFIED','SOURCE_VERIFIED'\)/);
 assert.match(source,/route_receipt/);
 assert.match(source,/workerStarted:false,sourceWriteVerified:false,liveVerified:false/);
 assert.match(source,/assignment_receipt,route_recorded_at/);
});