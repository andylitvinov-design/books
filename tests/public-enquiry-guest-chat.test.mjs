import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {
 guestChatCookieName,issueGuestEnquiryCapability,verifyGuestEnquiryCapability,
} from '../lib/practitioners/public-enquiry-chat-capability.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const config={encryptionKey:randomBytes(32)}
const id='1284a22b-6dbc-4b48-9f23-64006e69b293'
const operationId='1384a22b-6dbc-4b48-9f23-64006e69b294'
const now=Date.parse('2026-11-04T17:00:00Z')

test('opaque guest capability is same-case, HttpOnly-ready, tamper proof and expires',()=>{
 const createdAt=new Date(now-1000).toISOString()
 const proof=issueGuestEnquiryCapability({enquiryId:id,operationId,createdAt},config,now)
 assert.match(proof.token,/^g1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/)
 assert.ok(proof.maxAge>0&&proof.maxAge<=7*86400)
 assert.equal(guestChatCookieName(id),'hh-guest-chat-'+id)
 const verified=verifyGuestEnquiryCapability(proof.token,id,config,now+2000)
 assert.equal(verified?.enquiryId,id)
 assert.equal(verified?.operationId,operationId)
 assert.equal(verifyGuestEnquiryCapability(proof.token,
   '4284a22b-6dbc-4b48-9f23-64006e69b293',config,now),null)
 assert.equal(verifyGuestEnquiryCapability(proof.token,id,
   {encryptionKey:randomBytes(32)},now),null)
 assert.equal(verifyGuestEnquiryCapability(proof.token,id,config,now+8*86400000),null)
 const tampered=proof.token.slice(0,-3)+'ABC'
 assert.equal(verifyGuestEnquiryCapability(tampered,id,config,now),null)
 assert.throws(()=>issueGuestEnquiryCapability({enquiryId:id,operationId,
   createdAt:new Date(now-8*86400000).toISOString()},config,now))
})

test('public routes issue no bearer link and never claim a chat when production flag is off',()=>{
 const policy=read('lib/practitioners/public-enquiry-chat-policy.mjs')
 const service=read('app/api/service-enquiries/route.js')
 const coaching=read('app/api/coaching-diagnostic/route.js')
 assert.match(policy,/HH_PUBLIC_GUEST_CHAT_PRODUCTION_APPROVED/)
 assert.match(policy,/HH_PUBLIC_GUEST_CHAT_ENABLED/)
 for(const source of [service,coaching]){
   assert.match(source,/publicEnquiryGuestChatReady\(\)/)
   assert.match(source,/result\.saved===true/)
   assert.match(source,/httpOnly:true,secure:!config\.test,sameSite:'strict'/)
   assert.match(source,/path:'\/api\/public-enquiry-chat'/)
   assert.match(source,/guestChatAvailable:!!guestChatCapability/)
   assert.doesNotMatch(source,/localStorage|sendBulk|paid_broadcast/)
 }
 const guest=read('app/api/public-enquiry-chat/route.js')
 assert.match(guest,/verifyGuestEnquiryCapability\(token,id,config\)/)
 assert.match(guest,/requireSameOrigin\(request,config\)/)
 assert.match(guest,/publicEnquiryGuestChatReady\(\)/)
 assert.match(guest,/set_config\('hh\.public_enquiry_operation'/)
 assert.match(guest,/set_config\('hh\.guest_chat_enquiry'/)
 assert.match(guest,/set_config\('hh\.guest_chat_message'/)
 assert.doesNotMatch(guest,/sendOneMessengerMessage|sendOwnerTelegramEventMessage|sendEmail|setInterval|cron/i)
})

test('new guest SQL has force RLS and owner/guest separate insert rules',()=>{
 const sql=read('supabase/migrations/20261104170000_public_enquiry_guest_chat_20261104.sql')
 assert.match(sql,/force row level security/i)
 assert.match(sql,/public_enquiry_chat_guest_read/)
 assert.match(sql,/public_enquiry_chat_guest_write/)
 assert.match(sql,/public_enquiry_chat_owner_read/)
 assert.match(sql,/public_enquiry_chat_owner_write/)
 assert.match(sql,/hh\.public_enquiry_operation/)
 assert.match(sql,/hh\.guest_chat_message/)
 assert.match(sql,/auth\.uid\(\)/)
 assert.match(sql,/app_private\.session_active\(\)/)
 assert.match(sql,/unique\(enquiry_id,operation_id\)/)
 assert.doesNotMatch(sql,/grant\s+(?:all|select|insert|update|delete)\s+on\s+app_private\.public_enquiry_chat_messages\s+to\s+(?:public|anon|authenticated)/i)
})

test('owner chat requires authenticated operator, never uploads contacts or dispatches provider sends',()=>{
 const route=read('app/api/app/messages/public-enquiries/[id]/chat/route.js')
 const store=read('lib/practitioners/public-enquiry-chat-store.js')
 assert.match(route,/actor=await auth\.verified\(\)/)
 assert.match(route,/practitionerEmailAllowed\(actor\)/)
 assert.match(route,/p\.trusted_auth_user_id=\$2 and p\.active/)
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(store,/seal\(\{text:clean\}/)
 assert.match(store,/openSealed\(/)
 assert.match(store,/assertNoRelayContacts/)
 assert.match(store,/on conflict\(enquiry_id,operation_id\) do nothing/)
 assert.match(store,/MESSAGE_LIMIT/)
 assert.match(store,/pg_advisory_xact_lock\(hashtextextended/)
 assert.doesNotMatch(route,/sendBulk|sendOneMessengerMessage|sendOwnerTelegramEventMessage|sendEmail/i)
})

test('mobile guest and owner composers are distinct and never treat UUID as authorization',()=>{
 const page=read('app/[locale]/enquiry/[id]/chat/page.tsx')
 const guest=read('components/public-enquiry-guest-chat.tsx')
 const owner=read('components/app/public-enquiry-guest-chat-operator.jsx')
 const inbox=read('components/app/messages-simple-inbox.jsx')
 assert.match(page,/publicEnquiryGuestChatReady\(\)/)
 assert.match(page,/robots:\{index:false,follow:false\}/)
 assert.match(guest,/credentials:"same-origin"/)
 assert.match(guest,/crypto\.randomUUID\(\)/)
 assert.match(guest,/pending\.current=operation/)
 assert.match(guest,/role="log"/)
 assert.match(guest,/t\.privacy/)
 assert.match(owner,/owner_private_enquiry/)
 assert.match(owner,/role="log"/)
 assert.match(inbox,/PublicEnquiryGuestChatOperator/)
 const compact=read('components/compact-lead-capture.tsx')
 const chooser=read('components/contact-channel-chooser.tsx')
 assert.match(compact,/result\.guestChatAvailable===true/)
 assert.match(chooser,/data\.guestChatAvailable===true/)
 assert.match(chooser,/saved\.guestChatId/)
})

test('guest and operator allow bounded long UTF-8 text without bypassing 1200-character guard',()=>{
 const guest=read('app/api/public-enquiry-chat/route.js')
 const owner=read('app/api/app/messages/public-enquiries/[id]/chat/route.js')
 const store=read('lib/practitioners/public-enquiry-chat-store.js')
 for(const handler of [guest,owner])assert.match(handler,/readBody\(request,8192\)/)
 assert.match(store,/text\.length>1200/)
 assert.match(store,/CONTACT_EXCHANGE_BLOCKED/)
})

test('disabled guest feature cannot expose a fake owner composer, or mislabel saved replies',()=>{
 const view=read('lib/practitioners/public-service-enquiry.js')
 const inbox=read('components/app/messages-simple-inbox.jsx')
 const guest=read('components/public-enquiry-guest-chat.tsx')
 assert.match(view,/guestChatAvailable: Boolean\(/)
 assert.match(view,/publicEnquiryGuestChatReady\(\)/)
 assert.match(inbox,/selected\.item\.guestChatAvailable===true/)
 assert.match(guest,/await reload\(\)\.catch\(\(\)=>setError\(t\.refreshError\)\)/)
})
