import test from 'node:test'
import assert from 'node:assert/strict'
import {createJournalSaver} from '../lib/app/daybook-journal-save.mjs'
const id='550e8400-e29b-41d4-a716-446655440000'
const input={id,revision:0,text:'Synthetic thought',tags:[],kind:'note',locale:'en',timezone:'America/Toronto',localDay:'2026-11-22',goalId:null}
test('saved requires independent readback with matching fields and revision',async()=>{
 const calls=[]
 const saver=createJournalSaver(async(path,body,method,options)=>{
  calls.push({path,body,method,options})
  return body?{saved:true,entry:{...body,revision:1}}:{entry:{...input,revision:1}}
 },id,()=>id)
 assert.equal((await saver.save(input)).revision,1)
 assert.equal(calls.length,2)
 assert.equal(calls[1].method,'GET')
 assert.equal(calls[1].options.accountId,id)
})
test('unknown save outcome retries same operation and cannot overwrite a different draft',async()=>{
 const bodies=[];let fail=true
 const saver=createJournalSaver(async(path,body)=>{
  if(body){bodies.push(body);if(fail){fail=false;throw new Error('network')}return {saved:true,entry:{...body,revision:1}}}
  return {entry:{...input,revision:1}}
 },id,()=>id)
 await assert.rejects(saver.save(input))
 await assert.rejects(saver.save({...input,text:'edited'}),{code:'JOURNAL_RETRY_PENDING'})
 assert.equal((await saver.save(input)).revision,1)
 assert.equal(bodies.length,2)
 assert.deepEqual(bodies[0],bodies[1])
})
test('false acknowledgements and mismatched readback never become saved',async()=>{
 for(const bad of [{...input,revision:2},{...input,revision:1,text:'other device edit'},{...input,revision:1,id:'other'}]){
  const saver=createJournalSaver(async(path,body)=>body?{saved:true,entry:{...input,revision:1}}:{entry:bad},id,()=>id)
  await assert.rejects(saver.save(input),{code:'JOURNAL_READBACK_CONFLICT'})
 }
 const saver=createJournalSaver(async()=>({saved:false}),id,()=>id)
 await assert.rejects(saver.save(input),{code:'JOURNAL_SAVE_UNCONFIRMED'})
})
test('discard invalidates in-flight result and prevents all further saves',async()=>{
 let release
 const pending=new Promise(resolve=>{release=resolve})
 const saver=createJournalSaver(async()=>pending,id,()=>id)
 const write=saver.save(input)
 saver.discard()
 release({saved:true,entry:{...input,revision:1}})
 await assert.rejects(write,{code:'ACCOUNT_CHANGED'})
 await assert.rejects(saver.save(input),{code:'ACCOUNT_CHANGED'})
})
