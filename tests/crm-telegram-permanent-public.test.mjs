import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  channelTransportReady,telegramPilotReady,telegramPublicDiagnosticReady,messengerSetupStatus,
} from '../lib/crm/messenger-policy.js'
import {telegramDiagnosticReady,telegramDiagnosticPublicUrl,telegramPublicStartRequested} from '../lib/crm/telegram-diagnostic.mjs'
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const env=Object.freeze({
  VERCEL_ENV:'production',
  HH_CRM_MSG_TELEGRAM_ENABLED:'true',
  HH_CRM_TG_DIAGNOSTIC_ENABLED:'true',
  HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED:'true',
  HH_CRM_MSG_PRODUCTION_APPROVED:'false',
  HH_CRM_MSG_TELEGRAM_PILOT_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:'7654321',
  HH_CRM_MSG_TELEGRAM_TOKEN:'12345678:SYNTHETIC_TEST_ONLY_BOT_TOKEN_12345678',
  HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'TEST_WEBHOOK_SIGNING_SECRET',
  HH_CRM_MSG_TELEGRAM_USERNAME:'holistichouse_bot',
})
test('one scoped switch opens PERMANENT bot intake, never global Meta or old temporary guest pilot',()=>{
  assert.equal(telegramPublicDiagnosticReady(env),true)
  assert.equal(telegramPilotReady(env),false)
  assert.equal(channelTransportReady('telegram',env),true)
  assert.equal(telegramDiagnosticReady(env),true)
  assert.equal(telegramDiagnosticPublicUrl('ru',env),'https://t.me/holistichouse_bot?start=hhreview_ru')
  assert.equal(messengerSetupStatus('telegram',env).publicIntake,true)
  for(const channel of ['instagram','messenger','whatsapp'])
    assert.equal(channelTransportReady(channel,env),false)
  for(const key of ['HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED','HH_CRM_TG_DIAGNOSTIC_ENABLED',
    'HH_CRM_MSG_TELEGRAM_TOKEN','HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET']){
    const missing={...env}
    delete missing[key]
    assert.equal(telegramPublicDiagnosticReady(missing),false,key)
  }
  assert.equal(telegramPublicDiagnosticReady({...env,VERCEL_ENV:'preview'}),false)
  assert.equal(telegramPublicDiagnosticReady({...env,HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED:'false'}),false)
})
test('signed Telegram webhook remains mandatory; ordinary strangers need /start before consent',()=>{
  const source=file('lib/crm/messenger-webhook.js')
  assert.match(source,/verifyMessengerWebhook/)
  assert.match(source,/constantEqual/)
  for(const input of ['hello','photo','/agree','/stop','/start hhreview_ru extra'])
    assert.equal(telegramPublicStartRequested(input),false)
  assert.equal(telegramPublicStartRequested('/start'),true)
  assert.match(source,/publicIntake&&!previous/)
  assert.match(source,/telegramPublicStartRequested\(rawStop\)/)
  assert.match(source,/public-intake-admission/)
  assert.match(source,/created_at>now\(\)-interval '24 hours'/)
  assert.match(source,/Number\(admission\?\.total\|\|0\)>=100/)
  assert.match(source,/crm_tg_suppress_existing/)
  assert.match(source,/next\.body/)
  assert.match(source,/reply_count/)
})
test('manual response requires explicit server attestation of consented CRM session',()=>{
  const store=file('lib/crm/messenger-store.js')
  const route=file('app/api/app/crm/messenger/route.js')
  const provider=file('lib/crm/messenger-provider.js')
  assert.match(store,/diagnostic_consented/)
  assert.match(store,/telegramPublicDiagnosticReady\(\)/)
  assert.match(store,/approvedPublicDiagnostic:publicDiagnostic&&customerConsent&&check\.ok/)
  assert.match(route,/approvedPublicDiagnostic:dispatch\.approvedPublicDiagnostic===true/)
  assert.match(provider,/approvedPublicDiagnostic!==true/)
  assert.match(store,/MESSENGER_DAILY_LIMIT/)
})
test('owner sees a copyable canonical permanent Telegram URL, not an expiring invite',()=>{
  const page=file('components/app/messages-hub.jsx')
  const api=file('app/api/public/telegram-diagnostic/route.js')
  assert.match(api,/url:urls\.en\.split\('\?'\)\[0\]/)
  assert.match(page,/result\?\.available===true\?result\.url/)
  assert.match(page,/ownerAccountId&&telegramUrl/)
  assert.match(page,/navigator\.clipboard\.writeText\(telegramUrl\)/)
  assert.match(page,/telegramShare:'Ссылка Telegram'/)
  assert.doesNotMatch(page,/guestInvites|15 минут|expiresAt/)
})
