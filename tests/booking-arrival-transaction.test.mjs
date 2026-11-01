import test from 'node:test'
import assert from 'node:assert/strict'
import {createAppRepository} from '../lib/app/repository.js'
import {createPractitionerClientMessages} from '../lib/practitioners/client-messages.js'
import {openSealed} from '../lib/app/crypto.js'
import {PRACTITIONER_ID} from '../data/app-services.js'

const config={encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'booking-test'}
const client={id:'10000000-0000-4000-8000-000000000001'}
const master={id:'10000000-0000-4000-8000-000000000002'}
const stranger={id:'10000000-0000-4000-8000-000000000009'}
const serviceId='10000000-0000-4000-8000-000000000003'
const service={id:serviceId,practitioner_id:PRACTITIONER_ID,slug:'remote-energy-support',
  area_key:'energy_spiritual',status:'published',active:true,delivery_format:'online',
  pricing_mode:'fixed',confirmed_price:50,currency:'EUR',duration_minutes:30,
  discovery_metadata:{methods:['Remote support']}}
function input(remote=true){
  const start=new Date(Date.now()+86400000);start.setUTCSeconds(0,0)
  return {serviceId,operationId:'10000000-0000-4000-8000-000000000004',
    contact:'PRIVATE_CONTACT',message:'PRIVATE_MESSAGE',...(remote?{remoteBooking:{version:2,
      goal:'Inner balance and calm',method:'Remote support',format:'asynchronous',duration:30,
      date:start.toISOString().slice(0,10),time:start.toISOString().slice(11,16),timezone:'UTC',
      startsAt:start.toISOString(),expectedPrice:50,expectedCurrency:'EUR'}}:{})}
}
// Real repository/service/encryption; staged rows publish only after a successful
// transaction. This does not pretend to prove hosted PostgreSQL RLS.
function database({failNotice=false,ordinary=false}={}){
  let requests=new Map(),messages=new Map(),commits=0
  const transaction=async(_config,_actor,fn)=>{
    const pendingRequests=new Map(requests),pendingMessages=new Map(messages)
    const db={async query(sql,args){
      if(sql.includes('from app.accounts'))return {rows:[{id:client.id,status:'active',onboarding_state:'active'}]}
      if(sql.includes('where account_id=$1 and operation_id=$2'))return {rows:[...pendingRequests.values()]
        .filter(row=>row.account_id===args[0]&&row.operation_id===args[1])}
      if(sql.includes('from app.service_offerings'))return {rows:[ordinary?{...service,slug:'ordinary'}:service]}
      if(sql.includes('insert into app.consultation_requests')){
        const [id,account_id,service_offering_id,recipient_practitioner_id,contact_ciphertext,
          message_ciphertext,shared_excerpt_ciphertext,operation_id,operation_hash,remote_booking]=args
        const row={id,account_id,service_offering_id,recipient_practitioner_id,contact_ciphertext,
          message_ciphertext,shared_excerpt_ciphertext,operation_id,operation_hash,remote_booking,
          revision:0,status:'requested',created_at:new Date().toISOString()}
        pendingRequests.set(id,row);return {rows:[row]}
      }
      if(sql.includes('from app.consultation_requests r')){
        const row=pendingRequests.get(args[0])
        return {rows:row?[{...row,practitioner_account_id:master.id,
          practitioner_active:true,practitioner_status:'approved'}]:[]}
      }
      if(sql.includes('from app.practitioner_request_messages where id=$1'))
        return {rows:pendingMessages.has(args[0])?[pendingMessages.get(args[0])]:[]}
      if(sql.includes('select count(*)::int as total'))return {rows:[{total:pendingMessages.size}]}
      if(sql.includes('insert into app.practitioner_request_messages')){
        if(failNotice)throw new Error('notice storage unavailable')
        const [id,request_id,author_account_id,author_role,visibility,body_ciphertext]=args
        pendingMessages.set(id,{id,request_id,author_account_id,author_role,visibility,body_ciphertext})
        return {rowCount:1,rows:[]}
      }
      throw new Error('Unexpected booking query: '+sql)
    }}
    const result=await fn(db)
    requests=pendingRequests;messages=pendingMessages;commits++;return result
  }
  return {transaction,get requests(){return requests},get messages(){return messages},get commits(){return commits}}
}

test('commit creates exactly one neutral assigned-master inbox arrival; replay stays externally silent',async()=>{
  const db=database(),repo=createAppRepository(config,{transaction:db.transaction}),body=input()
  const first=await repo.createRequest(client,body)
  assert.equal(db.commits,1);assert.equal(db.requests.size,1)
  assert.equal(db.messages.size,1,'arrival must exist before post-response work')
  const message=[...db.messages.values()][0]
  assert.equal(message.id,first.id);assert.equal(first.bookingMessageId,message.id)
  assert.equal(first.bookingNotice,true);assert.equal(message.request_id,first.id)
  assert.equal(message.author_account_id,client.id);assert.equal(message.author_role,'client')
  assert.equal(message.visibility,'participants')
  const text=openSealed(message.body_ciphertext,{accountId:client.id,recordId:message.id,
    field:'practice.request.message'},config).text
  assert.match(text,/new Holistic House booking request/)
  assert.doesNotMatch(text,/PRIVATE_|Inner balance|EUR|Remote support|https?:/)
  const replay=await repo.createRequest(client,body)
  assert.equal(replay.id,first.id);assert.equal(db.requests.size,1);assert.equal(db.messages.size,1)
  assert.equal(replay.bookingNotice,undefined)
  await assert.rejects(repo.createRequest(client,{...body,message:'changed'}),
    error=>error.code==='IDEMPOTENCY_CONFLICT')
  assert.equal(db.messages.size,1)
})
test('arrival storage failure rolls the entire booking back',async()=>{
  const db=database({failNotice:true}),repo=createAppRepository(config,{transaction:db.transaction})
  await assert.rejects(repo.createRequest(client,input()),/notice storage unavailable/)
  assert.equal(db.requests.size,0);assert.equal(db.messages.size,0);assert.equal(db.commits,0)
})
test('ordinary requests keep their existing behavior without remote arrival',async()=>{
  const db=database({ordinary:true}),repo=createAppRepository(config,{transaction:db.transaction})
  const result=await repo.createRequest(client,input(false))
  assert.equal(db.requests.size,1);assert.equal(db.messages.size,0);assert.equal(result.bookingNotice,undefined)
})
test('an unrelated account knowing the UUID cannot send; only the actual assigned master can reply',async()=>{
  const db=database(),repo=createAppRepository(config,{transaction:db.transaction})
  const created=await repo.createRequest(client,input())
  const messages=createPractitionerClientMessages(config,{transaction:db.transaction})
  await assert.rejects(messages.send(stranger,{requestId:created.id,
    operationId:'10000000-0000-4000-8000-000000000008',text:'Please confirm the time.'}),
  error=>error.code==='NOT_FOUND'&&error.status===404)
  assert.equal(db.messages.size,1)
  const own=await messages.send(master,{requestId:created.id,
    operationId:'10000000-0000-4000-8000-000000000007',text:'Please confirm the time.'})
  assert.equal(own.notifyClient,true)
})

test('talisman enquiry commits one private request and one neutral master notice, without session price or appointment',async()=>{
  const db=database(),repo=createAppRepository(config,{transaction:db.transaction})
  const body={...input(false),message:'I would like to discuss a talisman',
    talismanRequest:{version:1,goal:'Work and money'}}
  const created=await repo.createRequest(client,body)
  assert.equal(db.requests.size,1)
  assert.equal(db.messages.size,1)
  assert.equal(created.enquiryNotice,true)
  assert.equal(created.bookingNotice,undefined)
  const row=[...db.requests.values()][0]
  assert.equal(row.remote_booking,undefined)
  const saved=openSealed(row.message_ciphertext,
    {accountId:client.id,recordId:row.id,field:'request.message'},config)
  assert.match(saved,/TALISMAN ENQUIRY/)
  assert.match(saved,/NOT ORDERED OR PAID/)
  assert.match(saved,/I would like to discuss a talisman/)
  const message=[...db.messages.values()][0]
  const notice=openSealed(message.body_ciphertext,{
    accountId:client.id,recordId:message.id,field:'practice.request.message'},config).text
  assert.match(notice,/new Holistic House service enquiry/)
  assert.doesNotMatch(notice,/Work and money|talisman|PRIVATE_CONTACT/i)
  const replay=await repo.createRequest(client,body)
  assert.equal(replay.id,created.id)
  assert.equal(replay.enquiryNotice,undefined)
  assert.equal(db.messages.size,1)
  await assert.rejects(repo.createRequest(client,{
    ...body,operationId:'10000000-0000-4000-8000-000000000099',remoteBooking:input().remoteBooking
  }),error=>error.code==='INVALID_REQUEST_KIND')
  assert.equal(db.requests.size,1)
  assert.equal(db.messages.size,1)
})
