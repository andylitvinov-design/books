import test from 'node:test'
import assert from 'node:assert/strict'
import {dailyIntentionWrite,resolveDailyIntention,carryoverActions} from '../lib/app/daybook-daily-contract.mjs'
const id='550e8400-e29b-41d4-a716-446655440000',goal='550e8400-e29b-41d4-a716-446655440001',action='550e8400-e29b-41d4-a716-446655440002'
const draft=(changes={})=>({id,operationId:id,revision:0,localDay:'2026-11-22',timezone:'America/Toronto',weeklyGoalId:goal,actionIds:[action],carriedActionIds:[],carryFromDay:null,confirmed:true,...changes})
const plan=()=>({goals:[{id:goal,status:'active'}],actions:[{id:action,goalId:goal,status:'active',clientConfirmedAt:'2026-11-22T12:00:00Z'}]})
test('daily choices retain only explicit canonical IDs and allow an empty day',()=>{
 assert.deepEqual(dailyIntentionWrite(draft()),draft())
 assert.deepEqual(resolveDailyIntention(draft(),plan()),draft())
 assert.deepEqual(resolveDailyIntention(draft({weeklyGoalId:null,actionIds:[]}),plan()).actionIds,[])
})
test('daily write rejects ownership injection, invalid dates, duplicates, more than three and unconfirmed carryover',()=>{
 for(const value of [draft({accountId:id}),draft({localDay:'2026-02-30'}),draft({timezone:'not-a-zone'}),draft({actionIds:[action,action]}),draft({actionIds:[id,goal,action,'550e8400-e29b-41d4-a716-446655440003']}),draft({carryFromDay:'2026-11-22'}),draft({carryFromDay:'2026-11-21',confirmed:false})])assert.throws(()=>dailyIntentionWrite(value))
 assert.equal(dailyIntentionWrite(draft({carryFromDay:'2026-11-21',carriedActionIds:[action]})).carryFromDay,'2026-11-21')
})
test('daily selection never accepts proposed, unconfirmed, unknown or other-goal actions',()=>{
 for(const change of [{status:'proposed'},{clientConfirmedAt:null},{goalId:id},{status:'completed'},{status:'deferred'}]){
  const value=plan();Object.assign(value.actions[0],change)
  assert.throws(()=>resolveDailyIntention(draft(),value))
 }
 assert.throws(()=>resolveDailyIntention(draft(),{goals:[],actions:[]}))
 const proposed=plan();proposed.goals[0].status='proposed';assert.throws(()=>resolveDailyIntention(draft(),proposed))
})
test('editing a day can retain its completed selections without adding new completed work',()=>{
 const value=plan();value.actions[0].status='completed';value.goals[0].status='completed'
 assert.equal(resolveDailyIntention(draft(),value,{...draft(),revision:1}).actionIds[0],action)
 assert.throws(()=>resolveDailyIntention(draft(),value,{...draft(),localDay:'2026-11-21',revision:1}))
})
test('carryover offers only still-open previously chosen confirmed actions without mutating either day',()=>{
 const source=draft({localDay:'2026-11-21'}),value=plan(),before=JSON.stringify({source,value})
 assert.deepEqual(carryoverActions(source,value),[action]);assert.equal(JSON.stringify({source,value}),before)
 value.actions[0].status='completed';assert.deepEqual(carryoverActions(source,value),[])
 value.actions[0].status='proposed';assert.deepEqual(carryoverActions(source,value),[])
})
test('carryover provenance permits additional newly chosen priorities',()=>{
 const fresh='550e8400-e29b-41d4-a716-446655440003'
 assert.deepEqual(dailyIntentionWrite(draft({actionIds:[action,fresh],carriedActionIds:[action],carryFromDay:'2026-11-21'})).carriedActionIds,[action])
 for(const change of [{carriedActionIds:[action]},{carriedActionIds:[goal],carryFromDay:'2026-11-21'},{carriedActionIds:[],carryFromDay:'2026-11-21'},{carriedActionIds:[action,action],carryFromDay:'2026-11-21'}])assert.throws(()=>dailyIntentionWrite(draft(change)))
})
