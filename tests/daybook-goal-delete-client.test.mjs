import test from 'node:test'
import assert from 'node:assert/strict'
import {createPersonalGoalRemover} from '../lib/app/daybook-goal-delete-client.mjs'
const id='550e8400-e29b-41d4-a716-446655440000',target={id,revision:2,confirmed:true}
test('deletion requires explicit intent, valid acknowledgement and independent 404 readback',async()=>{
 const calls=[]
 const remover=createPersonalGoalRemover(async(path,body,method,options)=>{
  calls.push({path,body,method,options});if(method==='GET')throw Object.assign(new Error('not found'),{status:404});return {deleted:true,id}
 },id,()=>id)
 await assert.rejects(remover.remove({...target,confirmed:false}));assert.equal(calls.length,0)
 assert.equal((await remover.remove(target)).deleted,true)
 assert.deepEqual(calls.map(c=>c.method),['DELETE','GET']);assert.ok(calls.every(c=>c.options.accountId===id))
})
test('unknown outcome retries same operation and never marks partial deletion successful',async()=>{
 const bodies=[];let fail=true
 const remover=createPersonalGoalRemover(async(path,body,method)=>{
  if(method==='GET')throw Object.assign(new Error('not found'),{status:404})
  bodies.push(body);if(fail){fail=false;throw new Error('network')}return {deleted:true,id}
 },id,()=>id)
 await assert.rejects(remover.remove(target));assert.equal((await remover.remove(target)).deleted,true)
 assert.deepEqual(bodies[0],bodies[1])
 const unchanged=createPersonalGoalRemover(async(path,body,method)=>method==='GET'?{goal:{id}}:{deleted:true,id},id,()=>id)
 await assert.rejects(unchanged.remove(target),{code:'GOAL_DELETE_UNCONFIRMED'})
})
test('disposed account rejects a late deletion acknowledgement',async()=>{
 let resolve
 const remover=createPersonalGoalRemover(()=>new Promise(r=>{resolve=r}),id,()=>id)
 const task=remover.remove(target);remover.discard();resolve({deleted:true,id})
 await assert.rejects(task,{code:'ACCOUNT_CHANGED'})
})
