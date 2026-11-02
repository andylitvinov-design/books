import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeMessagesRequestId,messagesRequestPath,findMessagesRequestRow} from '../lib/app/messages-request-route.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const ID='a8e2d760-8080-4ead-b083-f518d49e632c'

test('opaque UUID validation and locale-safe Messages links',()=>{
 assert.equal(normalizeMessagesRequestId(' '+ID.toUpperCase()+' '),ID)
 for(const value of ['','../../practice','zzzzzzzz-0000-0000-0000-000000000000','abc?token=abc',null,{}])
   assert.equal(normalizeMessagesRequestId(value),'')
 assert.equal(messagesRequestPath('ru',ID),'/ru/app/messages?section=clients&requestId='+ID)
 assert.equal(messagesRequestPath('es',ID),'/es/app/messages?section=clients&requestId='+ID)
 assert.equal(messagesRequestPath('??','../a'),'/en/app/messages?section=clients')
})
test('only authenticated request rows select an opaque deep link',()=>{
 const good={key:'request:'+ID,kind:'request',id:ID}
 const crm={key:'crm:'+ID,kind:'crm',id:ID}
 assert.equal(findMessagesRequestRow([crm,good],ID),good)
 assert.equal(findMessagesRequestRow([crm],ID),null)
 assert.equal(findMessagesRequestRow([],ID),null)
 assert.equal(findMessagesRequestRow(null,ID),null)
 assert.equal(findMessagesRequestRow([good],'not-uuid'),null)
})
test('Full Request remains inside Messages, supports URL navigation, no practice redirect',()=>{
 const inbox=read('components/app/messages-simple-inbox.jsx')
 const card=read('components/app/messages-contact-card.jsx')
 const legacy=read('components/app/messages-client-requests.jsx')
 const orders=read('components/app/messages-orders-clients.jsx')
 for(const src of [inbox,card,legacy])assert.doesNotMatch(src,/app\/practice\?panel=clients&requestId=/)
 assert.match(inbox,/onClick=\{\(\)=>setShowCard\(true\)\}/)
 assert.match(inbox,/findMessagesRequestRow\(rows,routeRequestId\)/)
 assert.match(inbox,/window\.history\.pushState/)
 assert.match(inbox,/window\.history\.replaceState/)
 assert.match(legacy,/messagesRequestPath\(locale,selected\.id\)/)
 assert.match(card,/kind==='request'&&validId\(item\.id\)/)
 assert.match(orders,/q\.has\('requestId'\)/)
 assert.match(orders,/url\.searchParams\.delete\('requestId'\)/)
})
test('foreign or unknown request cannot be treated as verified private contact',()=>{
 const simple=read('components/app/messages-simple-inbox.jsx')
 const legacy=read('components/app/messages-client-requests.jsx')
 assert.match(simple,/if\(!row\|\|!accountId\)return/)
 assert.match(legacy,/requests\.some\(item=>normalizeMessagesRequestId\(item\.id\)===requestIdFromUrl\)/)
 assert.match(simple,/Request unavailable/)
 assert.doesNotMatch(simple,/action:'send'|POST \/api\/app\/crm|sendMessage\(/)
})

test('switching Messages folders preserves selected conversation and restores URL history',()=>{
 const inbox=read('components/app/messages-simple-inbox.jsx')
 const tab=inbox.slice(inbox.indexOf('  const switchTab=next=>{'),
   inbox.indexOf('  const publicBotUrl='))
 assert.ok(tab.includes('const switchTab=next=>{'))
 assert.doesNotMatch(tab,/setSelectedKey\(''\)/)
 assert.match(tab,/setOpenDetail\(false\)/)
 assert.match(tab,/url\.searchParams\.delete\('requestId'\)/)
 assert.match(inbox,/if\(previous!==routeRequestId\|\|selectedKey!==row\.key\)/)
 assert.match(inbox,/setOpenDetail\(true\)/)
})
