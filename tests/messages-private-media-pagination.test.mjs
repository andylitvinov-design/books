import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {mediaFromMessages,mergeMediaPages} from '../lib/app/messenger-private-media.mjs'
import {messengerCursor,parseMessengerCursor} from '../lib/crm/messenger-pagination.js'

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const a='d1f98e7c-5c23-4354-b984-f26407d9b99c'
const b='d1f98e7c-5c23-4354-b984-f26407d9b99d'
const c='d1f98e7c-5c23-4354-b984-f26407d9b99e'

test('gallery is media references, ordered newest first without cross-person joins or text copies',()=>{
 const messages=[
   {id:a,text:'private text is not media',photo:true,photoPurpose:'drawing'},
   {id:b,photo:true,photoPurpose:'portrait'},
   {id:c,photo:false},
 ]
 assert.deepEqual(mediaFromMessages('crm',messages),[
   {id:b,kind:'image',purpose:'portrait'},{id:a,kind:'image',purpose:'drawing'}])
 assert.deepEqual(mediaFromMessages('other',messages),[])
 assert.deepEqual(mediaFromMessages('crm',[{id:'invalid',photo:true}]),[])
 const direct=[
   {attachment:{id:a,kind:'image'}},
   {attachment:{id:b,kind:'audio'}},
   {attachment:{id:c,kind:'video'}},
   {attachment:{id:'bad',kind:'image'}},
   {attachment:{id:c,kind:'html'}},
 ]
 assert.deepEqual(mediaFromMessages('direct',direct),[
   {id:c,kind:'video'},{id:b,kind:'audio'},{id:a,kind:'image'}])
 assert.deepEqual(mergeMediaPages([{id:c,kind:'image'}],[{id:c,kind:'image'},{id:b,kind:'audio'}]),
   [{id:c,kind:'image'},{id:b,kind:'audio'}])
})

test('all conversation history uses opaque keyset pages: exact boundaries and bounded reads',()=>{
 const store=src('lib/practitioners/direct-messages.js')
 const route=src('app/api/app/direct-messages/route.js')
 const card=src('components/app/messages-contact-card.jsx')
 const chat=src('components/app/direct-message-inbox.jsx')
 const cursor=messengerCursor('2026-10-26 14:20:39.123456+00',a)
 assert.deepEqual(parseMessengerCursor(cursor),{at:'2026-10-26 14:20:39.123456+00',id:a})
 assert.throws(()=>parseMessengerCursor('broken'),/INVALID_MESSENGER_CURSOR/)
 assert.match(store,/async messages\(actor,threadId,messagesBefore=null\)/)
 assert.match(store,/await thread\(db,actor,threadId\)/)
 assert.match(store,/parseMessengerCursor\(messagesBefore\)/)
 assert.match(store,/\(m\.created_at,m\.id\)<\(\$2::timestamptz,\$3::uuid\)/)
 assert.match(store,/order by m\.created_at desc,m\.id desc limit 51/)
 assert.match(store,/const page=rows\.slice\(0,50\)/)
 assert.match(store,/nextMessagesCursor=rows\.length>50/)
 assert.match(route,/params\.getAll\('messagesBefore'\)\.length>1/)
 assert.match(route,/params\.has\('messagesBefore'\)&&!params\.has\('threadId'\)/)
 assert.match(route,/await auth\.verified\(\)/)
 assert.match(route,/expected!==actor\.id/)
 assert.match(card,/threadMatches\(data,item\)/)
 assert.match(card,/data\.accountId!==accountId\|\|data\.threadId!==item\.id/)
 assert.match(card,/previous\.key!==stateKey\|\|previous\.cursor!==view\.cursor/)
 assert.match(card,/olderRef\.current\?\.abort\(\)/)
 assert.match(chat,/async function loadEarlier\(/)
 assert.match(chat,/readGeneration\.current/)
 assert.match(chat,/nextMessagesCursor:data\.nextMessagesCursor/)
 assert.doesNotMatch(card,/telegramPhotoFileId|api\.telegram\.org|localStorage|sessionStorage/)
})

test('private photo viewer covers iPhone viewport, closes with Escape, restores focus',()=>{
 const view=src('components/app/private-chat-photo.jsx')
 const css=src('components/app/private-chat-photo.module.css')
 const card=src('components/app/messages-contact-card.jsx')
 const direct=src('components/app/direct-message-inbox.jsx')
 const crm=src('components/app/crm-telegram-photo.jsx')
 for(const locale of ['en','ru','es'])assert.match(view,new RegExp('\\b'+locale+':\\{'))
 assert.match(view,/createPortal\(/)
 assert.match(view,/role="dialog" aria-modal="true"/)
 assert.match(view,/event\.key==='Escape'/)
 assert.match(view,/trigger\.current\?\.focus\(\)/)
 assert.match(view,/aria-expanded=\{open\}/)
 assert.match(css,/z-index:2147483000/)
 assert.match(css,/safe-area-inset-bottom/)
 assert.match(css,/object-fit:contain/)
 assert.match(card,/<PrivateChatPhoto src=/)
 assert.match(direct,/<PrivateChatPhoto src=/)
 assert.match(crm,/<PrivateChatPhoto src=/)
})
