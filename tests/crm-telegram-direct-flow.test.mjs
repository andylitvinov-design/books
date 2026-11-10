import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'
import {telegramDirectChatReady,telegramDirectChatStartLocale,
 telegramDirectChatAgree,telegramDirectChatPrompt} from '../lib/crm/telegram-direct-chat.mjs'
import {validateMessageText} from '../lib/crm/messenger-policy.js'
const hook=readFileSync(new URL('../lib/crm/messenger-webhook.js',import.meta.url),'utf8')
const start=hook.indexOf('export async function processTelegramDiagnostic(')
const end=hook.indexOf('export async function processWhatsAppDiagnostic(',start)
// Extract the Telegram production function only; unrelated signed WhatsApp
// handlers are separately exercised by CRM tests and may use module exports.
assert.ok(start>0&&end>start)
const source=hook.slice(start,end).replace(/^export /,'')
const env={
 VERCEL_ENV:'production',HH_CRM_TG_DIRECT_CHAT_ENABLED:'true',
 HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED:'true',HH_CRM_TG_DIAGNOSTIC_ENABLED:'true',
 HH_CRM_MSG_TELEGRAM_ENABLED:'true',HH_CRM_MSG_TELEGRAM_TOKEN:'123456789:'+ 'x'.repeat(35),
 HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'test_approved_secret',
 HH_CRM_MSG_TELEGRAM_USERNAME:'HolisticHouseBot',
}
const event=(text,id=20)=>({
 type:'incoming',userId:'123456789',eventId:'tg:'+id,rawText:text,
 photoFileId:null,photoBytes:null,name:'Synthetic guest',language:'en',
 body:text,messageId:'tg:123456789:'+id,sentAt:Date.now(),
})
function fixture(prior=null,overrides={}){
 const calls={sql:[],ingest:[],suppressed:0}
 const db={async query(sql,args=[]){
   calls.sql.push({sql,args})
   if(sql.includes('from app_private.crm_msg_resolve'))
     return {rows:[{owner_id:'11111111-1111-4111-8111-111111111111',
       account_id:'22222222-2222-4222-8222-222222222222'}]}
   if(sql.includes('app_private.hh_crm_direct_contact_suppressed($1,$2)'))
     return {rows:[{blocked:overrides.blocked===true}]}
   if(sql.includes('from app_private.crm_tg_diagnostic_sessions')&&sql.includes('for update'))
     return {rows:prior?[prior]:[]}
   if(sql.includes('count(*)::int as total')&&sql.includes('crm_tg_diagnostic_sessions'))
     return {rows:[{total:0}]}
   if(sql.includes('crm_tg_suppress_existing'))calls.suppressed++
   return {rows:[],rowCount:1}
 }}
 const context=vm.createContext({
  process:{env:{}},Date,Number,String,Math,Buffer,AppError:Error,Set,
  telegramDiagnosticReady:()=>true,channelTransportReady:()=>true,
  telegramBotBusinessId:()=> '123456789',
  businessHash:()=> 'a'.repeat(64),operationHash:()=> 'b'.repeat(64),
  telegramPilotReady:()=>false,telegramPublicDiagnosticReady:()=>true,
  telegramDirectChatReady,telegramDirectChatStartLocale,telegramDirectChatAgree,
  telegramDirectChatPrompt,validateMessageText,telegramPublicStartRequested:
    raw=>/^\/start(?:@[A-Za-z0-9_]{5,32})?(?:\s+hhreview_(?:en|ru|es))?$/i.test(raw),
  verifyTelegramSecondAccountInvite:()=>null,
  telegramMarketingIntent:()=>null,telegramMarketingActive:()=>false,
  telegramInlineActionAllowed:action=>['v1:agree','v1:stop'].includes(action),
  webhookTransaction:async(_config,fn)=>fn(db),
  ingestMessengerEventInTransaction:async(_db,channel,ev)=>{calls.ingest.push({channel,ev});return true},
  transitionTelegramDiagnostic:()=>{throw new Error('DIAGNOSTIC_FLOW_WAS_WRONGLY_USED')},
 },{codeGeneration:{strings:false,wasm:false}})
 vm.runInContext(source,context,{timeout:1000})
 return {calls,run:(ev,e=env)=>context.processTelegramDiagnostic(ev,{},e)}
}
test('signed owner bot direct /start prompts but does not create an unconsented CRM lead',async()=>{
 const {calls,run}=fixture()
 const result=await run(event('/start hhtalk_en'))
 assert.equal(result.handled,true)
 assert.equal(result.locale,'en')
 assert.match(result.reply,/\/agree/)
 assert.deepEqual(JSON.parse(JSON.stringify(result.keyboard)),[['/agree_direct','/stop']])
 assert.equal(calls.ingest.length,0)
 assert.equal(calls.sql.filter(x=>x.sql.includes('insert into app_private.crm_tg_diagnostic_sessions')).length,1)
 const write=calls.sql.find(x=>x.sql.includes('insert into app_private.crm_tg_diagnostic_sessions'))
 assert.ok(write.sql.includes('chat_mode'))
 assert.equal(write.args[2],'consent')
})
test('a prior direct chat requires /agree before first message is encrypted into CRM',async()=>{
 const prior={stage:'consent',chat_mode:'direct',locale:'en',consent_at:null,
  last_update_id:18,reply_day:new Date(),reply_count:1,flow_version:1,topic:null}
 const {calls,run}=fixture(prior)
 const denied=await run(event('Hello before agreeing'))
 assert.equal(denied.handled,true);assert.equal(calls.ingest.length,0)
 const accepted=await run(event('/agree',21))
 assert.equal(accepted.handled,true)
 assert.equal(calls.ingest.length,1)
 assert.equal(calls.ingest[0].channel,'telegram')
 assert.match(calls.ingest[0].ev.body,/reply consent/)
 const transitions=calls.sql.filter(x=>x.sql.includes('set stage=$3,consent_at=$4'))
 assert.ok(transitions.length>=2,'both pre-consent and accepted transitions must be recorded')
 assert.equal(transitions[0].args[2],'consent','unapproved message must stay unconsented')
 const changed=transitions.at(-1)
 assert.equal(changed.args[2],'done','explicit /agree must complete the consent transition')
 assert.ok(changed.args[3],'explicit agreement must set consent time')
})
test('a consenting direct client message uses the same encrypted CRM provider ingestion',async()=>{
 const prior={stage:'done',chat_mode:'direct',locale:'en',
  consent_at:new Date().toISOString(),last_update_id:18,reply_day:new Date(),
  reply_count:2,flow_version:1,topic:null}
 const {calls,run}=fixture(prior)
 const result=await run(event('Hello, please contact me'))
 assert.equal(result.handled,true)
 assert.equal(calls.ingest.length,1)
 assert.equal(calls.ingest[0].ev.body,'Hello, please contact me')
 assert.equal(calls.sql.some(x=>x.sql.includes('last_update_id=$3,updated_at=now()')),true)
})
test('STOP revokes and disabled rollout suppresses personal text without CRM ingestion',async()=>{
 const prior={stage:'done',chat_mode:'direct',locale:'en',
  consent_at:new Date().toISOString(),last_update_id:18,reply_day:new Date(),
  reply_count:1,flow_version:1,topic:null}
 const {calls,run}=fixture(prior)
 const stopped=await run(event('/stop'))
 assert.match(stopped.reply,/Contact stopped/)
 assert.equal(calls.suppressed,1)
 assert.equal(calls.ingest.length,0)
 const noFeature=await run(event('Hello',21),{...env,HH_CRM_TG_DIRECT_CHAT_ENABLED:'false'})
 assert.equal(noFeature.handled,true)
 assert.equal(calls.ingest.length,0)
})
test('unknown guest text and disabled deep links cannot create direct-contact sessions',async()=>{
 const {calls,run}=fixture()
 assert.equal((await run(event('Hello there'))).handled,true)
 assert.equal(calls.ingest.length,0)
 assert.equal(calls.sql.some(x=>x.sql.includes('insert into app_private.crm_tg_diagnostic_sessions')),false)
 const disabled=await run(event('/start hhtalk_en',21),
   {...env,HH_CRM_TG_DIRECT_CHAT_ENABLED:'false'})
 assert.equal(disabled.handled,true)
 assert.equal(calls.ingest.length,0)
})

test('a stopped contact cannot be silently reactivated by a new deep link or /agree',async()=>{
 const prior={stage:'stopped',chat_mode:'direct',locale:'en',
  consent_at:new Date().toISOString(),last_update_id:18,reply_day:new Date(),
  reply_count:1,flow_version:1,topic:null}
 const {calls,run}=fixture(prior)
 const restarted=await run(event('/start hhtalk_en',20))
 assert.equal(restarted.handled,true)
 assert.match(restarted.reply,/separate support review/)
 assert.equal(calls.ingest.length,0)
 assert.equal(calls.sql.some(x=>x.sql.includes('insert into app_private.crm_tg_diagnostic_sessions')),false)
 const after=await run(event('/agree',21))
 assert.equal(after.handled,true)
 assert.equal(calls.ingest.length,0)
});

test('diagnostic consent cannot silently authorize the new direct conversation',async()=>{
 const fromQuestionnaire={stage:'done',chat_mode:'diagnostic',locale:'en',
  consent_at:new Date().toISOString(),last_update_id:18,reply_day:new Date(),
  reply_count:3,flow_version:2,topic:'other'}
 const {calls,run}=fixture(fromQuestionnaire)
 const opened=await run(event('/start hhtalk_en'))
 assert.equal(opened.handled,true)
 assert.match(opened.reply,/\/agree/)
 const write=calls.sql.find(x=>x.sql.includes('insert into app_private.crm_tg_diagnostic_sessions'))
 assert.equal(write.args[2],'consent')
 assert.equal(write.args[5],null,'existing questionnaire consent is not reused')
 assert.equal(calls.ingest.length,0)
})
test('existing owner block on thread or contact stops messages even while session consent is active',async()=>{
 const active={stage:'done',chat_mode:'direct',locale:'en',
  consent_at:new Date().toISOString(),last_update_id:18,reply_day:new Date(),
  reply_count:1,flow_version:1}
 const {calls,run}=fixture(active,{blocked:true})
 const eventResult=await run(event('Please send my message'))
 assert.equal(eventResult.handled,true)
 assert.equal(calls.ingest.length,0)
 assert.equal(calls.sql.some(x=>x.sql.includes('last_update_id=$3,updated_at=now()')),false)
})
test('direct chat refuses unrelated old inline callback actions',async()=>{
 const active={stage:'consent',chat_mode:'direct',locale:'ru',
  consent_at:null,last_update_id:18,reply_day:new Date(),
  reply_count:1,flow_version:1}
 const {calls,run}=fixture(active)
 const wrong=event('/agree',24)
 wrong.inlineAction='v2:yes';wrong.inlineLocale='en'
 const result=await run(wrong)
 assert.equal(result.handled,true)
 assert.equal(calls.ingest.length,0)
})
test('companion AI does not steal plain text from a newer explicitly selected direct chat',()=>{
 const source=readFileSync(new URL('../lib/crm/telegram-companion-service.js',import.meta.url),'utf8')
 assert.match(source,/const explicitCompanion=Boolean\(selected/)
 assert.match(source,/crm_tg_diagnostic_sessions s/)
 assert.match(source,/direct\?\.chat_mode==='direct'/)
 assert.match(source,/Number\(direct.last_update_id\)>=Number\(row.last_update_id\)/)
 assert.ok(source.indexOf("crm_tg_diagnostic_sessions s") <
  source.indexOf("if(!selected&&!stop&&!diagnostic&&(!row"))
})

test('only purpose-bound messenger callback verifies a direct session',async()=>{
 const prior={stage:'consent',chat_mode:'direct',locale:'en',consent_at:null,
  last_update_id:18,reply_day:new Date(),reply_count:0,flow_version:1}
 const bad=fixture(prior)
 const oldCallback=event('/agree',21)
 oldCallback.inlineAction='v1:agree';oldCallback.inlineLocale=null
 assert.equal((await bad.run(oldCallback)).handled,true)
 assert.equal(bad.calls.ingest.length,0)
 const good=fixture(prior)
 const correct=event('/agree',22)
 correct.inlineAction='direct:agree';correct.inlineLocale='en'
 assert.equal((await good.run(correct)).handled,true)
 assert.equal(good.calls.ingest.length,1)
})
