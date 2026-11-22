import test from 'node:test'
import assert from 'node:assert/strict'
import {personalGoalWrite,personalGoalDelete,goalTransition} from '../lib/app/daybook-personal-goal-contract.mjs'
const id='550e8400-e29b-41d4-a716-446655440000'
const goal={id,operationId:id,revision:0,areaKey:'meaning_purpose',title:'Write a book',why:'Share what I learned',desiredOutcome:'A reviewed manuscript',axes:['realization'],status:'active',confirmed:true,targetDate:null,milestones:[{id,title:'First chapter',completed:false}],firstStep:'Draft for 15 minutes',fallbackStep:'Write one sentence'}
test('personal goal preserves owner wording, optional deadline and separate inner axes',()=>{
 assert.deepEqual(personalGoalWrite(goal),goal)
 assert.equal(personalGoalWrite({...goal,axes:[],milestones:[],targetDate:'2028-02-29'}).targetDate,'2028-02-29')
})
test('invalid fields, forged ownership and malformed milestones are rejected',()=>{
 for(const delta of [{accountId:id},{revision:-1},{title:''},{areaKey:'anchor'},{axes:['body_health']},{axes:['realization','realization']},{targetDate:'2026-02-29'},{targetDate:'tomorrow'},{milestones:[{id,title:'x',completed:'yes'}]},{milestones:[{id,title:'x',completed:false},{id,title:'y',completed:false}]},{milestones:[{id,title:'x',completed:false,aiApproved:true}]},{firstStep:'x'.repeat(2001)}])assert.throws(()=>personalGoalWrite({...goal,...delta}))
})
test('acceptance, activation and completion require explicit client confirmation',()=>{
 for(const target of ['accepted','active','completed','deferred','declined'])assert.throws(()=>goalTransition('proposed',target,false))
 assert.equal(goalTransition(null,'proposed',false),'proposed')
 assert.equal(goalTransition('proposed','accepted',true),'accepted')
 assert.equal(goalTransition('active','completed',true),'completed')
 assert.throws(()=>goalTransition(null,'completed',true))
 assert.throws(()=>goalTransition('proposed','completed',true))
 assert.throws(()=>goalTransition('completed','proposed',true))
 assert.equal(goalTransition('completed','active',true),'active')
})
test('legacy statuses remain editable and support explicit resumption without rewriting history',()=>{
 assert.equal(goalTransition('paused','paused',true),'paused')
 assert.equal(goalTransition('paused','active',true),'active')
 assert.equal(goalTransition('cancelled','proposed',true),'proposed')
 assert.throws(()=>goalTransition('unknown','active',true))
})
test('delete is explicit, revision bound and rejects ownership injection',()=>{
 const deletion={id,operationId:id,revision:1,confirmed:true}
 assert.deepEqual(personalGoalDelete(deletion),deletion)
 for(const change of [{confirmed:false},{revision:0},{revision:'1'},{accountId:id},{operationId:'invalid'}])assert.throws(()=>personalGoalDelete({...deletion,...change}))
})
