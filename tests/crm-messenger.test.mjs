import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {canReply,channelTransportReady,validateMessageText,MESSENGER_CHANNELS} from '../lib/crm/messenger-policy.js'
const root=new URL('..',import.meta.url)
const source=path=>readFileSync(new URL(path,root),'utf8')
test('only supported official messenger channels',()=>{
  assert.deepEqual(MESSENGER_CHANNELS,['telegram','whatsapp','instagram','messenger'])
  assert.deepEqual(canReply({channel:'unknown',lastInboundAt:new Date().toISOString(),enabled:true,suppressed:false}).reason,'INVALID_CHANNEL')
})
test('messenger channels fail closed in production without credentials and explicit approval',()=>{
  for(const channel of MESSENGER_CHANNELS){
    assert.equal(channelTransportReady(channel,{VERCEL_ENV:'production'}),false)
    assert.equal(channelTransportReady(channel,{VERCEL_ENV:'production',HH_CRM_MSG_PRODUCTION_APPROVED:'true'}),false)
  }
})
test('customer must have initiated contact; opt-out blocks any reply',()=>{
  for(const channel of MESSENGER_CHANNELS){
    assert.equal(canReply({channel,lastInboundAt:null,enabled:true}).ok,false)
    assert.equal(canReply({channel,lastInboundAt:new Date().toISOString(),enabled:true,suppressed:true}).reason,'CONTACT_BLOCKED')
  }
})
test('Meta user reply window is conservative and Telegram does not invent delivery receipts',()=>{
  const now=Date.parse('2026-10-18T18:00:00Z')
  const twoHoursAgo=new Date(now-2*3600000).toISOString()
  const dayAgo=new Date(now-24*3600000).toISOString()
  for(const channel of ['whatsapp','instagram','messenger']){
    assert.equal(canReply({channel,lastInboundAt:twoHoursAgo,enabled:true,now}).ok,true)
    assert.equal(canReply({channel,lastInboundAt:dayAgo,enabled:true,now}).reason,'REPLY_WINDOW_CLOSED')
  }
  assert.equal(canReply({channel:'telegram',lastInboundAt:dayAgo,enabled:true,now}).ok,true)
})
test('outbound message validation enforces length, secret protection and health-safety boundary',()=>{
  assert.equal(validateMessageText('  Thank you for reaching out.  '),'Thank you for reaching out.')
  for(const text of ['', '  ', 'x'.repeat(1201), 'https://holistichouse.vercel.app/en/client/abc#very-long-token-1234567890',
    'Your prescription is ready: 30c', 'Результаты анализа и диагноз: ...']){
    assert.throws(()=>validateMessageText(text))
  }
})
test('webhook entrypoints require verified signatures, no client-side provider tokens or trust based on display name',()=>{
  const webhook=source('lib/crm/messenger-webhook.js')
  const api=source('app/api/app/crm/messenger/route.js')
  const db=source('supabase/migrations/20261018185711_hh_crm_messenger_core_20261018.sql')
  const ui=source('components/app/crm-messenger.jsx')
  assert.match(webhook,/timingSafeEqual/)
  assert.match(webhook,/x-hub-signature-256/)
  assert.match(webhook,/x-telegram-bot-api-secret-token/)
  assert.match(api,/practitionerEmailAllowed/)
  assert.match(api,/requireSameOrigin/)
  assert.match(db,/FORCE ROW LEVEL SECURITY/g)
  assert.match(db,/SECURITY DEFINER/g)
  assert.match(db,/hh_app_inbox/)
  assert.doesNotMatch(ui,/HH_CRM_MSG_(TELEGRAM_TOKEN|WHATSAPP_TOKEN)/)
})
test('all sends are owner-confirmed, single-recipient and idempotent; no automated campaigns',()=>{
  const store=source('lib/crm/messenger-store.js')
  const api=source('app/api/app/crm/messenger/route.js')
  assert.match(store,/requestId/)
  assert.match(store,/providerMessageHash/)
  assert.match(store,/MESSENGER_DAILY_LIMIT/)
  assert.match(api,/action==='send'/)
  assert.doesNotMatch(api,/sendBulk|sendCampaign|setInterval|auto.?send/i)
})
