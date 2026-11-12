import test from 'node:test';
import assert from 'node:assert/strict';
import {
 proposeMemory,confirmMemory,canRecall,selectRecall,selectClientTasks,
 transitionTask,memoryCoreVersion,
} from '../lib/holistic-support/client-memory-core.mjs';
const A='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const B='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const M='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const R='dddddddd-dddd-4ddd-dddd-dddddddddddd';
const O='eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee';
const NOW='2026-11-06T15:45:00Z';
const consent={memory_enabled:true,sensitive_enabled:false};
const ctx={accountId:A,verifiedAccountId:A,consent,risk:'clear'};
const proposal=proposeMemory({accountId:A,category:'goal',value:'Хочу спокойнее проводить встречи',now:NOW});
const confirmed=confirmMemory(proposal,{accountId:A,consent,userConfirmed:true,
 recordId:R,operationId:O,now:NOW});
const uuid=(n)=>`${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-a${n.repeat(3)}-${n.repeat(12)}`;

test('no silent memory: proposal is ephemeral; consent and explicit click both required',()=>{
 assert.equal(memoryCoreVersion,'2.0.0-reference');
 assert.equal(proposal.persistent,false);
 assert.equal(proposal.status,'proposal');
 assert.throws(()=>confirmMemory(proposal,{accountId:A,consent,recordId:R,operationId:O,now:NOW}),/CONFIRMATION_REQUIRED/);
 assert.throws(()=>confirmMemory(proposal,{accountId:A,consent:{memory_enabled:false},userConfirmed:true,recordId:R,operationId:O,now:NOW}),/MEMORY_CONSENT_REQUIRED/);
 assert.throws(()=>confirmMemory(proposal,{accountId:B,consent,userConfirmed:true,recordId:R,operationId:O,now:NOW}),/MEMORY_IDENTITY_OR_PAYLOAD_INVALID/);
 assert.equal(confirmed.confidence,'client_confirmed');
 assert.equal(confirmed.status,'confirmed');
 assert.equal(confirmed.accountId,A);
 assert.equal(confirmed.revision,0);
});
test('sensitive memory requires independently granted consent and expires earlier',()=>{
 const p=proposeMemory({accountId:A,category:'boundary',privacyClass:'sensitive',value:'Личная граница',now:NOW});
 assert.throws(()=>confirmMemory(p,{accountId:A,consent,userConfirmed:true,recordId:R,operationId:O,now:NOW}),/SENSITIVE_CONSENT_REQUIRED/);
 const s=confirmMemory(p,{accountId:A,consent:{...consent,sensitive_enabled:true},userConfirmed:true,recordId:R,operationId:O,now:NOW});
 assert.ok(Date.parse(s.expiresAt)-Date.parse(s.confirmedAt) < Date.parse(confirmed.expiresAt)-Date.parse(confirmed.confirmedAt));
 assert.equal(selectRecall([s],ctx,{now:NOW}).length,0);
 assert.equal(selectRecall([s],{...ctx,consent:{...consent,sensitive_enabled:true}},{now:NOW}).length,1);
});
test('recall rejects guests, stopped, risk, unlinked Telegram, other user and revoked consent',()=>{
 const one=[confirmed];
 for(const bad of [
   {...ctx,guest:true},{...ctx,stopped:true},{...ctx,risk:'human_review'},
   {...ctx,verifiedAccountId:null},{...ctx,verifiedAccountId:B},
   {...ctx,consent:{memory_enabled:false}},
 ]){
  assert.equal(canRecall(bad),false);
  assert.deepEqual(selectRecall(one,bad,{now:NOW}),[]);
 }
 assert.deepEqual(selectRecall([confirmed],{...ctx,accountId:B,verifiedAccountId:B},{now:NOW}),[]);
});
test('memory boundaries outrank goals; expired, archived and future records excluded',()=>{
 const base={...confirmed,expiresAt:'2027-01-01T00:00:00Z'};
 const items=[
  {...base,id:uuid('1'),category:'resource',value:'Писать короткие заметки'},
  {...base,id:uuid('2'),category:'boundary',value:'Не предлагать дыхательные упражнения'},
  {...base,id:uuid('3'),category:'goal',value:'Встречаться увереннее'},
  {...base,id:uuid('4'),status:'archived'},
  {...base,id:uuid('5'),expiresAt:'2026-11-01T00:00:00Z'},
  {...base,id:uuid('6'),confirmedAt:'2026-12-01T00:00:00Z'},
  {...base,id:uuid('7'),accountId:B},
 ];
 assert.deepEqual(selectRecall(items,ctx,{now:NOW}).map(x=>x.category),['boundary','goal','resource']);
 assert.equal(selectRecall(items,ctx,{now:NOW,max:1}).length,1);
 assert.throws(()=>selectRecall(items,ctx,{now:NOW,max:200}),/INVALID_RECALL/);
});
test('no task in non-consented context; only accepted own assignments',()=>{
 const list=[
  {id:uuid('1'),clientAccountId:A,status:'offered',dueOn:'2026-11-10'},
  {id:uuid('2'),clientAccountId:B,status:'accepted',dueOn:'2026-11-09'},
  {id:uuid('3'),clientAccountId:A,status:'accepted',dueOn:'2026-11-10'},
  {id:uuid('4'),clientAccountId:A,status:'self_reported',dueOn:'2026-11-08'},
  {id:uuid('5'),clientAccountId:A,status:'declined',dueOn:'2026-11-07'},
 ];
 assert.deepEqual(selectClientTasks(list,ctx).map(x=>x.id),[uuid('4'),uuid('3')]);
 assert.deepEqual(selectClientTasks(list,{...ctx,stopped:true}),[]);
});
test('master-offered → client accepted → self reported → authorized master review, never auto-completed',()=>{
 const seed={id:R,clientAccountId:A,practitionerAccountId:M,origin:'master_assignment',
   status:'offered',revision:0};
 const accepted=transitionTask(seed,{actorAccountId:A,actorRole:'client',action:'accept',
   expectedRevision:0,operationId:uuid('1'),now:NOW});
 assert.equal(accepted.task.status,'accepted');
 assert.equal(accepted.event.kind,'accepted');
 const reported=transitionTask(accepted.task,{actorAccountId:A,actorRole:'client',action:'self_report',
   expectedRevision:1,operationId:uuid('2'),now:NOW});
 assert.equal(reported.task.status,'self_reported');
 const reviewed=transitionTask(reported.task,{actorAccountId:M,actorRole:'master',authorizedMaster:true,
  action:'review',expectedRevision:2,operationId:uuid('3'),now:NOW});
 assert.equal(reviewed.task.status,'reviewed');
 assert.equal(reviewed.task.revision,3);
 assert.equal(transitionTask(accepted.task,{actorAccountId:A,actorRole:'client',action:'accept',expectedRevision:0,operationId:uuid('1'),now:NOW}).duplicate,true);
});
test('idempotency only for same action and actor; stale revision is rejected',()=>{
 const t={id:R,clientAccountId:A,practitionerAccountId:M,origin:'master_assignment',status:'offered',revision:0};
 const input={actorAccountId:A,actorRole:'client',action:'accept',expectedRevision:0,operationId:uuid('1'),now:NOW};
 const once=transitionTask(t,input);
 const again=transitionTask(once.task,input);
 assert.equal(again.duplicate,true);
 assert.equal(again.event,null);
 assert.throws(()=>transitionTask(once.task,{...input,action:'decline'}),/IDEMPOTENCY_CONFLICT/);
 assert.throws(()=>transitionTask(once.task,{...input,operationId:uuid('2')}),/STALE_REVISION/);
});
test('impersonation and master/client role crossover rejected',()=>{
 const t={id:R,clientAccountId:A,practitionerAccountId:M,origin:'master_assignment',status:'offered',revision:0};
 assert.throws(()=>transitionTask(t,{actorAccountId:B,actorRole:'client',action:'accept',expectedRevision:0,operationId:uuid('1')}),/TASK_FORBIDDEN/);
 assert.throws(()=>transitionTask(t,{actorAccountId:M,actorRole:'master',action:'cancel',expectedRevision:0,operationId:uuid('2')}),/TASK_FORBIDDEN/);
 assert.throws(()=>transitionTask(t,{actorAccountId:A,actorRole:'client',action:'review',expectedRevision:0,operationId:uuid('3')}),/TASK_FORBIDDEN/);
 assert.throws(()=>transitionTask({...t,status:'accepted'}, {actorAccountId:M,actorRole:'master',authorizedMaster:true,action:'self_report',expectedRevision:0,operationId:uuid('4')}),/TASK_FORBIDDEN/);
});
test('decline, revisions and non-master self-commitment are separate states',()=>{
 const master={id:R,clientAccountId:A,practitionerAccountId:M,origin:'master_assignment',status:'offered',revision:0};
 const declined=transitionTask(master,{actorAccountId:A,actorRole:'client',action:'decline',expectedRevision:0,operationId:uuid('1'),now:NOW});
 assert.equal(declined.task.status,'declined');
 assert.throws(()=>transitionTask(declined.task,{actorAccountId:M,actorRole:'master',authorizedMaster:true,action:'review',expectedRevision:1,operationId:uuid('2')}),/INVALID_TASK_STATE/);
 const own={id:R,clientAccountId:A,practitionerAccountId:null,origin:'client_commitment',status:'proposed',revision:0};
 const accepted=transitionTask(own,{actorAccountId:A,actorRole:'client',action:'accept',expectedRevision:0,operationId:uuid('3'),now:NOW});
 assert.equal(accepted.task.status,'accepted');
});
test('no medical inference or record silently added to result; answer-safe structures',()=>{
 assert.equal(Object.hasOwn(confirmed,'diagnosis'),false);
 assert.equal(Object.hasOwn(confirmed,'sharedWithMaster'),false);
 assert.throws(()=>proposeMemory({accountId:A,category:'invalid',value:'a',now:NOW}),/INVALID_MEMORY_PROPOSAL/);
 assert.throws(()=>proposeMemory({accountId:A,category:'goal',value:'',now:NOW}),/INVALID_MEMORY_PROPOSAL/);
});

test('sensitive health disclosure requires separate opt-in classification',async()=>{
 const {proposeMemory,likelySensitiveDisclosure}=await import('../lib/holistic-support/client-memory-core.mjs')
 const accountId='11111111-1111-4111-8111-111111111111'
 assert.equal(likelySensitiveDisclosure('Мне поставили диагноз'),true)
 assert.equal(likelySensitiveDisclosure('I want to set a goal'),false)
 assert.throws(()=>proposeMemory({accountId,category:'goal',value:'У меня диагноз'}),/SENSITIVE_DATA_REQUIRES_SPECIAL_CONSENT/)
 assert.equal(proposeMemory({accountId,category:'goal',value:'У меня диагноз',privacyClass:'sensitive'}).privacyClass,'sensitive')
})
