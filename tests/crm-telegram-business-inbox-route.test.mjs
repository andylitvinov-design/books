import test from 'node:test'
import assert from 'node:assert/strict'
import './ali-secretary-unclassified-turns.test.mjs'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const inbox=read('lib/crm/telegram-business-inbox.js')
const sql=read('supabase/migrations/20261119021000_hh_crm_tg_owner_handoff_v1.sql')
const hook=read('app/api/app/crm/messenger/webhook/[provider]/route.js')
const send=read('app/api/app/crm/messenger/route.js')
const store=read('lib/crm/messenger-store.js')
const {canReply,channelTransportReady,crmReplyTransportReady,telegramBusinessTransportReady}=await import('../lib/crm/messenger-policy.js')

test('Business CRM inbox is signed, officially can_reply verified and owner scoped',()=>{
 assert.ok(hook.indexOf('verifyMessengerWebhook')<hook.indexOf('captureTelegramBusinessInbox(body,config,businessLead)'))
 assert.ok(hook.indexOf('gateTelegramBusinessSecretaryOptOut(body,config)')<hook.indexOf('captureTelegramBusinessInbox(body,config,businessLead)'))
 assert.match(inbox,/telegramBusinessLeadCandidate\(update\)/)
 assert.match(inbox,/assertHolisticBusinessConnection/)
 assert.match(inbox,/set_config\('hh.practitioner_id',\$1,true\)/)
 assert.match(inbox,/owner!==account\.owner_id/)
 assert.match(inbox,/crm_msg_resolve\(\$1,\$2\)/)
 assert.match(inbox,/crm_msg_ingest\(\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8,\$9,\$10,\$11,\$12,\$13,\$14,\$15\)/)
 assert.match(inbox,/crm-msg-telegram-business-peer/)
 assert.match(inbox,/crm-tg-business-peer/)
})
test('Business and Bot live in one Messenger without confusing recipient identity',()=>{
 assert.match(inbox,/transport:'telegram_business'/)
 assert.match(inbox,/businessConnectionId:event\.connectionId/)
 assert.match(store,/identity\.transport==='telegram_business'/)
 assert.match(store,/metadata\?\.businessConnectionId\|\|identity\.businessConnectionId/)
 assert.match(send,/reservation\.businessConnectionId/)
 assert.match(send,/sendHolisticBusinessRequestReply/)
 assert.match(send,/sendOneMessengerMessage/)
 assert.match(store,/transport:identity\?\.transport==='telegram_business'\?'telegram_business':r\.channel/)
})
test('An AI does not interrupt a human after an accepted owner CRM reply',()=>{
 assert.match(sql,/i\.direction='out' AND i\.campaign_id IS NULL/)
 assert.match(sql,/i\.request_hash IS NOT NULL/)
 assert.match(sql,/i\.status IN \('accepted','delivered','read'\)/)
 assert.match(sql,/interval '48 hours'/)
 assert.match(inbox,/if\(!ready\)return false/)
 assert.ok(hook.indexOf('if(telegramBusinessInbox.humanActive)')>=0);
 assert.ok(hook.indexOf('if(telegramBusinessInbox.humanActive)')<hook.indexOf('processTelegramBusinessConversation(body,config)'))
 assert.ok(hook.indexOf('telegramBotHumanTakeover(event,config)')<hook.indexOf('processTelegramCompanion(event,config)'))
 assert.match(hook,/await ingestMessengerUpdate\('telegram',event,config\)/)
})
test('No unconsented Business message, photo or ID escapes protected CRM; one webhook is idempotent',()=>{
 assert.match(inbox,/Telegram Business message received/)
 assert.match(inbox,/Telegram Business media received/)
 assert.match(inbox,/manual&&event\.text\.trim\(\)/)
 assert.match(inbox,/business:\x27\+event\.chatId/)
 assert.match(inbox,/scope:'crm-msg-event'/)
 assert.match(inbox,/seal\(\{text,businessConnectionId:event\.connectionId\}/)
 assert.match(sql,/SECURITY DEFINER SET search_path TO ''/)
 assert.match(sql,/CREATE OR REPLACE FUNCTION app_private\.crm_msg_human_reply_recent/)
 assert.match(sql,/REVOKE ALL ON FUNCTION/)
 assert.match(sql,/FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend/)
 assert.match(sql,/TO hh_app_inbox/)
 assert.doesNotMatch(sql,/GRANT\s+(?:SELECT|UPDATE|ALL)\s+ON app\.crm_/)
})

test('Business replies use their separate transport, not the public Telegram bot gate',()=>{
 const env={VERCEL_ENV:'production',HH_CRM_MSG_PRODUCTION_APPROVED:'false',
   HH_CRM_MSG_TELEGRAM_ENABLED:'true',HH_CRM_TG_CHAT_AUTOMATION_ENABLED:'true',
   HH_CRM_MSG_TELEGRAM_TOKEN:'123456:ABCDEFGHIJKLMNOPQRSTUVWX',
   HH_CRM_MSG_TELEGRAM_BOT_ID:'123456',
   HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'local_test_secret',
   HH_CRM_MSG_TELEGRAM_USERNAME:'holistichouse_bot'};
 assert.equal(channelTransportReady('telegram',env),false);
 assert.equal(telegramBusinessTransportReady(env),true);
 assert.match(inbox,/!telegramBusinessTransportReady\(env\)/);
 assert.equal(crmReplyTransportReady('telegram_business',env),true);
 assert.equal(crmReplyTransportReady('telegram',env),false);
 assert.match(store,/crmReplyTransportReady\(replyChannel\)/);
 assert.match(store,/row\.user_ciphertext/);
 assert.match(store,/identity\?\.transport==='telegram_business'/);
 env.HH_CRM_TG_CHAT_AUTOMATION_ENABLED='false';
 assert.equal(crmReplyTransportReady('telegram_business',env),false);
});
test('Business CRM manual replies require fresh customer contact',()=>{
 const now=Date.parse('2026-11-18T18:00:00.000Z');
 const args={channel:'telegram_business',suppressed:false,enabled:true,now};
 assert.equal(canReply({...args,lastInboundAt:new Date(now-1000).toISOString()}).ok,true);
 assert.equal(canReply({...args,lastInboundAt:new Date(now-24*60*60*1000).toISOString()}).reason,'REPLY_WINDOW_CLOSED');
 assert.equal(canReply({...args,lastInboundAt:new Date(now-1000).toISOString(),suppressed:true}).reason,'CONTACT_BLOCKED');
 assert.equal(canReply({...args,lastInboundAt:null}).reason,'CUSTOMER_MUST_START');
 assert.equal(canReply({...args,channel:'not_a_channel',lastInboundAt:new Date(now-1000).toISOString()}).reason,'INVALID_CHANNEL');
});


const {composeTelegramSecretaryClarification}=await import('../lib/crm/telegram-secretary-offers.mjs')
test('Ali answers second unclassified Business message without private probing',()=>{
 for(const [message,locale] of [['What','en'],['Что?','ru'],['¿Qué?','es']]){
   const planned=composeTelegramSecretaryClarification(message,locale)
   assert.equal(planned?.handled,true)
   assert.equal(planned?.kind,'clarify')
   assert.equal(planned?.modelUsed,false)
   assert.equal(planned?.buttons?.length,0)
   assert.equal((planned.text.match(/[?¿？]/gu)||[]).length<=2,true)
   assert.doesNotMatch(planned.text,/symptom|trauma|family history|личн(?:ые|ых) вопрос|травм|síntoma/iu)
 }
 for(const message of ['', '/stop', '/unsubscribe', 'HHWA secure-link'])
   assert.equal(composeTelegramSecretaryClarification(message,'en'),null)
 for(const message of ['/start','/unknown','thanks','Спасибо!','ok',
   '[HH-REQ:homeopathy:en]','👍','!','x'.repeat(801)])
   assert.equal(composeTelegramSecretaryClarification(message,'en')?.handled,true)
})
test('Second-message reply requires signed unsuppressed Business CRM, excludes STOP/human/replay',()=>{
 const secretary=read('lib/crm/telegram-secretary-service.js')
 assert.match(hook,/telegramBusinessInbox\?\.matched===true/)
 assert.match(hook,/telegramBusinessInbox\.recorded===true/)
 assert.match(hook,/businessLead\?\.created!==true&&businessLead\?\.suppressed!==true/)
 assert.match(hook,/hh-tg-secretary-clarify-chat/)
 assert.ok(hook.indexOf('gateTelegramBusinessSecretaryOptOut(body,config)')<
   hook.indexOf('allowClarification:'))
 assert.ok(hook.indexOf('telegramBusinessInbox.humanActive')<
   hook.indexOf('allowClarification:'))
 assert.ok(hook.indexOf('telegramBusinessInbox.recorded!==true')<
   hook.indexOf('allowClarification:'))
 assert.match(secretary,/if\(!query&&allowClarification!==true\)return \{handled:false\}/)
 assert.match(secretary,/composeTelegramSecretaryClarification\(event\.text,locale/)
 assert.match(secretary,/secretaryStopped\(event,config\)/)
 assert.match(secretary,/assertHolisticBusinessConnection/)
})
