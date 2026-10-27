import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {issueTelegramCoachingHandoff,verifyTelegramCoachingHandoff} from '../lib/coaching/telegram-handoff.mjs'
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const config={encryptionKey:randomBytes(32)}
const scope={
  ownerId:'11111111-1111-4111-8111-111111111111',
  threadId:'22222222-2222-4222-8222-222222222222',
  businessHash:'a'.repeat(64),userHash:'b'.repeat(64),
  locale:'ru',topic:'business',
}
test('private consented Telegram handoff is encrypted, time-bound and tamper-proof',()=>{
  const now=Date.now()
  const token=issueTelegramCoachingHandoff(scope,config,now)
  assert.match(token,/^h1\.[A-Za-z0-9_-]{120,1100}$/)
  for(const sensitive of [scope.ownerId,scope.threadId,scope.userHash,scope.businessHash])
    assert.equal(token.includes(sensitive),false)
  const valid=verifyTelegramCoachingHandoff(token,config,now+500)
  assert.equal(valid.ownerId,scope.ownerId)
  assert.equal(valid.threadId,scope.threadId)
  assert.equal(valid.locale,'ru')
  assert.equal(valid.topic,'business')
  assert.match(valid.digest,/^[a-f0-9]{64}$/)
  assert.equal(verifyTelegramCoachingHandoff(token,config,now+3600001),null)
  assert.equal(verifyTelegramCoachingHandoff(token,{encryptionKey:randomBytes(32)},now),null)
  const altered=token.slice(0,45)+(token[45]==='A'?'B':'A')+token.slice(46)
  assert.equal(verifyTelegramCoachingHandoff(altered,config,now),null)
  assert.notEqual(issueTelegramCoachingHandoff(scope,config,now),token)
})
test('signed continuation never creates a second CRM contact and needs fresh STOP consent at send time',()=>{
  const webhook=file('lib/crm/messenger-webhook.js')
  const route=file('app/api/coaching-diagnostic/route.js')
  const repo=file('lib/practitioners/public-service-enquiry.js')
  const form=file('components/coaching-intake-form.tsx')
  const migration=file('supabase/migrations/20261027004620_hh_coaching_telegram_thread_handoff_20261026.sql')
  assert.match(webhook,/issueTelegramCoachingHandoff\(/)
  assert.match(webhook,/next\.stage==='done'/)
  assert.match(webhook,/set_config\('hh\.telegram_handoff_user'/)
  assert.match(route,/verifyTelegramCoachingHandoff\(raw\.handoff,config\)/)
  assert.match(repo,/if \(contact&&!linkedTelegram\)/)
  assert.match(repo,/stage='done' and consent_at is not null/)
  assert.match(repo,/telegram_thread_id,telegram_handoff_digest/)
  assert.match(repo,/const digest = linkedTelegram/)
  assert.match(repo,/operationHash\(\{\.\.\.input,telegramHandoffDigest:linkedTelegram\.digest\},config\)/)
  assert.match(repo,/operationHash\(input, config\)/)
  assert.match(form,/new URLSearchParams\(url\.hash\.slice\(1\)\)/)
  assert.match(webhook,/'#handoff='\+encodeURIComponent\(opaque\)/)
  assert.match(form,/contactConsent: true/)
  assert.match(migration,/create unique index if not exists public_service_telegram_handoff_once/)
  assert.match(migration,/for select to hh_app_backend/)
  assert.doesNotMatch(webhook,/sendOneMessengerMessage\(/)
})
