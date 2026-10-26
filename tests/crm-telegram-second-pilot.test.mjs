import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  telegramSecondAccountInvite,verifyTelegramSecondAccountInvite,
  TELEGRAM_SECOND_PILOT_ACCESS_MS,
} from '../lib/crm/telegram-second-pilot.mjs'

const config={encryptionKey:Buffer.alloc(32,0x76)}
const ownerId='11111111-1111-4111-8111-111111111111'
const otherOwner='22222222-2222-4222-8222-222222222222'
const now=Date.parse('2026-10-26T16:00:35Z')
const env={
  VERCEL_ENV:'production',HH_CRM_MSG_TELEGRAM_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_TOKEN:'12345678:TEST_FAKE_BOTFATHER_TOKEN_FOR_UNIT_ONLY',
  HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'TEST_SECRET_ONLY',
  HH_CRM_MSG_TELEGRAM_USERNAME:'holistichouse_bot',
  HH_CRM_TG_DIAGNOSTIC_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_PILOT_ENABLED:'true',
  HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:'123456789',
}
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const invite=(locale='ru')=>telegramSecondAccountInvite({ownerId,locale,config,env,now})
const verify=(text,overrides={})=>verifyTelegramSecondAccountInvite(text,
  {ownerId,config,env,now,...overrides})

test('owner invitation is private, short-lived, tied to account and bot, not a public CTA',()=>{
  for(const locale of ['en','ru','es']){
    const generated=invite(locale)
    const url=new URL(generated.url)
    const payload=url.searchParams.get('start')
    assert.equal(url.hostname,'t.me')
    assert.equal(url.pathname,'/holistichouse_bot')
    assert.match(payload,new RegExp('^hhpilot_'+locale+'_'))
    assert.ok(payload.length<=64)
    assert.ok(!generated.url.includes(ownerId))
    assert.ok(!generated.url.includes(env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID))
    assert.ok(!generated.url.includes('TEST_FAKE'))
    assert.equal(verify('/start '+payload)?.locale,locale)
    assert.equal(verify('/start '+payload)?.accessUntil,
      new Date(now+TELEGRAM_SECOND_PILOT_ACCESS_MS).toISOString())
    assert.equal(verify('/start@holistichouse_bot '+payload)?.locale,locale)
    assert.ok(Date.parse(generated.expiresAt)-now<=15*60*1000)
  }
})
test('invalid, stale, future, replayed with other owner/bot/key or altered invitation fails closed',()=>{
  const payload=new URL(invite().url).searchParams.get('start')
  for(const text of [
    '/start', '/start hhreview_ru','/start '+payload+'garbage',
    '/start '+payload.slice(0,-1)+'X', '/start '+payload.replace('_ru_','_en_'),
  ])assert.equal(verify(text),null)
  assert.equal(verify('/start '+payload,{now:now+17*60*1000}),null)
  assert.equal(verify('/start '+payload,{now:now-17*60*1000}),null)
  assert.equal(verify('/start '+payload,{ownerId:otherOwner}),null)
  assert.equal(verify('/start '+payload,{config:{encryptionKey:Buffer.alloc(32,0)}}),null)
  assert.equal(verify('/start '+payload,{env:{...env,HH_CRM_MSG_TELEGRAM_TOKEN:
    '87654321:TEST_FAKE_BOTFATHER_TOKEN_FOR_UNIT_ONLY'}}),null)
})
test('invites are unavailable outside owner allowlist pilot or with malformed secret and username',()=>{
  for(const e of [
    {...env,VERCEL_ENV:'preview'},
    {...env,HH_CRM_MSG_PRODUCTION_APPROVED:'true'},
    {...env,HH_CRM_MSG_TELEGRAM_PILOT_ENABLED:'false'},
    {...env,HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:''},
    {...env,HH_CRM_MSG_TELEGRAM_TOKEN:'bad'},
    {...env,HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:''},
    {...env,HH_CRM_MSG_TELEGRAM_USERNAME:'other.example'},
    {...env,HH_CRM_MSG_TELEGRAM_ENABLED:'false'},
  ]){
    assert.equal(telegramSecondAccountInvite({ownerId,config,env:e,now}),null)
  }
  assert.equal(telegramSecondAccountInvite({ownerId:otherOwner.slice(1),config,env,now}),null)
})
test('guest pilot never bypasses webhook secret, positive consent or manual owner reply guard',()=>{
  const hook=read('lib/crm/messenger-webhook.js')
  const provider=read('lib/crm/messenger-provider.js')
  const ownerRoute=read('app/api/app/crm/messenger/route.js')
  const store=read('lib/crm/messenger-store.js')
  const publicApi=read('app/api/public/telegram-diagnostic/route.js')
  const migration=read('supabase/migrations/20261026173446_hh_crm_telegram_second_pilot_20261026.sql')
  const ui=read('components/app/crm-messenger.jsx')
  assert.match(hook,/verifyTelegramSecondAccountInvite\(event\.rawText/)
  assert.match(hook,/one|second-chat-pilot/)
  assert.match(hook,/pilot_access_until>now\(\)/)
  assert.match(hook,/existing\)return \{handled:true\}/)
  assert.match(hook,/next\.body/)
  assert.match(hook,/approvedPilotGuest:/)
  assert.match(provider,/approvedPilotGuest!==true/)
  assert.match(ownerRoute,/approvedPilotGuest:dispatch\.approvedPilotGuest===true/)
  assert.match(store,/pilot_access_until>now\(\)/)
  assert.match(store,/s\.consent_at is not null/)
  assert.match(store,/guestInvites/)
  assert.match(migration,/app_private\.account_active\(\)/)
  assert.match(migration,/grant select .*hh_crm_backend/i)
  assert.doesNotMatch(migration,/grant .* to (anon|authenticated|service_role)/i)
  assert.match(ui,/guestInviteTitle:'Проверить со второго Telegram-аккаунта'/)
  assert.match(ui,/navigator\.clipboard\.writeText\(data\.guestInvites\[lang\]\.url\)/)
  assert.doesNotMatch(publicApi,/telegramSecondAccountInvite|guestInvites/)
})

test('Expired invited guest STOP stays effective',()=>{
  const hook=read('lib/crm/messenger-webhook.js')
  assert.ok(hook.includes('const isStop='))
  assert.ok(hook.includes('!activeGuest&&!invite&&!isStop'))
  assert.ok(hook.includes('isStop&&!previous&&restricted&&!ownerChat'))
  assert.ok(hook.includes('crm_tg_suppress_existing'))
})
