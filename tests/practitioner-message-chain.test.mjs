import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {createPractitionerClientMessages} from '../lib/practitioners/client-messages.js'
import {canReplyToConsultation} from '../lib/practitioners/conversation-policy.js'

const requestId='10000000-0000-4000-8000-000000000101'
const clientId='10000000-0000-4000-8000-000000000102'
const masterId='10000000-0000-4000-8000-000000000103'
const otherMasterId='10000000-0000-4000-8000-000000000104'
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0')
const config={encryptionKey:randomBytes(32),encryptionKeyId:'message-chain-qa'}
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

function fixture(){
 const messages=[],seen=new Map()
 let status='requested',remoteBooking=null
 return {
  setStatus(next,remote=null){status=next;remoteBooking=remote},
  messages,
  transaction:async(_config,actor,fn)=>{
   const db={async query(sql,p=[]){
    if(sql.includes('from app.consultation_requests r')){
     return {rows:[{id:requestId,account_id:clientId,
       recipient_practitioner_id:id(201),status,remote_booking:remoteBooking,
       practitioner_account_id:masterId,practitioner_active:true,
       practitioner_status:'approved'}]}
    }
    if(sql.includes('from app.practitioner_request_messages where id=$1')){
     const row=messages.find(x=>x.id===p[0])
     return {rows:row?[row]:[]}
    }
    if(sql.includes('from app.practitioner_request_messages m')&&sql.includes('unseen')){
     throw Error('Unexpected unread query')
    }
    if(sql.includes('from app.practitioner_request_messages m')&&sql.includes('count(*)')){
     const last=seen.get(actor.id)
     const total=messages.filter(x=>x.request_id===p[0] &&
       x.visibility==='participants' && x.author_account_id!==actor.id &&
       (!last||x.created_at>last)).length
     return {rows:[{total}]}
    }
    if(sql.includes('select count(*)::int as total')&&
       sql.includes('from app.practitioner_request_messages')){
     return {rows:[{total:messages.filter(x=>x.author_account_id===p[1]).length}]}
    }
    if(sql.includes('select id,author_account_id,author_role,visibility,body_ciphertext')){
     return {rows:messages.filter(x=>x.request_id===p[0]&&
       (actor.id===masterId||x.visibility==='participants'))
       .slice().reverse().map(x=>({...x,cursor_at:'2026-10-25 14:00:00+00'}))}
    }
    if(sql.includes('select id,created_at from app.practitioner_request_messages')){
     const row=messages.find(x=>x.id===p[0]&&x.request_id===p[1]&&
       x.visibility==='participants'&&x.author_account_id!==p[2])
     return {rows:row?[{id:row.id,created_at:row.created_at}]:[]}
    }
    if(sql.includes('insert into app.practitioner_request_reads')){
     seen.set(p[1],p[2]);return {rowCount:1,rows:[]}
    }
    if(sql.includes('insert into app.practitioner_request_messages')){
     const [messageId,req,author,role,visibility,cipher]=p
     if(messages.some(x=>x.id===messageId))throw Object.assign(Error('duplicate'),{code:'23505'})
     const created=new Date(Date.parse('2026-10-25T14:00:00Z')+messages.length*1000).toISOString()
     messages.push({id:messageId,request_id:req,author_account_id:author,
       author_role:role,visibility,body_ciphertext:cipher,created_at:created})
     return {rowCount:1,rows:[]}
    }
    throw Error('Unexpected SQL in synthetic transaction: '+sql.slice(0,140))
   }}
   return fn(db)
  },
 }
}

test('client → assigned master → seen → master reply → client seen, exactly once',async()=>{
 const db=fixture()
 const store=createPractitionerClientMessages(config,{transaction:db.transaction})
 const client={id:clientId},master={id:masterId}
 const incoming={requestId,operationId:id(1),text:'Is Tuesday at 11:00 suitable?',visibility:'participants'}
 const saved=await store.send(client,incoming)
 assert.equal(saved.saved,true);assert.equal(saved.notifyMaster,true)
 assert.equal(saved.notifyClient,undefined)
 assert.ok(!JSON.stringify(db.messages).includes(incoming.text),'database rows use ciphertext')
 const duplicate=await store.send(client,incoming)
 assert.equal(duplicate.duplicate,true)
 await assert.rejects(store.send(client,{...incoming,text:'Different text'}),e=>e.code==='CONFLICT')
 const before=await store.list(master,requestId)
 assert.equal(before.messages.length,1)
 assert.equal(before.unseenCount,1)
 assert.equal(before.messages[0].text,incoming.text)
 assert.equal(before.messages[0].mine,false)
 assert.deepEqual(await store.markSeen(master,{requestId,messageId:id(1)}),
   {requestId,viewed:true})
 assert.equal((await store.list(master,requestId)).unseenCount,0)
 const reply={requestId,operationId:id(2),text:'Tuesday at 11:00 works.',visibility:'participants'}
 const response=await store.send(master,reply)
 assert.equal(response.notifyClient,true)
 const clientView=await store.list(client,requestId)
 assert.equal(clientView.unseenCount,1)
 assert.equal(clientView.messages.length,2)
 assert.equal(clientView.messages.at(-1).text,reply.text)
 assert.equal(clientView.messages.at(-1).mine,false)
 await store.markSeen(client,{requestId,messageId:id(2)})
 assert.equal((await store.list(client,requestId)).unseenCount,0)
 const privateNote={requestId,operationId:id(3),text:'Internal follow-up tomorrow.',visibility:'practitioner_note'}
 assert.equal((await store.send(master,privateNote)).notifyClient,undefined)
 assert.equal((await store.list(master,requestId)).messages.length,3)
 assert.equal((await store.list(client,requestId)).messages.length,2)
 await assert.rejects(store.send({id:otherMasterId},{...reply,operationId:id(4)}),
   e=>e.code==='NOT_FOUND'&&e.status===404)
 await assert.rejects(store.list({id:otherMasterId},requestId),
   e=>e.code==='NOT_FOUND'&&e.status===404)
 await assert.rejects(store.send(client,{...privateNote,operationId:id(5)}),
   e=>e.code==='NOT_FOUND')
})

test('remote completed/declined and canceled cases are read-only for BOTH parties',async()=>{
 const remote={startsAt:'2026-10-25T15:00:00Z'}
 for(const status of ['completed','declined','closed','cancelled']){
  const db=fixture(),store=createPractitionerClientMessages(config,{transaction:db.transaction})
  db.setStatus(status,remote)
  assert.equal(canReplyToConsultation(status,remote),false)
  for(const actor of [{id:clientId},{id:masterId}]){
   await assert.rejects(store.send(actor,{requestId,operationId:id(6),
     text:'Please continue the session.',visibility:'participants'}),
     e=>e.code==='CONVERSATION_CLOSED'&&e.status===409)
   assert.equal((await store.list(actor,requestId)).canReply,false)
  }
  assert.equal((await store.send({id:masterId},{requestId,operationId:id(7),
   text:'Private archived note.',visibility:'practitioner_note'})).saved,true)
 }
 for(const status of ['requested','contacted','reschedule_proposed','confirmed','in_progress']){
  assert.equal(canReplyToConsultation(status,status==='requested'?null:remote),true)
 }
 assert.equal(canReplyToConsultation('confirmed',null),false)
})

test('client unread badge uses its own account, excludes notes and opens actual in-app thread',()=>{
 const repo=read('lib/app/repository.js')
 const ui=read('components/app/app-workspace.jsx')
 const master=read('components/app/practitioner-client-profiles.jsx')
 assert.match(repo,/from app\.practitioner_request_messages m/)
 assert.match(repo,/m\.author_role='practitioner'/)
 assert.match(repo,/m\.visibility='participants'/)
 assert.match(repo,/seen\.account_id=\$2/)
 assert.match(repo,/m\.request_id=any\(\$1::uuid\[\]\)/)
 assert.match(repo,/newMessageCount:Number\(unseenByRequest\.get\(row\.id\)\?\.unseen_count\|\|0\)/)
 assert.match(ui,/Number\(request\.newMessageCount\)>0/)
 assert.match(ui,/autoOpen=\{requestedMessageId === request\.id \|\| Number\(request\.newMessageCount\)>0\}/)
 assert.match(ui,/onViewed=\{reload\} onSaved=\{reload\}/)
 assert.match(master,/request\.newMessageCount>0/)
})

test('active conversation refreshes in foreground only and verifies exact saved/read receipts',()=>{
 const ui=read('components/app/practice-request-conversation.jsx')
 assert.match(ui,/setInterval\(\(\)=>/)
 assert.match(ui,/document\.visibilityState==='visible'/)
 assert.match(ui,/navigator\.onLine!==false/)
 assert.match(ui,/\},60000\)/)
 assert.match(ui,/window\.clearInterval\(timer\)/)
 assert.match(ui,/result\.saved!==true\|\|result\.id!==operation\.operationId/)
 assert.match(ui,/receipt\.viewed!==true\|\|receipt\.requestId!==id/)
})

test('RLS hotfix closes shared messages on terminal remote sessions without changing SELECT privileges',()=>{
 const sql=read('supabase/migrations/20261025112000_hh_close_terminal_practitioner_chats.sql')
 assert.match(sql,/drop policy if exists practitioner_request_messages_participant_insert/i)
 assert.match(sql,/for insert to hh_app_backend/i)
 assert.match(sql,/r\.status in \('reschedule_proposed','confirmed','in_progress'\)/)
 assert.doesNotMatch(sql,/'in_progress','completed','declined'/)
 assert.match(sql,/visibility='practitioner_note'/)
 assert.doesNotMatch(sql,/create policy .*for select/i)
})
