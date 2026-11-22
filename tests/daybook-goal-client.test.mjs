import test from 'node:test'
import assert from 'node:assert/strict'
import {goalEditorDraft,goalStatusOptions,createPersonalGoalSaver} from '../lib/app/daybook-goal-client.mjs'
const id='550e8400-e29b-41d4-a716-446655440000'
const draft={id,revision:0,areaKey:'meaning_purpose',title:'Synthetic goal',why:'My reason',obstacles:'',desiredOutcome:'A manuscript',axes:[],status:'active',confirmed:true,targetDate:null,milestones:[],firstStep:'15 minutes',fallbackStep:'One line'}
test('legacy edit retains canonical fields and leaves unrecorded details blank with explicit confirmation unchecked',()=>{
 const result=goalEditorDraft({id,revision:2,title:'Legacy goal',desiredOutcome:null,status:'paused',areaKey:'finance',targetDate:null,details:null})
 assert.equal(result.legacy,true);assert.equal(result.draft.title,'Legacy goal');assert.equal(result.draft.why,'');assert.equal(result.draft.confirmed,false)
 assert.ok(goalStatusOptions('paused').includes('active'))
 assert.equal(goalStatusOptions(null).includes('completed'),false)
 assert.equal(goalStatusOptions('proposed').includes('completed'),false)
 assert.deepEqual(goalStatusOptions('completed'),['active','completed'])
})
test('saved means matching independent server readback; retry preserves operation identity',async()=>{
 const bodies=[];let fail=true
 const saver=createPersonalGoalSaver(async(path,body)=>{
  if(body){bodies.push(body);if(fail){fail=false;throw new Error('network')}return {saved:true,goal:{...body,revision:1}}}
  return {goal:{...draft,revision:1}}
 },id,()=>id)
 await assert.rejects(saver.save(draft));await assert.rejects(saver.save({...draft,title:'other'}),{code:'GOAL_RETRY_PENDING'})
 assert.equal((await saver.save(draft)).revision,1);assert.deepEqual(bodies[0],bodies[1])
})
test('changed readback and disposed session cannot become saved',async()=>{
 const saver=createPersonalGoalSaver(async(path,body)=>body?{saved:true,goal:{...draft,revision:1}}:{goal:{...draft,title:'other device',revision:1}},id,()=>id)
 await assert.rejects(saver.save(draft),{code:'GOAL_READBACK_CONFLICT'})
 saver.discard();await assert.rejects(saver.save(draft),{code:'ACCOUNT_CHANGED'})
})
test('local validation keeps editing available and disposal rejects an in-flight save',async()=>{
 const invalid=createPersonalGoalSaver(async()=>{throw new Error('must not send')},id,()=>id)
 await assert.rejects(invalid.save({...draft,title:''}));assert.equal(invalid.hasPending(),false)
 let resolve
 const pending=createPersonalGoalSaver(()=>new Promise(r=>{resolve=r}),id,()=>id)
 const write=pending.save(draft);pending.discard();resolve({saved:true,goal:{...draft,revision:1}})
 await assert.rejects(write,{code:'ACCOUNT_CHANGED'})
})

test('mismatched obstacle readback cannot report a goal saved',async()=>{
 const saver=createPersonalGoalSaver(async(path,body)=>body?{saved:true,goal:{...draft,revision:1}}:{goal:{...draft,obstacles:'Other device changed this',revision:1}},id,()=>id)
 await assert.rejects(saver.save(draft),{code:'GOAL_READBACK_CONFLICT'})
})
