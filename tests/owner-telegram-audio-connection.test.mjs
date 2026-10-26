import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=relative=>readFileSync(new URL(relative,import.meta.url),'utf8')
test('owner-only webhook health endpoint uses existing secrets and refuses foreign webhooks',()=>{
  const route=read('../app/api/admin/materials/telegram/connection/route.js')
  const transport=read('../lib/app/client-telegram-transport.js')
  assert.match(route,/ownerMaterialRequest\(request/)
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/verifyClientBot\(env,\{requireWebhook:true\}\)/)
  assert.match(route,/registerClientTelegramWebhook\(process\.env,\{config\}\)/)
  assert.match(route,/telegramClientBotMode\(process\.env\)!=='shared_practice'/)
  assert.match(route,/webhookVerified:true/)
  assert.doesNotMatch(route,/HH_PRACTICE_TG_BOT_TOKEN|\.token\b|chatId|body:\s*JSON\.stringify/)
  assert.match(transport,/TELEGRAM_WEBHOOK_ALREADY_IN_USE/)
  assert.match(transport,/await verifyOwnerTelegram\(paired\)/)
  assert.match(transport,/drop_pending_updates:false/)
  assert.match(transport,/allowed_updates:\['message','callback_query'\]/)
})
test('materials UI verifies connection, does not imply a confirmed Telegram receipt',()=>{
  const ui=read('../components/admin-telegram-audio.jsx')
  const css=read('../components/admin-telegram-audio.module.css')
  assert.match(ui,/data-owner-telegram-connection/)
  assert.match(ui,/method:'POST',credentials:'same-origin'/)
  assert.match(ui,/const verified=await fetch\('\/api\/admin\/materials\/telegram\/connection'/)
  assert.match(ui,/data\?\.webhookVerified!==true/)
  assert.match(ui,/repairConnection/)
  assert.match(ui,/\/audio/)
  assert.match(ui,/\/done/)
  for(const lang of ['ru','en','es'])assert.match(ui,new RegExp(''+lang+':\\{'))
  assert.match(css,/\.connectionActions button/)
  assert.match(css,/min-height:44px/)
})
