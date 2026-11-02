import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {readBody} from '../lib/app/http.js'
import {validateMessageText} from '../lib/crm/messenger-policy.js'
import {createPractitionerClientMessages} from '../lib/practitioners/client-messages.js'

const requestId='10000000-0000-4000-8000-000000000001'
const clientId='10000000-0000-4000-8000-000000000002'
const practitionerId='10000000-0000-4000-8000-000000000003'
const operationId='10000000-0000-4000-8000-000000000004'
const secondOperationId='10000000-0000-4000-8000-000000000005'
const config={encryptionKey:randomBytes(32),encryptionKeyId:'message-send-test'}
const client={id:clientId}
const practitioner={id:practitionerId}
const input=(text='Please confirm a suitable appointment day.',id=operationId)=>({
  requestId,operationId:id,visibility:'participants',text,
})
const httpRequest=body=>new Request('https://test.example/api/app/practitioner-client-messages',{
  method:'POST',headers:{'content-type':'application/json'},body,
})
const route=readFileSync(new URL('../app/api/app/practitioner-client-messages/route.js',import.meta.url),'utf8')
const envelopeLimit=Number(route.match(/readBody\(request,(\d+)\)/)?.[1])

// Exercise the real send service and encryption with a transactional database
// double. Exclusive request locks queue transactions; shared locks intentionally
// do not. Quota reads yield so concurrent callers expose a missing exclusive lock.
function messageDatabase(existingCount=0){
  const records=new Map()
  let lockTail=Promise.resolve(),transactions=0
  const transaction=async(_config,_actor,fn)=>{
    transactions++
    let release
    const db={async query(sql,params){
      if(sql.includes('from app.consultation_requests r')){
        assert.equal(params[0],requestId)
        if(sql.includes('FOR UPDATE OF r')){
          const before=lockTail
          lockTail=new Promise(resolve=>{release=resolve})
          await before
        }
        return {rows:[{id:requestId,account_id:clientId,status:'requested',
          practitioner_account_id:practitionerId,practitioner_active:true,
          practitioner_status:'approved'}]}
      }
      if(sql.includes('from app.practitioner_request_messages where id=$1')){
        const row=records.get(params[0])
        return {rows:row?[row]:[]}
      }
      if(sql.includes('select count(*)::int as total')){
        const total=existingCount+[...records.values()].filter(row=>
          row.request_id===params[0]&&row.author_account_id===params[1]).length
        await new Promise(resolve=>setImmediate(resolve))
        return {rows:[{total}]}
      }
      if(sql.includes('insert into app.practitioner_request_messages')){
        const [id,request_id,author_account_id,author_role,visibility,body_ciphertext]=params
        if(records.has(id))throw Object.assign(new Error('duplicate'),{code:'23505'})
        records.set(id,{id,request_id,author_account_id,author_role,visibility,body_ciphertext,
          created_at:'2026-10-20T15:00:00.123456Z'})
        return {rows:[],rowCount:1}
      }
      throw new Error('Unexpected message query')
    }}
    try{return await fn(db)}finally{release?.()}
  }
  return {transaction,records,get transactions(){return transactions}}
}

test('full-length English, Russian, Spanish and multibyte replies fit the bounded HTTP envelope',async()=>{
  assert.equal(envelopeLimit,8192)
  for(const character of ['a','я','ñ','界','🙂']){
    const payload=input(character.repeat(1200/character.length))
    assert.equal(payload.text.length,1200)
    const body=JSON.stringify(payload)
    if(character!=='a')assert.ok(Buffer.byteLength(body)>2048)
    const parsed=await readBody(httpRequest(body),envelopeLimit)
    assert.equal(validateMessageText(parsed.text),payload.text)
    const database=messageDatabase()
    const store=createPractitionerClientMessages(config,{transaction:database.transaction})
    assert.equal((await store.send(client,parsed)).saved,true)
  }
  const escaped=JSON.stringify(input('я'.repeat(1200))).replaceAll('я','\\u044f')
  const parsed=await readBody(httpRequest(escaped),envelopeLimit)
  assert.equal(validateMessageText(parsed.text),'я'.repeat(1200))
})

test('message HTTP bodies remain bounded independently of character validation',async()=>{
  const body=JSON.stringify(input('a'.repeat(envelopeLimit)))
  await assert.rejects(readBody(httpRequest(body),envelopeLimit),error=>
    error.code==='PAYLOAD_TOO_LARGE'&&error.status===413)
})

test('larger HTTP envelope does not relax reply or private-note character limits',async()=>{
  const database=messageDatabase()
  const store=createPractitionerClientMessages(config,{transaction:database.transaction})
  const tooLong=await readBody(httpRequest(JSON.stringify(input('я'.repeat(1201)))),envelopeLimit)
  await assert.rejects(store.send(client,tooLong),error=>
    error.code==='INVALID_MESSAGE'&&error.status===400)
  await assert.rejects(store.send(practitioner,{...input('я'.repeat(801)),visibility:'practitioner_note'}),
    error=>error.code==='INVALID_MESSAGE'&&error.status===400)
  assert.equal(database.transactions,0,'invalid text must be rejected before database work')
  const result=await store.send(practitioner,{...input('я'.repeat(800)),visibility:'practitioner_note'})
  assert.equal(result.saved,true)
  assert.equal(result.notifyClient,undefined,'private notes never request client notifications')
})

test('simultaneous distinct sends cannot both take the last daily message slot',async()=>{
  const database=messageDatabase(39)
  const store=createPractitionerClientMessages(config,{transaction:database.transaction})
  const results=await Promise.allSettled([
    store.send(client,input()),store.send(client,input('Please confirm the date.',secondOperationId)),
  ])
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1)
  const failure=results.find(result=>result.status==='rejected')
  assert.equal(failure?.reason.code,'PRACTICE_MESSAGE_DAILY_LIMIT')
  assert.equal(failure?.reason.status,429)
  assert.equal(database.records.size,1)
})

test('simultaneous retries save one message and still acknowledge the duplicate at the quota',async()=>{
  const database=messageDatabase(39)
  const store=createPractitionerClientMessages(config,{transaction:database.transaction})
  const results=await Promise.all([store.send(client,input()),store.send(client,input())])
  assert.deepEqual(results.map(result=>result.duplicate).sort(),[false,true])
  assert.ok(results.every(result=>result.saved&&result.id===operationId))
  assert.equal(results.filter(result=>result.notifyMaster===true).length,1)
  assert.equal(database.records.size,1)
})
