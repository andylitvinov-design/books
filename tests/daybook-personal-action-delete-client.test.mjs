import test from 'node:test'
import assert from 'node:assert/strict'
import {createPersonalActionRemover} from '../lib/app/daybook-personal-action-delete-client.mjs'
const id='550e8400-e29b-41d4-a716-446655440000',target={id,revision:2,confirmed:true}
test('deletion requires explicit intent, valid acknowledgement and independent 404 readback',async()=>{
 const calls=[]
 const remover=createPersonalActionRemover(async(path,body,method,options)=>{
  calls.push({path,body,method,options});if(method==='GET')throw Object.assign(new Error('not found'),{status:404});return {deleted:true,id}
 },id,()=>id)
 await assert.rejects(remover.remove({...target,confirmed:false}));assert.equal(calls.length,0)
 assert.equal((await remover.remove(target)).deleted,true)
 assert.deepEqual(calls.map(c=>c.method),['DELETE','GET']);assert.ok(calls.every(c=>c.options.accountId===id))
})
test('unknown outcome retries same operation and never marks partial deletion successful',async()=>{
 const bodies=[];let fail=true
 const remover=createPersonalActionRemover(async(path,body,method)=>{
  if(method==='GET')throw Object.assign(new Error('not found'),{status:404})
  bodies.push(body);if(fail){fail=false;throw new Error('network')}return {deleted:true,id}
 },id,()=>id)
 await assert.rejects(remover.remove(target));assert.equal((await remover.remove(target)).deleted,true)
 assert.deepEqual(bodies[0],bodies[1])
 const unchanged=createPersonalActionRemover(async(path,body,method)=>method==='GET'?{goal:{id}}:{deleted:true,id},id,()=>id)
 await assert.rejects(unchanged.remove(target),{code:'ACTION_DELETE_UNCONFIRMED'})
})
test('disposed account rejects a late deletion acknowledgement',async()=>{
 let resolve
 const remover=createPersonalActionRemover(()=>new Promise(r=>{resolve=r}),id,()=>id)
 const task=remover.remove(target);remover.discard();resolve({deleted:true,id})
 await assert.rejects(task,{code:'ACCOUNT_CHANGED'})
})
test('recovery waits for active deletion and retains only verified result',async()=>{
 let finish;const calls=[]
 const remover=createPersonalActionRemover(async(path,body,method)=>{
  calls.push(method)
  if(method==='DELETE'){await new Promise(r=>{finish=r});return {deleted:true,id}}
  throw Object.assign(new Error('absent'),{status:404})
 },id,()=>id)
 const pending=remover.remove(target),recovery=remover.recover();finish()
 assert.deepEqual(await recovery,await pending);assert.deepEqual(calls,['DELETE','GET'])
 assert.deepEqual(await remover.recover(),{id,deleted:true});assert.equal(calls.length,2)
})
test('recovery retries unknown deletion with same operation and requires readback',async()=>{
 const bodies=[];let fail=true
 const remover=createPersonalActionRemover(async(path,body,method)=>{
  if(method==='GET')throw Object.assign(new Error('absent'),{status:404})
  bodies.push(body);if(fail){fail=false;throw new Error('offline')}return {deleted:true,id}
 },id,()=>id)
 await assert.rejects(remover.remove(target));await remover.recover();assert.deepEqual(bodies[0],bodies[1])
 remover.discard();await assert.rejects(remover.recover(),{code:'ACCOUNT_CHANGED'})
})
test('recovery never converts a positive or unavailable readback into deletion',async()=>{
 let missing=false
 const remover=createPersonalActionRemover(async(path,body,method)=>{
  if(method==='GET'){
   if(missing)throw new Error('offline')
   return {goal:{id}}
  }
  return {deleted:true,id}
 },id,()=>id)
 await assert.rejects(remover.remove(target),{code:'ACTION_DELETE_UNCONFIRMED'})
 await assert.rejects(remover.recover(),{code:'ACTION_DELETE_UNCONFIRMED'})
 missing=true;await assert.rejects(remover.recover(),/offline/)
})
