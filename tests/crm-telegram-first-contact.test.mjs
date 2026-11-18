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
  assert.match(capture,/on conflict\(owner_id,email_hash\) do nothing/)
  assert.match(capture,/app\.crm_opportunities/)
  assert.doesNotMatch(capture,/marketing_opt_in_at|crm_consent_ledger|sendOneMessengerMessage/)
  assert.match(capture,/replyConsent:null,marketingConsent:false/)
})
