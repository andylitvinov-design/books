import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {telegramBotLeadCandidate,telegramBusinessLeadCandidate} from '../lib/crm/telegram-lead-capture-policy.mjs'
const route=readFileSync(new URL('../app/api/app/crm/messenger/webhook/[provider]/route.js',import.meta.url),'utf8')
const capture=readFileSync(new URL('../lib/crm/telegram-lead-capture.js',import.meta.url),'utf8')
const now=Date.UTC(2026,10,17,18,0,0)
const sample={update_id:23,business_message:{
  message_id:15,date:now/1000,business_connection_id:'business-verified-placeholder',
  chat:{type:'private',id:12345},from:{id:12345,is_bot:false},text:'Need help please'
}}
test('bot first inbound is a lead candidate; callbacks and STOP are not',()=>{
  assert.equal(telegramBotLeadCandidate({type:'incoming',userId:'12345',rawText:'/start',stop:false}),true)
  assert.equal(telegramBotLeadCandidate({type:'incoming',userId:'12345',rawText:'',stop:false}),true)
  assert.equal(telegramBotLeadCandidate({type:'incoming',userId:'12345',rawText:'/unsubnews'}),false)
  assert.equal(telegramBotLeadCandidate({type:'incoming',userId:'12345',rawText:'/stop',stop:true}),false)
  assert.equal(telegramBotLeadCandidate({type:'incoming',userId:'12345',callbackId:'button'}),false)
  assert.equal(telegramBotLeadCandidate({type:'incoming',userId:'oops'}),false)
})
test('Business signed private customer messages including media can start a lead',()=>{
  assert.ok(telegramBusinessLeadCandidate(sample,now))
  assert.ok(telegramBusinessLeadCandidate({...sample,business_message:{...sample.business_message,text:undefined,voice:{file_id:'test'}}},now))
  for(const b of [
    {...sample.business_message,chat:{type:'group',id:12345}},
    {...sample.business_message,from:{id:12345,is_bot:true}},
    {...sample.business_message,from:{id:98765,is_bot:false}},
    {...sample.business_message,sender_business_bot:{id:99}},
    {...sample.business_message,forward_origin:{type:'user'}},
    {...sample.business_message,text:'/stop'},
    {...sample.business_message,text:'/unsubnews'},
    {...sample.business_message,text:undefined},
    {...sample.business_message,date:1}
  ])assert.equal(telegramBusinessLeadCandidate({...sample,business_message:b},now),null)
})
test('signed webhook, STOP gate, CRM commit and subsequent AI reply remain in order',()=>{
  const verify=route.indexOf('if(!verifyMessengerWebhook')
  const stop=route.indexOf('gateTelegramBusinessSecretaryOptOut(body,config)')
  const business=route.indexOf('captureTelegramBusinessLead(body,config)')
  const service=route.indexOf('processTelegramBusinessConversation(body,config)')
  const bot=route.indexOf('captureTelegramBotLead(event,config)')
  const companion=route.indexOf('processTelegramCompanion(event,config)')
  assert.ok(verify>=0&&verify<stop&&stop<business&&business<service)
  assert.ok(bot>0&&bot<companion)
  assert.match(capture,/assertHolisticBusinessConnection/)
  assert.match(capture,/crm_msg_resolve/)
  assert.match(capture,/pg_advisory_xact_lock/)
  assert.match(capture,/crm_tg_diagnostic_sessions/)
  assert.match(capture,/crm_tg_companion_sessions/)
  assert.match(capture,/if\(revoked\)return \{created:false,suppressed:true\}/)
  assert.match(capture,/ingestMessengerEventInTransaction\(db,'telegram'/)
  assert.match(capture,/eventId:'tg:first-contact:'\+event.userId/)
  assert.match(capture,/messageId:'tg:first-contact:'\+event.userId/)
  assert.match(capture,/body:'Telegram conversation started'/)
  const botCapture=capture.slice(capture.indexOf('export async function captureTelegramBotLead'),
    capture.indexOf('export async function captureTelegramBusinessLead'))
  assert.doesNotMatch(botCapture,/insert into app\.crm_contacts|insert into app\.crm_opportunities/)
  assert.doesNotMatch(botCapture,/body:event\.body|body:event\.rawText/)
  assert.match(capture,/crm_tg_business_lead_capture_v1/)
  assert.doesNotMatch(capture,/marketing_opt_in_at|crm_consent_ledger|sendOneMessengerMessage/)
  assert.match(capture,/replyConsent:null,marketingConsent:false/)
})


test('first-contact bot failures trigger Telegram retry; Business best-effort stays separate',async()=>{
 const {captureTelegramLeadBestEffort}=await import('../lib/crm/telegram-lead-capture-policy.mjs');
 const results=[];
 const accepted=await captureTelegramLeadBestEffort(async()=>({created:true}),()=>results.push('unavailable'));
 assert.deepEqual(accepted,{created:true});
 assert.deepEqual(results,[]);
 const unavailable=await captureTelegramLeadBestEffort(async()=>{throw new Error('do not log private database details')},
   ()=>results.push('unavailable'));
 assert.deepEqual(unavailable,{created:false,unavailable:true});
 assert.deepEqual(results,['unavailable']);
 assert.deepEqual(await captureTelegramLeadBestEffort(async()=>{throw new Error('permission denied')},
   ()=>{throw new Error('logger failed')}),{created:false,unavailable:true});
 const bot=route.indexOf('await captureTelegramBotLead(event,config)');
 assert.ok(bot>=0&&bot<route.indexOf('processTelegramCompanion(event,config)'));
 assert.match(route,/throw new AppError\('TELEGRAM_CRM_CONTACT_UNCONFIRMED',503\)/);
 assert.match(route,/HH_TG_BOT_LEAD_CAPTURE_UNAVAILABLE/);
 assert.match(route,/HH_TG_BUSINESS_LEAD_CAPTURE_UNAVAILABLE/);
 assert.match(route,/HH_TG_INLINE_WEBHOOK_SYNC_UNAVAILABLE/);
 assert.match(route,/HH_TG_SIGNED_WEBHOOK_PROCESSING_FAILED/);
 // This is only a durability boundary: signed provider validation, STOP and
 // explicit opt-in for intake/CRM order remain independent and mandatory.
 assert.ok(route.indexOf('if(!verifyMessengerWebhook')<
   route.indexOf('captureTelegramBusinessLead(body,config)'));
 assert.ok(route.indexOf('gateTelegramBusinessSecretaryOptOut')<
   route.indexOf('captureTelegramBusinessLead(body,config)'));
 assert.ok(route.indexOf('captureTelegramBotLead(event,config)')<
   route.indexOf('processTelegramCompanion(event,config)'));
 assert.match(route,/processTelegramAiV3\(diagnosticEvent,config\)/);
});

// The signed Business webhook must never directly gain broad CRM table privileges.
test('Business lead capture stays behind a narrowly scoped private definer',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261119014500_hh_tg_business_lead_capture_v1.sql',import.meta.url),'utf8')
 const businessCapture=capture.slice(capture.indexOf('async function ensureUnqualifiedLead'),
   capture.indexOf('function localeForBusiness'))
 assert.match(businessCapture,/crm_tg_business_lead_capture_v1/)
 assert.doesNotMatch(businessCapture,/db\.query\(['"]select id,suppressed from app\.crm_contacts/)
 assert.doesNotMatch(businessCapture,/insert into app\.crm_contacts|insert into app\.crm_opportunities/)
 assert.match(sql,/SECURITY DEFINER SET search_path TO ''/i)
 assert.match(sql,/REVOKE ALL ON FUNCTION app_private\.crm_tg_business_lead_capture_v1/i)
 assert.match(sql,/GRANT EXECUTE ON FUNCTION app_private\.crm_tg_business_lead_capture_v1[\s\S]*TO hh_app_inbox/i)
 assert.doesNotMatch(sql,/GRANT\s+(?:SELECT|INSERT|UPDATE|ALL)\s+ON\s+app\.crm_contacts\s+TO\s+hh_app_inbox/i)
 assert.match(sql,/v_suppressed/i)
 assert.match(sql,/SELECT c\.id,c\.suppressed INTO v_contact,v_suppressed/i)
 assert.match(sql,/pg_advisory_xact_lock/i)
 assert.match(sql,/ON CONFLICT \(owner_id,email_hash\) DO NOTHING/i)
 assert.match(sql,/app\.crm_opportunities/i)
 assert.match(sql,/app\.crm_activity/i)
})

test('Business owner lookup uses only the granted private Telegram resolver',()=>{
 const businessHandler=capture.slice(capture.indexOf('export async function captureTelegramBusinessLead'))
 assert.match(businessHandler,/assertHolisticBusinessConnection/)
 assert.match(businessHandler,/telegramBotBusinessId\(env\)/)
 assert.match(businessHandler,/businessHash\('telegram',botId,config\)/)
 assert.match(businessHandler,/select owner_id from app_private\.crm_msg_resolve/)
 assert.doesNotMatch(businessHandler,/join app\.accounts|from app\.practitioners/)
 // The private definer still verifies the resolved owner against PRACTITIONER_ID.
 const migration=readFileSync(new URL('../supabase/migrations/20261119014500_hh_tg_business_lead_capture_v1.sql',import.meta.url),'utf8')
 assert.match(migration,/p\.id=p_practitioner_id AND p\.trusted_auth_user_id=p_owner_id/)
})
