import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  telegramOwnerPilotLinks,telegramPilotReady,channelTransportReady,messengerSetupStatus,
} from '../lib/crm/messenger-policy.js'
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const env={
  VERCEL_ENV:'production',
  HH_CRM_MSG_TELEGRAM_TOKEN:'12345678:FAKE_BOTFATHER_TOKEN_FOR_TEST_ONLY',
  HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'SYNTHETIC_TEST_SECRET_2026',
  HH_CRM_MSG_TELEGRAM_BOT_ID:'12345678',
  HH_CRM_MSG_TELEGRAM_USERNAME:'holistichouse_bot',
  HH_CRM_MSG_TELEGRAM_ENABLED:'true',
  HH_CRM_TG_DIAGNOSTIC_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_PILOT_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:'123456789',
}
test('verified owner-only Telegram pilot URL contains no private chat identifiers or tokens',()=>{
  assert.equal(telegramPilotReady(env),true)
  assert.equal(channelTransportReady('telegram',env),true)
  const urls=telegramOwnerPilotLinks(env)
  assert.deepEqual(urls,{
    en:'https://t.me/holistichouse_bot?start=hhreview_en',
    ru:'https://t.me/holistichouse_bot?start=hhreview_ru',
    es:'https://t.me/holistichouse_bot?start=hhreview_es',
  })
  assert.deepEqual(messengerSetupStatus('telegram',env).pilotLinks,urls)
  assert.equal(JSON.stringify(urls).includes('123456789'),false)
  assert.equal(JSON.stringify(urls).includes('TEST_SECRET'),false)
  assert.equal(JSON.stringify(urls).includes('FAKE_BOTFATHER'),false)
})
test('pilot link is absent until exact single-recipient and BotFather security gates',()=>{
  const unavailable=[
    {...env,HH_CRM_MSG_TELEGRAM_PILOT_ENABLED:'false'},
    {...env,HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:''},
    {...env,HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:'not-an-id'},
    {...env,HH_CRM_MSG_TELEGRAM_ENABLED:'false'},
    {...env,HH_CRM_MSG_TELEGRAM_TOKEN:'invalid'},
    {...env,HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:''},
    {...env,HH_CRM_MSG_TELEGRAM_USERNAME:'wrong.example'},
    {...env,HH_CRM_MSG_TELEGRAM_USERNAME:'not_the_expected_suffix'},
    {...env,HH_CRM_MSG_TELEGRAM_BOT_ID:'99999999'},
    {...env,HH_CRM_MSG_PRODUCTION_APPROVED:'true'},
    {...env,VERCEL_ENV:'preview'},
  ]
  for(const entry of unavailable){
    assert.equal(telegramOwnerPilotLinks(entry),null)
    assert.equal(messengerSetupStatus('telegram',entry).pilotLinks,undefined)
  }
  for(const channel of ['whatsapp','instagram','messenger']){
    assert.equal(messengerSetupStatus(channel,env).pilotLinks,undefined)
  }
})
test('owner CRM only shows links on registered connected pilot, never public landing',()=>{
  const ui=file('components/app/crm-messenger.jsx')
  const route=file('app/api/app/crm/messenger/route.js')
  const publicRoute=file('app/api/public/telegram-diagnostic/route.js')
  const policy=file('lib/crm/messenger-policy.js')
  assert.match(ui,/channel\.channel==='telegram'&&ok&&isPilot&&channel\.pilotLinks\?\.\[lang\]/)
  assert.match(ui,/rel="noopener noreferrer nofollow"/)
  assert.match(ui,/referrerPolicy="no-referrer"/)
  assert.match(ui,/\/agree/)
  assert.match(ui,/\/stop/)
  assert.match(route,/auth\.verified\(\)/)
  assert.match(route,/practitionerEmailAllowed\(actor\)/)
  assert.match(route,/x-hh-account-id/)
  assert.match(publicRoute,/telegramDiagnosticPublicUrl/)
  assert.match(policy,/telegramOwnerPilotLinks/)
  assert.doesNotMatch(ui,/HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:\s*['"]\d+/)
  assert.doesNotMatch(publicRoute,/telegramOwnerPilotLinks/)
})
