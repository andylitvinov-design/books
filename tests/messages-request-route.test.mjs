import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeMessagesRequestId,messagesRequestPath,findMessagesRequestRow} from '../lib/app/messages-request-route.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const ID='a8e2d760-8080-4ead-b083-f518d49e632c'

test('only opaque UUIDs enter canonical Messages request deep links',()=>{
 assert.equal(normalizeMessagesRequestId(' '+ID.toUpperCase()+' '),ID)
 for(const value of ['','../../practice','zzzzzzzz-0000-0000-0000-000000000000','abc?token=abc',null,{}])
   assert.equal(normalizeMessagesRequestId(value),'')
 assert.equal(messagesRequestPath('ru',ID),'/ru/app/messages?section=clients&requestId='+ID)
 assert.equal(messagesRequestPath('es',ID),'/es/app/messages?section=clients&requestId='+ID)
 assert.equal(messagesRequestPath('??','../a'),'/en/app/messages?section=clients')
})
test('request selection uses only the current account-scoped row set',()=>{
 const good={key:'request:'+ID,kind:'request',id:ID}
 const sameIdInCrm={key:'crm:'+ID,kind:'crm',id:ID}
 assert.equal(findMessagesRequestRow([sameIdInCrm,good],ID),good)
 assert.equal(findMessagesRequestRow([sameIdInCrm],ID),null)
 assert.equal(findMessagesRequestRow([],ID),null)
 assert.equal(findMessagesRequestRow(null,ID),null)
 assert.equal(findMessagesRequestRow([good],'not-uuid'),null)
})
test('full request opens within Messages, with URL history and no legacy client-card jump',()=>{
 const inbox=read('components/app/messages-simple-inbox.jsx')
 const card=read('components/app/messages-contact-card.jsx')
 const legacy=read('components/app/messages-client-requests.jsx')
 const orders=read('components/app/messages-orders-clients.jsx')
 for(const text of [inbox,card,legacy])assert.doesNotMatch(text,/app\/practice\?panel=clients&requestId=/)
 assert.match(inbox,/onClick=\{\(\)=>setShowCard\(true\)\}/)
 assert.match(inbox,/findMessagesRequestRow\(rows,routeRequestId\)/)
 assert.match(inbox,/window\.history\.pushState/)
 assert.match(inbox,/window\.history\.replaceState/)
 assert.match(legacy,/messagesRequestPath\(locale,selected\.id\)/)
 assert.match(card,/kind==='request'&&validId\(item\.id\)/)
 assert.match(orders,/q\.has\('requestId'\)/)
 assert.match(orders,/url\.searchParams\.delete\('requestId'\)/)
})
test('exactly one shared five-tab dock is reused on Messages and Practice panels',()=>{
 const nav=read('components/app/messages-bottom-navigation.jsx')
 const inner=read('components/app/practice-inner-navigation.jsx')
 const app=read('components/app/app-workspace.jsx')
 assert.match(nav,/activeSection='messages'/)
 assert.match(nav,/path===activeSection/)
 assert.match(inner,/<MessagesBottomNavigation locale=\{locale\} activeSection=\{activeSection\}\/>/)
 assert.doesNotMatch(inner,/className="hh-practice-inner-dock"/)
 assert.match(app,/!practiceInner && page !== 'runs'/)
 const source=nav.match(/\{path:'/g)||[]
 assert.equal(source.length,5)
})
