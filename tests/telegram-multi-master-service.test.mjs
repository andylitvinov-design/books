import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'
import {
 parseTelegramServiceStart,telegramServiceRequestUrl,telegramMasterDirectoryUrl,
 telegramServiceBotUrl,telegramServiceStartPrompt,
} from '../lib/practitioners/telegram-service-link.mjs'

const fixtureId='81a7a777-b789-4f06-a4e7-e54a55df053e'
const url='https://holistichouse.vercel.app/ru/services/telegram-request?service='+fixtureId
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8')
const env={
 VERCEL_ENV:'production',HH_CRM_TG_DIAGNOSTIC_ENABLED:'true',
 HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED:'true',HH_CRM_MSG_TELEGRAM_ENABLED:'true',
 HH_CRM_MSG_TELEGRAM_USERNAME:'holistichouse_bot',
 HH_CRM_MSG_TELEGRAM_TOKEN:'12345678:FAKE_BOT_TOKEN_TESTING_ONLY_123456789',
 HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'FAKE_TEST_WEBHOOK_SECRET',
}

test('public links use a single approved bot with no chat/user or health identifiers',()=>{
 const bot=telegramServiceBotUrl('ru',fixtureId,env)
 assert.equal(bot, 'https://t.me/holistichouse_bot?start=hhservice_ru_'+fixtureId.replace(/-/g,''))
 assert.equal(new URL(bot).searchParams.get('start').length,45)
 assert.equal(telegramServiceRequestUrl('ru',fixtureId),url)
 for(const lang of ['en','ru','es']) {
  const target=telegramServiceBotUrl(lang,fixtureId,env)
  const command='/start '+new URL(target).searchParams.get('start')
  assert.deepEqual(parseTelegramServiceStart(command),{locale:lang,serviceId:fixtureId})
  assert.equal(telegramMasterDirectoryUrl(lang),'https://holistichouse.vercel.app/'+lang+'/masters')
 }
})

test('fail closed for disabled bot and malformed, foreign and payload-injected links',()=>{
 for(const key of ['HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED','HH_CRM_MSG_TELEGRAM_USERNAME',
  'HH_CRM_MSG_TELEGRAM_TOKEN','HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET']) {
  const e={...env};delete e[key]
  assert.equal(telegramServiceBotUrl('ru',fixtureId,e),null,key)
 }
 assert.equal(telegramServiceBotUrl('ru',fixtureId,{...env,VERCEL_ENV:'preview'}),null)
 for(const malformed of ['/start hhservice_ru_12345','/start hhservice_ru_'+fixtureId+'@456',
  '/start hhservice_ru_'+fixtureId.replace(/-/g,'')+' bad',
  '/start hhservice_zz_'+fixtureId.replace(/-/g,''),
  '/start hhservice_ru_'+fixtureId.replace(/-/g,'')+'?token=secret','hello','/agree']) {
  assert.equal(parseTelegramServiceStart(malformed),null,malformed)
 }
 assert.equal(telegramServiceRequestUrl('ru','not-a-uuid'),null)
 assert.equal(telegramServiceRequestUrl('zz',fixtureId),null)
 assert.equal(parseTelegramServiceStart('/start hhmasters_ru').directory,true)
})

test('signed webhook sends only public link, with no booking or lead before explicit form consent',()=>{
 const selected={id:fixtureId,title:'Published consultation',practitionerName:'Example practitioner'}
 for(const lang of ['ru','en','es']){
  const text=telegramServiceStartPrompt({locale:lang,serviceId:fixtureId},selected)
  assert.ok(text.includes('https://holistichouse.vercel.app/'+lang+'/services/telegram-request'))
  assert.ok(!text.includes('/api/'))
  assert.ok(text.length<1200)
 }
 assert.equal(telegramServiceStartPrompt({locale:'ru',directory:true}).includes('/ru/masters'),true)
 const webhook=source('lib/crm/messenger-webhook.js')
 assert.match(webhook,/parseTelegramServiceStart\(event.rawText\)/)
 assert.match(webhook,/previous\?\.stage==='stopped'/)
 assert.match(webhook,/previous\?\.service_handoff/)
 assert.match(webhook,/service_handoff=false,service_offering_id=null/)
 assert.match(webhook,/last_update_id=excluded\.last_update_id/)
 assert.match(webhook,/previous\?\.service_handoff/)
 assert.match(webhook,/service_handoff=false,service_offering_id=null/)
 assert.match(webhook,/service_handoff=true/)
 assert.match(webhook,/telegramPublicStartRequested\(rawStop\)/)
 assert.match(webhook,/telegramServiceStartPrompt\(serviceStart,offering\)/)
 assert.match(webhook,/!telegramPublicStartRequested\(rawStop\)&&!serviceStart/)
})

test('only approved published services can be resolved, never a client-supplied master id',()=>{
 const resolver=source('lib/practitioners/telegram-service-offering.js')
 assert.match(resolver,/s\.active and s\.status = 'published'/)
 assert.match(resolver,/p\.active and p\.status = 'approved'/)
 assert.match(resolver,/p\.trusted_auth_user_id is not null/)
 assert.match(resolver,/where s\.id = \$1/)
 assert.doesNotMatch(resolver,/process\.env\.SERVICE_ID|unseal\(/)
})

test('single encrypted enquiry and CRM lead target approved offering owner',()=>{
 const server=source('lib/practitioners/public-service-enquiry.js')
 const input=source('lib/practitioners/public-service-enquiry-input.mjs')
 assert.match(input,/sourcePath !== `\/\$\{locale\}\/services\/telegram-request`/)
 assert.match(input,/value\.contactConsent !== true/)
 assert.match(server,/findPublishedTelegramOffering\(db, input\.serviceOfferingId, locale\)/)
 assert.match(server,/const recipientId = practitioner\.id/)
 assert.match(server,/\[id, recipientId, serviceTitle, sourcePath/)
 assert.match(server,/enc\(recipientId, id, 'public_lead\.message'\)/)
 assert.match(server,/service_offering_id\)/)
 assert.match(server,/values\(\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8,\$9,\$10,\$11\)/)
 assert.match(server,/ownerId = practitioner\.owner_id/)
 assert.match(server,/on conflict do nothing/)
 assert.match(server,/offering\?\.id \|\| null/)
 assert.match(server,/service_offering_id\)/)
 assert.match(source('app/api/service-enquiries/route.js'),/requireSameOrigin\(request, config\)/)
})

test('RLS contact grant only on matching committed published service and owner',()=>{
 const policy=source('supabase/migrations/20261026222318_hh_telegram_any_practitioner_service_enquiries.sql')
 assert.match(policy,/for insert to hh_app_backend/)
 assert.match(policy,/p\.trusted_auth_user_id\s*=\s*crm_contacts\.owner_id/)
 assert.match(policy,/e\.contact_ciphertext is not null/)
 assert.match(policy,/e\.service_offering_id is not null/)
 assert.match(policy,/join app\.service_offerings s on s\.id=e\.service_offering_id/)
 assert.match(policy,/service_handoff boolean not null default false/)
 assert.match(policy,/relforcerowsecurity/)
 assert.doesNotMatch(policy,/drop policy|bypassrls|grant all/i)
 assert.match(policy,/e\.source_path\s*=\s*'\/' \|\| e\.locale \|\| '\/services\/telegram-request'/)
 assert.match(policy,/s\.status='published'/)
 assert.match(policy,/s\.practitioner_id=p\.id/)
 assert.match(policy,/add column if not exists service_handoff/)
 assert.match(policy,/add column if not exists service_offering_id/)
 assert.doesNotMatch(policy,/GRANT ALL|BYPASSRLS|security definer/i)
})

test('public form is opt-in, retry idempotent, with server confirmed reference',()=>{
 const form=source('components/telegram-service-request.jsx')
 const page=source('app/[locale]/services/telegram-request/page.tsx')
 assert.match(form,/event\.preventDefault\(\)/)
 assert.match(form,/contactConsent:true/)
 assert.match(form,/requestId\.current \|\|= crypto\.randomUUID\(\)/)
 assert.match(form,/data\.saved!==true/)
 assert.match(form,/data\.contactPending!==false/)
 assert.match(form,/\^HH-\[A-F0-9\]\{12\}\$/)
 assert.match(page,/if \(!offering\) notFound\(\)/)
 assert.match(page,/robots: \{index: false/)
})


test('public request validation enforces exact service, locale, contact and consent',()=>{
 const value={operationId:'8d1e8173-7009-41ad-9e12-a2c411e54a25',
   serviceOfferingId:fixtureId,serviceTitle:'Untrusted title',
   description:'',sourcePath:'/ru/services/telegram-request',locale:'ru',
   contact:{displayName:'Customer',email:'person@example.com',phone:''},
   contactConsent:true}
 const accepted=normalizePublicServiceEnquiry(value)
 assert.equal(accepted.serviceOfferingId,fixtureId)
 assert.equal(accepted.contact.email,'person@example.com')
 assert.match(accepted.description,/Untrusted title/)
 for(const patch of [
  {contactConsent:false},
  {serviceOfferingId:'00000000-0000-0000-0000-000000000000?to=other'},
  {sourcePath:'/ru/app/practice'},
  {sourcePath:'/en/services/telegram-request'},
  {contact:{displayName:'Customer',email:'bad',phone:''}},
  {practitionerId:'99999999-9999-4999-8999-999999999999'},
 ]){
  assert.throws(()=>normalizePublicServiceEnquiry({...value,...patch}))
 }
})

test('service handoff cannot turn later client texts into Andy diagnostic messages',()=>{
 const webhook=source('lib/crm/messenger-webhook.js')
 const prior=webhook.indexOf("if(publicIntake&&previous?.service_handoff")
 const ingest=webhook.indexOf("const saved=await ingestMessengerEventInTransaction(db,'telegram'")
 assert.ok(prior>0&&ingest>prior)
 const mode=webhook.slice(prior,ingest)
 assert.match(mode,/if\(isStop\)/)
 assert.match(mode,/crm_tg_suppress_existing/)
 assert.match(mode,/return \{handled:true,to:String\(event.userId\),reply/)
 assert.doesNotMatch(mode,/ingestMessengerEventInTransaction/)
 assert.match(webhook,/service_handoff=false,service_offering_id=null/)
})

test('Telegram provider shows restricted inline URL and preserves diagnosis buttons',()=>{
 const provider=source('lib/crm/messenger-provider.js')
 const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js')
 assert.match(route,/serviceRequestUrl:intake.serviceRequestUrl/)
 assert.match(provider,/target.origin!=='https:\/\/holistichouse.vercel.app'/)
 assert.match(provider,/target.searchParams.keys\(\)/)
 assert.match(provider,/inline_keyboard/)
 assert.match(provider,/url:serviceRequestUrl/)
 assert.match(provider,/telegramInlineMarkup\(keyboard,locale\)/)
})

test('legacy service requests and same-origin route stay unchanged',()=>{
 const input=source('lib/practitioners/public-service-enquiry-input.mjs')
 const server=source('lib/practitioners/public-service-enquiry.js')
 const route=source('app/api/service-enquiries/route.js')
 assert.match(server,/const recipientId = practitioner.id/)
 assert.match(server,/\[PRACTITIONER_ID\]/)
 assert.match(input,/Only an explicitly submitted author questionnaire/)
 assert.match(route,/requireSameOrigin\(request, config\)/)
 const old={operationId:'8d1e8173-7009-41ad-9e12-a2c411e54a25',
   serviceTitle:'Ordinary service',description:'Please contact me for session',
   sourcePath:'/en/services/personal-support',locale:'en'}
 assert.equal(normalizePublicServiceEnquiry(old).serviceTitle,'Ordinary service')
})
