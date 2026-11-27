import test from 'node:test'
import assert from 'node:assert/strict'
import {planCoachStageMemory,adviseCoachStageMemory} from '../lib/coaching/coach-memory-stage-plan.mjs'
const A='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
const R='cccccccc-cccc-4ccc-8ccc-cccccccccccc',P='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const now=Date.parse('2026-11-27T22:00:00Z')
const ctx={accountId:A,courseRunId:R,sessionProtocolId:P,mode:'coaching',stageId:'resources',
 active:true,sessionAccepted:true,focusConfirmed:true,safety:'clear',consentEpoch:2,
 provider:'groq',policyVersion:'p1',now}
const fields=[{id:'goal',type:'goal_statement',state:'confirmed_current'},
 {id:'resources',type:'resource',state:'not_recorded'},
 {id:'boundary',type:'client_statement',state:'skipped_by_client'}]
const item={accountId:A,courseRunId:R,sessionProtocolId:P,mode:'coaching',consentEpoch:2,
 fieldId:'resources',type:'resource',status:'active',evidenceStatus:'client_confirmed',temporalStatus:'historical',
 providerShareable:true,sourceVerified:true,grantVerified:true,sourceRevision:'1',currentSourceRevision:'1',
 provider:'groq',policyVersion:'p1',grantExpiresAt:now+1000,observedAt:'2026-11-22T22:00:00Z',value:'PRIVATE VALUE'}
test('stage plan only requests missing fields and preserves skipped/current checkpoints',()=>{
 const x=planCoachStageMemory(ctx,fields)
 assert.equal(x.status,'needed');assert.deepEqual(x.query.fieldIds,['resources'])
 assert.deepEqual(x.query.types,['resource']);assert.equal(x.query.timeScope,'history')
 assert.equal(planCoachStageMemory(ctx,[fields[0],fields[2]]).status,'not_needed')
 for(const patch of [{mode:'unknown'},{courseRunId:null},{sessionProtocolId:null},{active:false},
  {sessionAccepted:false},{focusConfirmed:false},{safety:'unsafe'},{consentEpoch:-1},{provider:'unknown'},{now:NaN}])
  assert.equal(planCoachStageMemory({...ctx,...patch},fields).status,'not_authorized')
 assert.throws(()=>planCoachStageMemory(ctx,[fields[0],fields[0]]))
})
test('old authorized evidence is advisory, never closes a current checkpoint',()=>{
 const x=adviseCoachStageMemory(ctx,fields,[item])
 assert.equal(x.status,'ask_or_confirm');assert.equal(x.fields[1].state,'confirmed_historical')
 assert.deepEqual(x.nextField,{id:'resources',requiresCurrentConfirmation:true})
 assert.equal(x.fields[0].state,'confirmed_current')
 assert.equal(x.fields[2].state,'skipped_by_client')
 assert.doesNotMatch(JSON.stringify(x),/PRIVATE VALUE/)
})
test('deny foreign, owner-only, stale, unverified or wrong mode/provider/run evidence',()=>{
 for(const patch of [{accountId:B},{mode:'therapy'},{courseRunId:B},{sessionProtocolId:B},
  {consentEpoch:1},{provider:'gemini_free'},{policyVersion:'p0'},{providerShareable:false},
  {grantVerified:false},{sourceVerified:false},{status:'blocked'},{evidenceStatus:'ai_hypothesis'},
  {temporalStatus:'current'},{currentSourceRevision:'2'},{grantExpiresAt:now},
  {observedAt:'2027-01-01T00:00:00Z'}]){
  const x=adviseCoachStageMemory(ctx,fields,[{...item,...patch}])
  assert.equal(x.fields[1].state,'not_recorded');assert.equal(x.nextField.requiresCurrentConfirmation,false)
 }
 assert.equal(adviseCoachStageMemory(ctx,fields,[{...item,conflicting:true}]).fields[1].state,'stale_or_conflicting')
})
