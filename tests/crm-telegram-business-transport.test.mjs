import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {channelTransportReady,telegramBusinessTransportReady} from '../lib/crm/messenger-policy.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const env=Object.freeze({
 VERCEL_ENV:'production',HH_CRM_TG_CHAT_AUTOMATION_ENABLED:'true',
 HH_CRM_MSG_TELEGRAM_ENABLED:'true',
 HH_CRM_MSG_TELEGRAM_TOKEN:'12345678:TEST_FAKE_BOTFATHER_TOKEN_FOR_UNIT_ONLY',
 HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'TEST_SECRET_UNIT_20261118',
 HH_CRM_MSG_TELEGRAM_USERNAME:'holistichouse_bot',
})
test('Business auto-replies do not enable unapproved generic Telegram bot transport',()=>{
 assert.equal(channelTransportReady('telegram',env),false)
 assert.equal(telegramBusinessTransportReady(env),true)
 for(const bad of [
  {...env,VERCEL_ENV:'preview'},
  {...env,HH_CRM_TG_CHAT_AUTOMATION_ENABLED:'false'},
  {...env,HH_CRM_MSG_TELEGRAM_ENABLED:'false'},
  {...env,HH_CRM_MSG_TELEGRAM_TOKEN:''},
  {...env,HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:''},
  {...env,HH_CRM_MSG_TELEGRAM_BOT_ID:'99999999'},
  {...env,HH_CRM_MSG_TELEGRAM_USERNAME:'other_bot'},
 ])assert.equal(telegramBusinessTransportReady(bad),false)
})
test('the fallback webhook accepts only authenticated Business update shapes',()=>{
 const src=read('lib/crm/messenger-webhook.js')
 const block=src.slice(src.indexOf('export function verifyMessengerWebhook'),
   src.indexOf('export function verifyMessengerChallenge'))
 assert.match(block,/telegramBusinessTransportReady\(env\)/)
 assert.ok(block.indexOf('x-telegram-bot-api-secret-token')<block.indexOf('JSON.parse'))
 assert.match(block,/business_message/)
 assert.match(block,/business_connection/)
 assert.match(block,/Number.isSafeInteger\(update\?\.update_id\)/)
 assert.doesNotMatch(block,/setWebhook|deleteWebhook|drop_pending_updates/)
})
test('Business lead and secretary reply keep the official Telegram permission gate',()=>{
 const lead=read('lib/crm/telegram-lead-capture.js')
 const provider=read('lib/crm/messenger-provider.js')
 const sec=read('lib/crm/telegram-secretary-service.js')
 const request=read('lib/assist/telegram-business-request.mjs')
 const bot=lead.slice(lead.indexOf('export async function captureTelegramBotLead'),
   lead.indexOf('export async function captureTelegramBusinessLead'))
 const business=lead.slice(lead.indexOf('export async function captureTelegramBusinessLead'))
 const send=provider.slice(provider.indexOf('export async function assertHolisticBusinessConnection'),
   provider.indexOf('// Send a one-time visual greeting'))
 assert.match(bot,/!channelTransportReady\('telegram',env\)/)
 assert.match(business,/!telegramBusinessTransportReady\(env\)/)
 assert.equal((send.match(/!telegramBusinessTransportReady\(env\)/g)||[]).length,2)
 assert.match(provider,/getBusinessConnection/)
 assert.match(request,/connection.rights\?\.can_reply!==true/)
 assert.match(sec,/!telegramBusinessTransportReady\(env\)/)
})
