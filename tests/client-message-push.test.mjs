import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {clientMessagePushPayload,coursePushPayload} from '../lib/app/notification-contract.js'

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const id='12345678-1234-4234-8234-123456789abc'
test('outbound private push includes only a message type, language and bounded request ID',()=>{
  const payload=clientMessagePushPayload('ru',id)
  assert.deepEqual(payload,{kind:'client-message',locale:'ru',requestId:id})
  assert.doesNotMatch(JSON.stringify(payload),/text|messageBody|clientName|health|https:/i)
  assert.throws(()=>clientMessagePushPayload('en','https://attacker.example/a'))
  assert.throws(()=>clientMessagePushPayload('en','../admin'))
  assert.equal(coursePushPayload('ru').path,'/ru/app/course')
})

function worker(){
  const listeners=new Map(),shown=[],opened=[]
  const clients={matchAll:async()=>[],openWindow:async url=>{opened.push(url)}}
  const self={location:{origin:'https://holistichouse.vercel.app'},
    registration:{showNotification:async(...args)=>shown.push(args)},
    clients,addEventListener:(event,fn)=>listeners.set(event,[...(listeners.get(event)||[]),fn])}
  const context=vm.createContext({self,URL,importScripts:path=>vm.runInContext(read('public'+path),context)})
  vm.runInContext(read('public/sw.js'),context)
  return {listeners,shown,opened}
}
test('exactly one push and click handler; message shows generic body and opens its own thread',async()=>{
  const w=worker()
  assert.equal(w.listeners.get('push').length,1)
  assert.equal(w.listeners.get('notificationclick').length,1)
  let pending
  w.listeners.get('push')[0]({
    data:{json:()=>({kind:'client-message',locale:'ru',requestId:id,
      body:'private medical data',title:'Private sender name',
      href:'https://attacker.invalid/phishing'})},
    waitUntil:promise=>{pending=promise}
  })
  await pending
  assert.equal(w.shown.length,1)
  assert.equal(w.shown[0][0],'Holistic House')
  assert.doesNotMatch(w.shown[0][1].body,/medical|sender name|attacker/i)
  assert.equal(w.shown[0][1].data.href,'/ru/app/consultations?request='+id)
  w.listeners.get('notificationclick')[0]({
    notification:{close(){},data:w.shown[0][1].data},
    waitUntil:promise=>{pending=promise}
  })
  await pending
  assert.equal(w.opened[0],'https://holistichouse.vercel.app/ru/app/consultations?request='+id)
})
test('malicious or malformed message IDs never become notification destinations',async()=>{
  const w=worker()
  let pending
  w.listeners.get('push')[0]({
    data:{json:()=>({kind:'client-message',requestId:'https://attacker.invalid/'})},
    waitUntil:promise=>{pending=promise}
  })
  assert.equal(w.shown.length,0)
  assert.equal(pending,undefined)
  w.listeners.get('notificationclick')[0]({
    notification:{close(){},data:{href:'https://attacker.invalid/'}},
    waitUntil:promise=>{pending=promise}
  })
  await pending
  assert.equal(w.opened[0],'https://holistichouse.vercel.app/en/app/course')
})
test('server triggers only for fresh practitioner participant replies after commit',()=>{
  const model=read('lib/practitioners/client-messages.js')
  const route=read('app/api/app/practitioner-client-messages/route.js')
  const dispatcher=read('lib/app/client-message-push.js')
  assert.match(model,/scope.actorRole==='practitioner'&&visibility==='participants'/)
  assert.match(model,/saved:true,duplicate:true/)
  assert.match(route,/data.notifyClient===true&&data.duplicate===false/)
  assert.match(route,/after\(async\(\)=>/)
  assert.match(route,/delete responseData.notifyClient/)
  assert.match(dispatcher,/client_message_push_targets\(\$1\)/)
  assert.doesNotMatch(dispatcher,/body_ciphertext|messageText|clientName/)
})
test('separate message opt-in starts OFF; sender cannot access arbitrary user subscriptions',()=>{
  const sql=read('supabase/migrations/20261019183000_hh_client_message_push_optin.sql')
  assert.match(sql,/message_alerts boolean not null default false/)
  assert.match(sql,/security definer/)
  assert.match(sql,/set search_path = ''/)
  assert.match(sql,/from app.practitioner_request_messages msg/)
  assert.match(sql,/msg.author_account_id=practitioner.trusted_auth_user_id/)
  assert.match(sql,/msg.visibility='participants'/)
  assert.match(sql,/pref.message_alerts=true/)
  assert.match(sql,/revoke all on function app_private.client_message_push_targets\(uuid\) from public/)
  assert.match(sql,/grant execute on function app_private.client_message_push_targets\(uuid\) to hh_app_backend/)
  assert.doesNotMatch(sql,/to authenticated;|to anon;/i)
  const repo=read('lib/app/notification-repository.js')
  const settings=read('components/app/notification-settings.jsx')
  assert.match(repo,/messageAlerts:prefs\?\.message_alerts\?\?false/)
  assert.match(repo,/body.messageAlerts/)
  assert.match(settings,/checked=\{messages\}/)
  assert.match(settings,/messageAlerts:messages/)
})
test('Google sign-in resumes exact same private thread instead of cabinet home',()=>{
  const auth=read('app/api/app/[...path]/route.js')
  const cabinet=read('components/app/app-workspace.jsx')
  const thread=read('components/app/practice-request-conversation.jsx')
  assert.match(auth,/continueTo === 'consultations'/)
  assert.match(auth,/requireUUID\(requestId\)/)
  assert.match(auth,/app\/consultations\?request=/)
  assert.match(cabinet,/requestedMessageId=\{searchParams.get\('request'\)/)
  assert.match(cabinet,/autoOpen=\{requestedMessageId === request.id\}/)
  assert.match(thread,/setOpen\(true\)/)
  assert.match(thread,/scrollIntoView/)
})
