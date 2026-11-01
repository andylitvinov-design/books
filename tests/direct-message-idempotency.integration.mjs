// Synthetic dependency-injected transaction: no database or provider traffic.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createDirectMessages} from '../lib/practitioners/direct-messages.js'
const actor={id:'11111111-1111-4111-8111-111111111111'}
const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const operationId='cccccccc-cccc-4ccc-8ccc-cccccccccccc',assetId='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
function makeStore({ciphertext=null}={}){
 const sql=[]
 const db={async query(query,args){
  sql.push(query)
  if(query.includes('from app.practitioner_direct_threads t'))return {rows:[{
   id:args[0],sender_account_id:actor.id,active:true,status:'approved',slug:'synthetic',blocked_at:null,
  }]}
  if(query.includes('from app.practitioner_direct_messages where id='))return {rows:[{
   id:operationId,thread_id:a,author_account_id:actor.id,body_ciphertext:ciphertext,attachment_id:assetId,
  }]}
  throw Error('Unexpected synthetic query')
 }}
 return {store:createDirectMessages({}, {transaction:async(_config,_actor,callback)=>callback(db)}),sql}
}
test('retry of same operation in the same thread returns the existing receipt',async()=>{
 const {store}=makeStore()
 assert.deepEqual(await store.send(actor,{threadId:a,operationId,text:'',assetId}),{saved:true,duplicate:true,id:operationId})
})
test('the same operation ID cannot produce a false receipt for a different thread',async()=>{
 const {store,sql}=makeStore()
 await assert.rejects(store.send(actor,{threadId:b,operationId,text:'',assetId}),error=>error.code==='CONFLICT')
 assert.ok(sql.some(query=>/select id,\s*thread_id,/.test(query)),'thread identity must be read from the existing message')
})

test('cross-thread collision is rejected before decrypting another participant context',async()=>{
 const {store}=makeStore({ciphertext:'unreadable-synthetic-ciphertext'})
 await assert.rejects(store.send(actor,{threadId:b,operationId,text:'',assetId}),error=>error.code==='CONFLICT')
})
