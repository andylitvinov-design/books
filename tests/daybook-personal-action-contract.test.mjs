import test from 'node:test'
import assert from 'node:assert/strict'
import {personalActionWrite,personalActionDelete,actionTransition} from '../lib/app/daybook-personal-action-contract.mjs'
const id='550e8400-e29b-41d4-a716-446655440000'
const action={id,goalId:id,operationId:id,revision:0,description:'Draft one paragraph',timing:'After breakfast',trigger:'Open my notebook',obstacle:'Low energy',fallback:'Write one sentence',feasibilityScore:7,dueAt:'2026-11-23T14:00:00.000Z',status:'accepted',confirmed:true}
test('client-authored steps preserve wording and optional planning details',()=>{
 assert.deepEqual(personalActionWrite(action),action)
 assert.equal(personalActionWrite({...action,dueAt:null,feasibilityScore:null}).dueAt,null)
})
test('rejects source/owner forgery, unsupported states, invalid timestamps and excessive text',()=>{
 for(const delta of [{accountId:id},{sourceReportId:id},{clientConfirmedAt:'now'},{completedAt:'now'},{revision:-1},{description:''},{description:'x'.repeat(2001)},{obstacle:'x'.repeat(2001)},{feasibilityScore:11},{feasibilityScore:2.5},{dueAt:'tomorrow'},{dueAt:'2026-02-30T14:00:00.000Z'},{status:'in_progress'},{confirmed:'yes'}])assert.throws(()=>personalActionWrite({...action,...delta}))
})
test('only explicit client confirmation can accept activate or complete; completion is deliberate',()=>{
 for(const next of ['accepted','active','completed','deferred','declined','cancelled'])assert.throws(()=>actionTransition('proposed',next,false))
 assert.equal(actionTransition(null,'proposed',false),'proposed')
 assert.equal(actionTransition(null,'accepted',true),'accepted')
 assert.equal(actionTransition('accepted','completed',true),'completed')
 assert.equal(actionTransition('active','completed',true),'completed')
 assert.equal(actionTransition('completed','active',true),'active')
 assert.throws(()=>actionTransition(null,'completed',true))
 assert.throws(()=>actionTransition('proposed','completed',true))
 assert.throws(()=>actionTransition('unknown','active',true))
})
test('deletion requires an explicit positive revision and an opaque operation identity',()=>{
 const input={id,operationId:id,revision:1,confirmed:true}
 assert.deepEqual(personalActionDelete(input),input)
 for(const delta of [{confirmed:false},{revision:0},{revision:'1'},{accountId:id},{operationId:'bad'}])assert.throws(()=>personalActionDelete({...input,...delta}))
})
