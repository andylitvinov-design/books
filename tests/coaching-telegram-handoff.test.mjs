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
  assert.match(form,/contactConsent\s*:\s*true/)
  assert.match(migration,/create unique index if not exists public_service_telegram_handoff_once/)
  assert.match(migration,/for select to hh_app_backend/)
  assert.doesNotMatch(webhook,/sendOneMessengerMessage\(/)
})

test('signed Telegram continuation retains consented website attribution and durable owner notice',()=>{
  const handler=file('app/api/coaching-diagnostic/route.js')
  const store=file('lib/practitioners/public-service-enquiry.js')
  const inbox=file('components/app/messages-simple-inbox.jsx')
  assert.match(handler,/readPublicEnquiryAttribution\(request\)/)
  assert.match(handler,/\{linkedTelegram:handoff\}/)
  assert.match(store,/const linkIndex=12\+\(hasAttributionColumn\?1:0\)\+\(verifiedOfferingId\?1:0\)/)
  assert.match(store,/linkedTelegram\?\[linkedTelegram\.threadId,linkedTelegram\.digest\]:\[\]/)
  assert.match(store,/SERVICE_OFFERING_NOT_VERIFIED/)
  assert.match(store,/if \(contact&&!linkedTelegram\)/)
  assert.match(store,/if\(contact\)\{/)
  assert.match(store,/notification_public_enquiry_intents/)
  assert.match(inbox,/validId\(selected\.item\.telegramThreadId\)/)
  assert.match(inbox,/initialThreadId=\{selected\.item\.telegramThreadId\}/)
})

test('verified offering and attribution keep consistent one-use Telegram SQL parameters',()=>{
  const source=file('lib/practitioners/public-service-enquiry.js')
  const start=source.indexOf('export function buildPublicEnquiryInsert(')
  const end=source.indexOf('\nconst enc =',start)
  assert.ok(start>=0&&end>start,'builder must exist in public enquiry module')
  const isolated=source.slice(start,end).replace(/^export /,'')
  const build=new Function(isolated+'\nreturn buildPublicEnquiryInsert;')()
  const values=Array.from({length:11},(_,i)=>'synthetic-'+(i+1))
  const offeringId='11111111-1111-4111-8111-111111111111'
  const threadId='22222222-2222-4222-8222-222222222222'
  const digest='a'.repeat(64)
  for(const hasAttribution of [false,true])for(const hasOffering of [false,true])
    for(const hasHandoff of [false,true]){
      const insert=build(values,{source:'test'},hasAttribution,
        hasOffering?offeringId:null,hasHandoff?{threadId,digest}:null)
      const expected=11+Number(hasAttribution)+Number(hasOffering)+2*Number(hasHandoff)
      const placeholders=[...insert.text.matchAll(/\$(\d+)/g)].map(x=>Number(x[1]))
      assert.equal(insert.values.length,expected)
      assert.equal(Math.max(...placeholders),expected)
      assert.equal(new Set(placeholders).size,expected)
      assert.equal(insert.text.includes(',service_offering_id'),hasOffering)
      assert.equal(insert.text.includes(',telegram_thread_id,telegram_handoff_digest'),hasHandoff)
      if(hasHandoff)assert.deepEqual(insert.values.slice(-2),[threadId,digest])
      if(hasOffering)assert.ok(insert.values.includes(offeringId))
    }
})
