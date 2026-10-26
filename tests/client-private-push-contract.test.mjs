import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'
import {cabinetFixture,participantScope,reply,deferred,text} from './helpers/cabinet-source-fixture.mjs'
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
  assert.equal('tag' in w.shown[0][1],false,'each new private message gets its own notice')
  assert.equal(w.shown[0][0],'Holistic House')
  assert.doesNotMatch(JSON.stringify(w.shown),/sensitive clinical report|Private\s*report|11111111.*body/i)
  assert.equal(w.shown[0][1].data.href,'/ru/app/consultations?request='+id)
  const click=w.handlers.get('notificationclick')
  click({notification:{close(){},data:w.shown[0][1].data},waitUntil:pending=>work=pending})
  await work
  assert.deepEqual(w.opened,['https://holistichouse.example/ru/app/consultations?request='+id])
  w.handlers.get('push')({data:{json:()=>({locale:'en'})},waitUntil:pending=>work=pending})
  await work
  assert.equal(w.shown[1][1].data.href,'/en/app/course')
  assert.equal(w.shown[1][1].tag,'hh-course-reminder')
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

test('tap preserves a request through sign-in while read remains participant scoped',async()=>{
  const api=source('app/api/app/[...path]/route.js')
  const cabinet=source('components/app/app-workspace.jsx')
  const messages=source('lib/practitioners/client-messages.js')
  assert.match(api,/continueTo === 'consultations'/)
  assert.match(api,/app\/consultations\?request=/)
  assert.ok(cabinet.length, 'Read the actual workspace, not an isolated expression')
  const accountId='22222222-2222-4222-8222-222222222222'
  const other='33333333-3333-4333-8333-333333333333'
  const unread='44444444-4444-4444-8444-444444444444'
  const entries=[{id,newMessageCount:0},{id:other,newMessageCount:0},{id:unread,newMessageCount:'2'}]
    .map(value=>({...value,status:'requested',createdAt:'2026-10-25T12:00:00Z',message:'Synthetic enquiry'}))
  const f=cabinetFixture({page:'consultations',request:id,data:{account:{id:accountId,onboardingState:'active'},requests:entries,services:[]},transport:async(path,options)=>{
    assert.equal(options.method,undefined,'Opening a push or unread thread never acknowledges it')
    const requestId=new URL(path,'https://example.test').searchParams.get('requestId')
    return reply({requestId,messages:[],unseenCount:0,canReply:true,canNote:false})
  }})
  await f.settle()
  assert.deepEqual(f.requests.map(r=>new URL(r.path,'https://example.test').searchParams.get('requestId')).sort(),[id,unread].sort())
  assert.ok(f.requests.every(r=>r.options.headers['X-HH-Account-Id']===accountId&&r.options.credentials==='same-origin'))
  assert.equal(f.nodes().filter(n=>n.type==='button'&&n.props['aria-expanded']===true).length,2)
  assert.equal(f.nodes().filter(n=>n.type==='button'&&n.props['aria-expanded']===false).length,1)
  assert.equal(f.callbacks.length,0,'Read/display does not trigger a viewed/saved receipt')
  assert.equal(f.timers.size,2,'Only the two actually opened conversations can refresh')
  f.unmount();assert.equal(f.timers.size,0)
  const row={id,account_id:accountId,practitioner_account_id:other,practitioner_active:true,practitioner_status:'approved',status:'requested'}
  assert.equal((await participantScope({id:accountId},row,id)).actorRole,'client')
  assert.equal((await participantScope({id:other},row,id)).actorRole,'practitioner')
  await assert.rejects(participantScope({id:unread},row,id),error=>error.code==='NOT_FOUND'&&error.status===404)
  await assert.rejects(participantScope({id:other},{...row,practitioner_active:false},id),error=>error.code==='NOT_FOUND')
  assert.match(messages,/if\(!isRequester&&!isPractitioner\)throw new AppError\('NOT_FOUND',404\)/)
})

test('an already-open PWA conversation refreshes on focus after tapping an alert',()=>{
 const c=source('components/app/practice-request-conversation.jsx')
 assert.match(c,/window\.addEventListener\('focus',refreshOnReturn\)/)
 assert.match(c,/document\.addEventListener\('visibilitychange',refreshOnReturn\)/)
 assert.match(c,/now-lastForegroundRefresh\.current<1500/)
})

// PR #2009 deliberately opens unread threads, but acknowledgement remains explicit.
test('actual conversation action acknowledges only the visible matching participant message',async()=>{
  const accountId='22222222-2222-4222-8222-222222222222',messageId='55555555-5555-4555-8555-555555555555'
  const data={account:{id:accountId,onboardingState:'active'},services:[],requests:[{id,status:'requested',newMessageCount:1,createdAt:'2026-10-25T12:00:00Z'}]}
  let seen=false
  const f=cabinetFixture({page:'consultations',data,transport:async(path,options)=>{
    if(options.method==='POST'){
      assert.deepEqual(JSON.parse(options.body),{action:'mark_seen',requestId:id,messageId})
      assert.equal(options.headers['X-HH-Account-Id'],accountId)
      seen=true;return reply({viewed:true,requestId:id})
    }
    return reply({requestId:id,canReply:false,canNote:false,unseenCount:seen?0:1,messages:[
      {id:messageId,visibility:'participants',mine:false,role:'practitioner',text:'Synthetic reply',createdAt:'2026-10-25T12:00:00Z'},
      {id:'66666666-6666-4666-8666-666666666666',visibility:'participants',mine:true,role:'client',text:'Synthetic own message',createdAt:'2026-10-25T13:00:00Z'},
    ]})
  }})
  await f.settle()
  assert.equal(seen,false);assert.equal(f.callbacks.length,0)
  await f.click(n=>n.type==='button'&&text(n)==='Mark as viewed')
  assert.equal(seen,true,'The actual button must not be a no-op')
  assert.deepEqual(f.callbacks,['reload'])
  assert.match(f.text(),/Messages marked as viewed/)
  f.unmount()
})

test('wrong deep links stay closed; wrong-request and stale-account reads cannot populate a conversation',async()=>{
  const accountId='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333'
  const data={account:{id:accountId,onboardingState:'active'},services:[],requests:[{id,status:'requested',newMessageCount:0,createdAt:'2026-10-25T12:00:00Z'}]}
  const waiting=deferred()
  const f=cabinetFixture({page:'consultations',request:other,data,transport:()=>waiting.promise})
  assert.equal(f.requests.length,0)
  f.update({request:id});await f.settle();assert.equal(f.requests.length,1)
  waiting.resolve(reply({requestId:other,messages:[{text:'WRONG_TARGET_CONTENT'}]}));await f.settle()
  assert.doesNotMatch(f.text(),/WRONG_TARGET_CONTENT/);assert.match(f.text(),/Could not load this conversation/)
  f.unmount()
  const old=deferred(),fresh=deferred()
  const g=cabinetFixture({page:'consultations',request:id,data,transport:(_,o)=>o.headers['X-HH-Account-Id']===accountId?old.promise:fresh.promise})
  const signal=g.requests[0].options.signal
  g.update({data:{...data,account:{...data.account,id:other}}})
  assert.equal(signal.aborted,true)
  old.resolve(reply({requestId:id,messages:[{text:'OLD_ACCOUNT_CONTENT'}],unseenCount:0}));await g.settle()
  assert.doesNotMatch(g.text(),/OLD_ACCOUNT_CONTENT/)
  fresh.resolve(reply({requestId:id,messages:[],unseenCount:0,canReply:false,canNote:false}));await g.settle()
  assert.equal(g.requests.at(-1).options.headers['X-HH-Account-Id'],other)
  assert.equal(g.requests.filter(r=>r.options.method==='POST').length,0)
  g.unmount()
})

test('wrong or unconfirmed viewed receipts never refresh the parent or claim acknowledgement',async()=>{
  const accountId='22222222-2222-4222-8222-222222222222',messageId='55555555-5555-4555-8555-555555555555'
  for(const receipt of [{viewed:false,requestId:id},{viewed:true,requestId:accountId}]) {
    const f=cabinetFixture({page:'consultations',request:id,data:{account:{id:accountId,onboardingState:'active'},services:[],requests:[{id,status:'requested',newMessageCount:0,createdAt:'2026-10-25T12:00:00Z'}]},transport:async(_,options)=>reply(options.method==='POST'?receipt:{requestId:id,unseenCount:1,canReply:false,canNote:false,messages:[{id:messageId,visibility:'participants',mine:false,role:'practitioner',text:'Synthetic reply',createdAt:'2026-10-25T12:00:00Z'}]})})
    await f.settle();await f.click(n=>n.type==='button'&&text(n)==='Mark as viewed')
    assert.equal(f.callbacks.length,0)
    assert.doesNotMatch(f.text(),/Messages marked as viewed/)
    assert.match(f.text(),/Could not load this conversation/)
    f.unmount()
  }
})
