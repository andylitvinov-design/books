import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  normalizeMessengerDestination,normalizeMessengerTopics,validateMessengerNotificationInput,
  maskMessengerDestination,messengerNotificationEligible,MESSENGER_CONTACT_NOTICE_VERSION,
} from '../lib/app/messenger-notification-policy.js'
const base={
 action:'save',channel:'whatsapp',destination:'+1 (416) 555-1212',locale:'ru',
 noticeVersion:MESSENGER_CONTACT_NOTICE_VERSION,permissionAccepted:true,
 topics:{messages:true,booking:true,reports:true,courses:false,news:false},
}
test('pending numbers normalize to E.164 but never imply delivery verification',()=>{
 assert.equal(validateMessengerNotificationInput(base).destination,'+14165551212')
 assert.equal(maskMessengerDestination('whatsapp','+14165551212').endsWith('12'),true)
 assert.equal(normalizeMessengerDestination('telegram','Andy_house'),'@Andy_house')
})
test('rejects contact format, arbitrary keys, malicious control bytes and unknown topics',()=>{
 for(const destination of ['4165551212','+000000000','+1\n5551212','+1abcd1234','+1234']){
  assert.throws(()=>normalizeMessengerDestination('whatsapp',destination))
 }
 for(const destination of ['a','@no','@some name','@a/bad','@name\n'])assert.throws(
  ()=>normalizeMessengerDestination('telegram',destination))
 assert.throws(()=>validateMessengerNotificationInput({...base,diagnosis:'secret'}))
 assert.throws(()=>normalizeMessengerTopics({...base.topics,diagnosis:true}))
 assert.throws(()=>normalizeMessengerTopics({...base.topics,news:'yes'}))
})
test('requires explicit text-versioned contact permission; no marketing implied',()=>{
 for(const patch of [{permissionAccepted:false},{noticeVersion:'old'},{permissionAccepted:undefined},{locale:'zz'}]){
  assert.throws(()=>validateMessengerNotificationInput({...base,...patch}))
 }
 const saved=validateMessengerNotificationInput(base)
 assert.equal(saved.topics.news,false)
 assert.equal(messengerNotificationEligible({verified:false,channelReady:true,topicEnabled:true,accountActive:true}),false)
})
test('changing topics never changes delivery status or arbitrary contact details',()=>{
 const {destination,...withoutDestination}=base
 const edited=validateMessengerNotificationInput({...withoutDestination,action:'preferences'})
 assert.equal(edited.action,'preferences')
 assert.equal('destination' in edited,false)
 assert.throws(()=>validateMessengerNotificationInput({...base,action:'preferences'}))
 assert.deepEqual(validateMessengerNotificationInput({action:'remove',channel:'telegram'}),
  {action:'remove',channel:'telegram'})
 assert.throws(()=>validateMessengerNotificationInput({action:'remove',channel:'telegram',topics:base.topics}))
})
test('future sending is impossible until EVERY authorization and consent gate passes',()=>{
 const eligible={verified:true,channelReady:true,topicEnabled:true,accountActive:true,
  suppressed:false,marketing:false}
 assert.equal(messengerNotificationEligible(eligible),true)
 for(const name of ['verified','channelReady','topicEnabled','accountActive'])
  assert.equal(messengerNotificationEligible({...eligible,[name]:false}),false)
 assert.equal(messengerNotificationEligible({...eligible,suppressed:true}),false)
 assert.equal(messengerNotificationEligible({...eligible,marketing:true}),false)
 assert.equal(messengerNotificationEligible({...eligible,marketing:true,marketingConsent:true}),true)
})
test('phase one stays isolated from external sending and enforces owner-scoped SQL',()=>{
 const repository=readFileSync(new URL('../lib/app/messenger-notification-repository.js',import.meta.url),'utf8')
 const route=readFileSync(new URL('../app/api/app/notification-channels/route.js',import.meta.url),'utf8')
 const sql=readFileSync(new URL('../supabase/migrations/20261020140000_hh_messenger_pending_contacts.sql',import.meta.url),'utf8')
 assert.match(repository,/destination_ciphertext/)
 assert.match(repository,/seal\(/)
 assert.match(repository,/transaction\(/)
 assert.match(repository,/where account_id=\$1/)
 assert.match(route,/requireSameOrigin/)
 assert.match(route,/x-hh-account-id/)
 assert.doesNotMatch(repository+route,/sendOneMessengerMessage|sendWebPush|WHATSAPP_TOKEN|TELEGRAM_TOKEN/)
 assert.match(sql,/force row level security/i)
 assert.match(sql,/revoke all on app_private\.notification_messenger_requests from public,anon,authenticated/i)
 assert.match(sql,/on delete cascade/i)
 assert.doesNotMatch(sql,/grant .* to (anon|authenticated)/i)
 const screen=readFileSync(new URL('../components/app/messenger-notification-settings.jsx',import.meta.url),'utf8')
 assert.match(screen,/Pending verification|Ожидает подтверждения/)
 assert.match(screen,/notification-channels/)
 assert.match(screen,/es:/)
 const app=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
 assert.match(app,/MessengerNotificationSettings/)
})
