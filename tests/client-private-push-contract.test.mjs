import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'
import {clientMessagePushPayload,coursePushPayload} from '../lib/app/notification-contract.js'

const id='11111111-1111-4111-8111-111111111111'
const source=path=>readFileSync(path,'utf8')
function workerFixture(){
  const handlers=new Map(),shown=[],opened=[]
  const self={
    location:{origin:'https://holistichouse.example'},
    registration:{showNotification:async(...args)=>shown.push(args)},
    clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)},
    addEventListener:(event,cb)=>handlers.set(event,cb),
  }
  vm.runInNewContext(source('public/course-notifications-sw.js'),{self,URL})
  return {handlers,shown,opened}
}

test('private message push contract never serializes a message or arbitrary URL',()=>{
  assert.deepEqual(clientMessagePushPayload('ru',id),
    {kind:'client-message',locale:'ru',requestId:id})
  assert.equal(coursePushPayload('ru').path,'/ru/app/course')
  assert.throws(()=>clientMessagePushPayload('en','https://evil.example/h'),/INVALID_MESSAGE_REQUEST/)
})

test('one root worker routes generic course vs client message without private text',async()=>{
  const w=workerFixture()
  assert.equal(w.handlers.has('push'),true)
  let work
  w.handlers.get('push')({
    data:{json:()=>({...clientMessagePushPayload('ru',id),body:'sensitive clinical report',title:'Private'})},
    waitUntil:pending=>work=pending,
  })
  await work
  assert.equal(w.shown.length,1)
  assert.equal(w.shown[0][0],'Holistic House')
  assert.doesNotMatch(JSON.stringify(w.shown),/sensitive clinical report|Private|11111111.*body/i)
  assert.equal(w.shown[0][1].data.href,'/ru/app/consultations?request='+id)
  const click=w.handlers.get('notificationclick')
  click({notification:{close(){},data:w.shown[0][1].data},waitUntil:pending=>work=pending})
  await work
  assert.deepEqual(w.opened,['https://holistichouse.example/ru/app/consultations?request='+id])
  w.handlers.get('push')({data:{json:()=>({locale:'en'})},waitUntil:pending=>work=pending})
  await work
  assert.equal(w.shown[1][1].data.href,'/en/app/course')
  click({notification:{close(){},data:{href:'https://evil.example/message'}},waitUntil:pending=>work=pending})
  await work
  assert.equal(w.opened.at(-1),'https://holistichouse.example/en/app/course')
})

test('message alerts are independently opt-in, not coupled to course reminders',()=>{
  const repo=source('lib/app/notification-repository.js')
  const migration=source('supabase/migrations/20261019180000_hh_client_message_push_optin.sql')
  assert.match(repo,/message_alerts/)
  assert.match(migration,/message_alerts boolean not null default false/)
  assert.match(migration,/pref\.enabled=true and pref\.message_alerts=true/)
  assert.match(migration,/msg\.author_role='practitioner' and msg\.visibility='participants'/)
  assert.match(migration,/revoke all on function app_private\.client_message_push_targets\(uuid\) from public/)
  assert.match(source('lib/practitioners/client-messages.js'),/scope\.actorRole==='practitioner'&&visibility==='participants'/)
  assert.match(source('app/api/app/practitioner-client-messages/route.js'),/data\.duplicate===false/)
})

test('tap preserves a request through sign-in while read remains participant scoped',()=>{
  const api=source('app/api/app/[...path]/route.js')
  const cabinet=source('components/app/app-workspace.jsx')
  const messages=source('lib/practitioners/client-messages.js')
  assert.match(api,/continueTo === 'consultations'/)
  assert.match(api,/app\/consultations\?request=/)
  assert.match(cabinet,/autoOpen=\{requestedMessageId === request\.id\}/)
  assert.match(messages,/if\(!isRequester&&!isPractitioner\)throw new AppError\('NOT_FOUND',404\)/)
})
