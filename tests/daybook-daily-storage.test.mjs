import test from 'node:test'
import assert from 'node:assert/strict'
import {dailyDayKey,sealDailyIntention,readDailyIntention} from '../lib/app/daybook-daily-storage.mjs'
const owner='550e8400-e29b-41d4-a716-446655440000',other='550e8400-e29b-41d4-a716-446655440001',id='550e8400-e29b-41d4-a716-446655440002'
const config={encryptionKey:Buffer.alloc(32,9),encryptionKeyId:'synthetic'}
const input={id,operationId:other,revision:0,localDay:'2026-11-22',timezone:'America/Toronto',weeklyGoalId:other,actionIds:[owner],carriedActionIds:[],carryFromDay:null,confirmed:true}
test('daily lookup uses account-bound keyed digest rather than plaintext date',()=>{
 const key=dailyDayKey(owner,input.localDay,config)
 assert.match(key,/^[a-f0-9]{64}$/);assert.notEqual(key,dailyDayKey(other,input.localDay,config))
 assert.notEqual(key,dailyDayKey(owner,'2026-11-23',config));assert.throws(()=>dailyDayKey(owner,'2026-02-30',config))
})
test('daily payload conceals dates and selected IDs, binds owner/record/revision and omits operation receipt',()=>{
 const ciphertext=sealDailyIntention(owner,input,1,config)
 for(const value of [input.localDay,input.timezone,input.weeklyGoalId,input.actionIds[0]])assert.equal(ciphertext.includes(value),false)
 const row={id,revision:1,payload_ciphertext:ciphertext,day_key:dailyDayKey(owner,input.localDay,config)}
 const restored=readDailyIntention(owner,row,config)
 assert.deepEqual(restored,{...Object.fromEntries(Object.entries(input).filter(([key])=>key!=='operationId')),revision:1})
 assert.throws(()=>readDailyIntention(other,row,config))
 assert.throws(()=>readDailyIntention(owner,{...row,id:other},config))
 assert.throws(()=>readDailyIntention(owner,{...row,revision:2},config))
 assert.throws(()=>readDailyIntention(owner,{...row,day_key:dailyDayKey(owner,'2026-11-23',config)},config))
})
