import test from 'node:test'
import assert from 'node:assert/strict'
import {goalSnapshot,readGoalSnapshot} from '../lib/app/daybook-goal-snapshot.mjs'
import {seal,openSealed} from '../lib/app/crypto.js'
const id='550e8400-e29b-41d4-a716-446655440000',account='550e8400-e29b-41d4-a716-446655440001'
const input={id,operationId:id,revision:0,areaKey:'meaning_purpose',title:'Synthetic goal',why:'Synthetic reason',desiredOutcome:'A manuscript',axes:['self-realization'],status:'active',confirmed:true,targetDate:null,milestones:[],firstStep:'Write for 15 minutes',fallbackStep:'Write one line'}
const meta={revision:1,requestFingerprint:'a'.repeat(64),confirmedAt:'2026-11-22T12:00:00Z'}
test('audit snapshot retains complete goal details without a second goal table or transient operation ID',()=>{
 const snapshot=goalSnapshot(input,meta)
 assert.equal(snapshot.kind,'personal-goal-v1')
 assert.equal(Object.hasOwn(snapshot.goal,'operationId'),false)
 const goal=readGoalSnapshot(snapshot,{id,revision:1})
 assert.equal(goal.why,input.why)
 assert.equal(goal.revision,1)
 assert.equal(Object.hasOwn(goal,'requestFingerprint'),false)
 assert.equal(readGoalSnapshot({oldFormat:true},{id,revision:1}),null)
})
test('mismatched goal/revision, malformed metadata and unknown snapshot fields fail closed',()=>{
 const snapshot=goalSnapshot(input,meta)
 for(const changed of [{revision:2},{requestFingerprint:'x'},{confirmedAt:'invalid'}])assert.throws(()=>goalSnapshot(input,{...meta,...changed}))
 assert.throws(()=>readGoalSnapshot(snapshot,{id:account,revision:1}))
 assert.throws(()=>readGoalSnapshot(snapshot,{id,revision:2}))
 assert.throws(()=>readGoalSnapshot({...snapshot,accountId:account},{id,revision:1}))
})
test('existing audit encryption context conceals details and binds them to the account and audit record',()=>{
 const config={encryptionKey:Buffer.alloc(32,8),encryptionKeyId:'synthetic-test'}
 const ctx={accountId:account,recordId:id,field:'coaching.life_plan_change'}
 const snapshot=goalSnapshot(input,meta),cipher=seal(snapshot,ctx,config)
 assert.equal(cipher.includes(input.why),false)
 assert.equal(readGoalSnapshot(openSealed(cipher,ctx,config),{id,revision:1}).title,input.title)
 assert.throws(()=>openSealed(cipher,{...ctx,accountId:id},config),{code:'PRIVATE_DATA_UNAVAILABLE'})
})
