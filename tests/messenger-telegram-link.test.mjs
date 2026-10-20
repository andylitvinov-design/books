import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validClientBotUsername,telegramClientLinkReady,telegramClientSendReady,
 interpretTelegramClientUpdate,telegramClientMessage} from '../lib/app/client-telegram-policy.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('dedicated bot needs explicit setup and dispatch approval',()=>{
 const e={HH_CLIENT_TG_LINK_ENABLED:'true',HH_CLIENT_TG_BOT_TOKEN:'synthetic-secret-for-unit-tests',
 HH_CLIENT_TG_BOT_USERNAME:'HolisticHouseNoticeBot',HH_CLIENT_TG_WEBHOOK_SECRET:'x'.repeat(40)}
 assert.equal(validClientBotUsername(e.HH_CLIENT_TG_BOT_USERNAME),true)
 assert.equal(telegramClientLinkReady(e),true)
 assert.equal(telegramClientSendReady(e),false)
 assert.equal(telegramClientSendReady({...e,HH_CLIENT_TG_SEND_APPROVED:'true'}),true)
 assert.equal(telegramClientLinkReady({...e,HH_CLIENT_TG_LINK_ENABLED:'false'}),false)
})
test('bot start and STOP are private and linked to verified chat identity',()=>{
 const msg={chat:{type:'private',id:12345678},from:{id:12345678},text:'/start '+'a'.repeat(32),date:1792500000}
 assert.equal(interpretTelegramClientUpdate({update_id:17,message:msg}).type,'link')
 assert.equal(interpretTelegramClientUpdate({update_id:18,message:{...msg,text:'/stop'}}).type,'stop')
 assert.equal(interpretTelegramClientUpdate({update_id:19,message:{...msg,from:{id:9999}}}),null)
 assert.equal(interpretTelegramClientUpdate({update_id:20,message:{...msg,chat:{type:'group',id:12345678}}}),null)
})
test('outbound notices have only neutral cabinet deep links',()=>{
 const uuid='11111111-1111-4111-8111-111111111111'
 assert.match(telegramClientMessage('en',uuid),/holistichouse\.vercel\.app\/en\/app\/consultations/)
 assert.throws(()=>telegramClientMessage('ru','http://fake.invalid'))
})
test('private schema, webhook, and server dispatch use distinct scoped gates',()=>{
 const sql=read('supabase/migrations/20261020162323_hh_client_telegram_verified_notifications_20261020.sql')
 assert.match(sql,/FORCE ROW LEVEL SECURITY/i)
 assert.match(sql,/ON CONFLICT DO NOTHING/i)
 assert.match(sql,/notification_tg_message_claim/)
 const webhook=read('lib/app/client-telegram-webhook.js')
 const route=read('app/api/app/notification-channels/telegram/webhook/route.js')
 const dispatcher=read('lib/app/client-telegram-dispatch.js')
 assert.match(webhook,/set local role hh_app_inbox/)
 assert.match(route,/verifyClientTelegramSecret/)
 assert.match(dispatcher,/notification_tg_dispatch_allowed/)
 assert.match(dispatcher,/telegramClientSendReady/)
 assert.match(read('app/api/app/practitioner-client-messages/route.js'),/dispatchClientTelegramNotification\(config,id\)/)
})

test('owner activation is scoped to existing private CRM integrations, never public subscriber settings',()=>{
 const owner=read('components/app/customer-telegram-bot-setup.jsx')
 const manager=read('components/app/crm-manager.jsx')
 const setup=read('app/api/app/notification-channels/telegram/setup/route.js')
 assert.match(manager,/CustomerTelegramBotSetup/)
 assert.match(owner,/missingKeys/)
 assert.match(owner,/t\.openVercel/)
 assert.match(owner,/BotFather/)
 assert.match(owner,/notification-channels\/telegram\/setup/)
 assert.match(setup,/practitionerEmailAllowed/)
 assert.match(setup,/requireSameOrigin/)
})

test('pending Telegram usernames remain saveable until dedicated bot is configured',()=>{
 const view=read('components/app/messenger-notification-settings.jsx')
 assert.match(view,/isTelegram&&!ready/)
 assert.match(view,/t\.telegramLabel/)
 assert.match(view,/t\.saveTelegram/)
 assert.match(view,/perform\(channel,'save'\)/)
 assert.match(view,/perform\(channel,'begin_telegram'\)/)
})

test('owner sees a read-only Telegram setup readiness check without secrets',()=>{
 const route=read('app/api/app/notification-channels/telegram/setup/route.js')
 const screen=read('components/app/customer-telegram-bot-setup.jsx')
 assert.match(route,/export const GET=handler/)
 assert.match(route,/export const POST=handler/)
 assert.match(route,/missingKeys/)
 assert.match(route,/verifyClientBot\(process\.env,\{requireWebhook:true\}\)/)
 assert.match(route,/practitionerEmailAllowed/)
 assert.match(route,/requireSameOrigin/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.match(screen,/\/api\/app\/notification-channels\/telegram\/setup/)
 assert.match(screen,/vercel\.com\/super10\/codex-public-book-library\/settings\/environment-variables/)
 assert.match(screen,/missingKeys\.map/)
 assert.match(screen,/state\.webhookVerified/)
 assert.match(screen,/state\.sendingEnabled/)
 // No token values or forced delivery toggles may exist in a client component.
 assert.doesNotMatch(screen,/HH_CLIENT_TG_BOT_TOKEN=|HH_CLIENT_TG_SEND_APPROVED=true/)
})
