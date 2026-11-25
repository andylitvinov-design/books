import test from 'node:test'
import assert from 'node:assert/strict'
import {createJournalSessionGuard} from '../lib/app/daybook-session-guard.mjs'
test('private view locks before session revalidation and checks expected account',async()=>{
 const states=[],requests=[]
 const guard=createJournalSessionGuard(async(...args)=>{requests.push(args);return {entries:[],nextCursor:null}},'owner',{lock:()=>states.push('lock'),ready:()=>states.push('ready'),invalid:()=>states.push('invalid'),unavailable:()=>states.push('unavailable')})
 guard.suspend();assert.deepEqual(states,['lock'])
 await guard.verify()
 assert.deepEqual(states,['lock','lock','ready'])
 assert.equal(requests[0][3].accountId,'owner')
})
test('revoked session and changed account wipe; network failure stays locked',async()=>{
 for(const [error,outcome] of [[{status:401},'invalid'],[{code:'ACCOUNT_CHANGED'},'invalid'],[new Error('network'),'unavailable']]){
  const states=[]
  const guard=createJournalSessionGuard(async()=>{throw error},'owner',{lock:()=>states.push('lock'),ready:()=>states.push('ready'),invalid:()=>states.push('invalid'),unavailable:()=>states.push('unavailable')})
  await guard.verify();assert.deepEqual(states,['lock',outcome])
 }
})
test('a late successful response cannot unlock after suspend or dispose',async()=>{
 for(const action of ['suspend','dispose']){
  let resolve;const states=[]
  const guard=createJournalSessionGuard(()=>new Promise(r=>{resolve=r}),'owner',{lock:()=>states.push('lock'),ready:()=>states.push('ready'),invalid:()=>states.push('invalid'),unavailable:()=>states.push('unavailable')})
  const pending=guard.verify();guard[action]();resolve({entries:[]});await pending
  assert.equal(states.includes('ready'),false)
 }
})
