import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {createDirectMessages} from '../lib/practitioners/direct-messages.js'

const ids={
  sender:'10000000-0000-4000-8000-000000000101',
  recipient:'10000000-0000-4000-8000-000000000102',
  outsider:'10000000-0000-4000-8000-000000000103',
  practitioner:'10000000-0000-4000-8000-000000000104',
  thread:'10000000-0000-4000-8000-000000000105',
  message:'10000000-0000-4000-8000-000000000106',
}
const config={encryptionKey:randomBytes(32),encryptionKeyId:'hh-direct-synthetic'}
function fixture(){
  const messages=[]
  let blocked=false
  return {
    messages,
    transaction:async(_config,actor,fn)=>{
      const db={async query(sql,params=[]){
        if(sql.includes('where t.id=$1')&&sql.includes('from app.practitioner_direct_threads t'))
          return {rows:[{id:ids.thread,sender_account_id:ids.sender,
            sender_display_name:'Synthetic sender',trusted_auth_user_id:ids.recipient,
            recipient_practitioner_id:ids.practitioner,
            slug:'synthetic-master',practitioner_name:'Synthetic recipient',active:true,status:'approved',
            blocked_at:blocked?new Date().toISOString():null}]}
        if(sql.includes('from app.practitioner_direct_messages where id=$1'))
          return {rows:messages.filter(m=>m.id===params[0])}
        if(sql.includes('select count(*)::integer as n')&&sql.includes('from app.practitioner_direct_messages'))
          return {rows:[{n:messages.filter(m=>m.author_account_id===params[1]).length}]}
        if(sql.includes('insert into app.practitioner_direct_messages')){
          const [id,thread_id,author_account_id,body_ciphertext,attachment_id]=params
          messages.push({id,thread_id,author_account_id,body_ciphertext,attachment_id,
            created_at:new Date().toISOString()})
          return {rowCount:1,rows:[]}
        }
        if(sql.includes('update app.practitioner_direct_threads set updated_at'))return {rowCount:1,rows:[]}
        if(sql.includes('left join app.practitioner_direct_assets a')&&sql.includes('from app.practitioner_direct_messages m'))
          return {rows:messages.map(m=>({...m,asset_id:null})).reverse()}
        if(sql.includes('max(created_at) as at'))return {rows:[{at:messages.at(-1)?.created_at}]}
        if(sql.includes('insert into app.practitioner_direct_reads'))return {rowCount:1,rows:[]}
        if(sql.includes('update app.practitioner_direct_threads set blocked_at=')){
          blocked=sql.includes('now()');return {rowCount:1,rows:[]}
        }
        throw Error('Unexpected synthetic SQL: '+sql.slice(0,120))
      }}
      return fn(db)
    }
  }
}
test('direct account exchange is encrypted, idempotent, isolated and blockable',async()=>{
  const fake=fixture(),store=createDirectMessages(config,{transaction:fake.transaction})
  const sender={id:ids.sender},recipient={id:ids.recipient},outsider={id:ids.outsider}
  const sent=await store.send(sender,{threadId:ids.thread,operationId:ids.message,text:'Private voice follow-up'})
  assert.deepEqual(sent,{saved:true,duplicate:false,id:ids.message})
  assert.equal(fake.messages.length,1)
  assert.ok(!JSON.stringify(fake.messages).includes('Private voice follow-up'),'never persist cleartext')
  assert.equal((await store.messages(recipient,ids.thread)).messages[0].text,'Private voice follow-up')
  assert.equal((await store.messages(recipient,ids.thread)).messages[0].mine,false)
  assert.equal((await store.messages(sender,ids.thread)).messages[0].mine,true)
  assert.equal((await store.send(sender,{threadId:ids.thread,operationId:ids.message,text:'Private voice follow-up'})).duplicate,true)
  assert.equal(fake.messages.length,1)
  await assert.rejects(store.send(sender,{threadId:ids.thread,operationId:ids.message,text:'Changed'}),e=>e.code==='CONFLICT')
  await assert.rejects(store.messages(outsider,ids.thread),e=>e.code==='NOT_FOUND')
  await assert.rejects(store.send(outsider,{threadId:ids.thread,operationId:ids.message,text:'Hack'}),e=>e.code==='NOT_FOUND')
  assert.deepEqual(await store.read(recipient,ids.thread),{seen:true})
  assert.deepEqual(await store.changePublication(recipient,{action:'block',threadId:ids.thread}),{blocked:true})
  await assert.rejects(store.send(sender,{threadId:ids.thread,operationId:ids.message,text:'Private voice follow-up'}),e=>e.code==='THREAD_BLOCKED')
  assert.deepEqual(await store.changePublication(recipient,{action:'unblock',threadId:ids.thread}),{blocked:false})
  await assert.rejects(store.changePublication(sender,{action:'block',threadId:ids.thread}),e=>e.code==='NOT_FOUND')
})
