import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('owner pilot cannot name an arbitrary recipient, message or channel',()=>{
 const route=read('app/api/app/notification-channels/telegram/test/route.js')
 assert.match(route,/export async function POST/)
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/createRequestAuth\(request,config\)/)
 assert.match(route,/auth\.verified\(\)/)
 assert.match(route,/practitionerEmailAllowed\(actor\)/)
 assert.match(route,/x-hh-account-id/)
 assert.match(route,/request\.body!==null/)
 assert.doesNotMatch(route,/arrayBuffer\(\)/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.match(route,/sendOwnerTelegramPilot\(config,actor\)/)
 assert.doesNotMatch(route,/request\.json\(|chatId|recipientId|sendMessage/)
})

test('rate-limited manual pilot derives ONLY signed-in owner verified Telegram chat',()=>{
 const service=read('lib/app/client-telegram-owner-pilot.js')
 assert.match(service,/telegramClientLinkReady/)
 assert.match(service,/verifyClientBot\(env,\{requireWebhook:true\}\)/)
 assert.match(service,/transaction\(config,actor/)
 assert.match(service,/from app_private\.notification_telegram_links l/)
 assert.match(service,/l\.account_id=\$1/)
 assert.match(service,/n\.topics->>'messages'='true'/)
 assert.match(service,/l\.consent_version='hh-tg-message-alerts-v1'/)
 assert.match(service,/openSealed\(/)
 assert.match(service,/consumeRate\(config,\{scope:'hh-client-telegram-owner-test',ownerId:actor\.id\},1,600\)/)
 assert.match(service,/l\.chat_hash=\$2/)
 assert.match(service,/sendOwnerTelegramTestMessage\(/)
 assert.doesNotMatch(service,/HH_CLIENT_TG_SEND_APPROVED='true'|process\.env\.HH_CLIENT_TG_SEND_APPROVED\s*=/)
 assert.doesNotMatch(service,/from app\.crm_contacts|from app\.assessment_results/)
})

test('provider sends fixed neutral TEST text only after manual owner action',()=>{
 const provider=read('lib/app/client-telegram-transport.js')
 const portion=provider.slice(provider.indexOf('export async function sendOwnerTelegramTestMessage'))
 assert.match(portion,/telegramClientLinkReady/)
 assert.match(portion,/chat_id:chatId/)
 assert.match(portion,/sendMessage/)
 assert.match(portion,/disable_web_page_preview:true/)
 assert.match(portion,/test notification|тестовое уведомление/)
 assert.doesNotMatch(portion,/telegramClientSendReady\(/)
 assert.doesNotMatch(portion,/diagnosis|test score|health results|prescription/i)
})

test('CRM status and pilot action disclose neither chat ID nor bot secret',()=>{
 const setup=read('app/api/app/notification-channels/telegram/setup/route.js')
 const ui=read('components/app/customer-telegram-bot-setup.jsx')
 assert.match(setup,/createMessengerNotificationRepository\(config\)\.state\(actor\)/)
 assert.match(setup,/state\.ownerLinked=own\.channels\?\.telegram\?\.status==='connected'/)
 assert.match(ui,/notification-channels\/telegram\/test/)
 assert.match(ui,/state\?\.ownerLinked/)
 assert.match(ui,/state\?\.webhookVerified/)
 assert.match(ui,/providerAccepted/)
 assert.match(ui,/t\.testAccepted/)
 assert.match(ui,/t\.testRate/)
 assert.doesNotMatch(ui,/HH_CLIENT_TG_BOT_TOKEN=[A-Za-z0-9]/)
})
