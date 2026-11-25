import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildCoachingDiagnosticEnquiry, parseDiagnosticStart, DIAGNOSTIC_START_KEY, DIAGNOSTIC_SERVICE_TITLES } from '../lib/coaching/diagnostic-enquiry.mjs'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'
import { safePublicWhatsAppPath } from '../lib/whatsapp-enquiry.js'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const uuid = '13b822f6-8d70-4b1c-b44e-d0c31ad1d82f'
const valid = {
  operationId:uuid, locale:'en', offer:'free', topic:'personal', name:'Sample Guest', city:'Toronto',
  answers:{request:'I need clarity about my plans.', idealOutcome:'A first decision.', priorityQuestion:'What is my next step?'},
  questions:['How can I start?'], contact:{displayName:'Sample Guest',email:'sample@example.test',phone:''}, contactConsent:true,website:'',
}
test('explicitly requested author questionnaire reaches the existing encrypted service enquiry + CRM contract',()=>{
  const v=buildCoachingDiagnosticEnquiry(valid)
  assert.equal(v.serviceTitle,DIAGNOSTIC_SERVICE_TITLES.free)
  assert.equal(v.sourcePath,'/en/coaching/intake')
  assert.match(v.description,/What would you like to explore\?/)
  assert.match(v.description,/How can I start\?/)
  assert.equal(normalizePublicServiceEnquiry(v).contact.email,'sample@example.test')
  for (const offer of ['short','full']) {
    const result=buildCoachingDiagnosticEnquiry({...valid,offer,locale:'ru'})
    assert.equal(result.serviceTitle,DIAGNOSTIC_SERVICE_TITLES[offer])
    assert.match(result.description,/Какой вопрос вы хотите прояснить\?/)
  }
})
test('no implicit lead: explicit contact, consent, essential answers, fixed choices, bounded content',()=>{
  for(const input of [
    {...valid,contactConsent:false},
    {...valid,contact:{email:'',phone:''}},
    {...valid,offer:'pay'},
    {...valid,locale:'fr'},
    {...valid,answers:{request:'hi',idealOutcome:'yes'}},
    {...valid,answers:{...valid.answers,request:'x'.repeat(1601)}},
    {...valid,answers:{...valid.answers,unknown:'test'}},
    {...valid,questions:Array(9).fill('hello')},
    {...valid,website:'filled'},
    {...valid,privateQuestion:'should reject'},
  ]) assert.throws(()=>buildCoachingDiagnosticEnquiry(input))
  assert.throws(()=>normalizePublicServiceEnquiry({...normalizePublicServiceEnquiry(buildCoachingDiagnosticEnquiry(valid)),sourcePath:'/en/app/portrait'}))
  assert.equal(safePublicWhatsAppPath('/en/coaching/intake?contact=never'), '/en/coaching/intake')
})
test('tab-only contact preparation expires and cannot be mixed between locales',()=>{
  assert.ok(DIAGNOSTIC_START_KEY.includes('free-diagnostic'))
  const staged={createdAt:1000000,locale:'en',name:'Sam',email:'sam@example.test',phone:'',topic:'personal',question:'Focus'}
  assert.equal(parseDiagnosticStart(staged,'en',1000010).question,'Focus')
  assert.equal(parseDiagnosticStart(staged,'ru',1000010),null)
  assert.equal(parseDiagnosticStart(staged,'en',3000000),null)
})
test('mobile-first landing has 2 direct routes; private responses never go to messenger or analytics',()=>{
  const page=read('app/[locale]/holistic-support/page.tsx')
  const entry=read('components/free-diagnostic-start.tsx')
  const intake=read('components/coaching-intake-form.tsx')
  const route=read('app/api/coaching-diagnostic/route.js')
  const privacy=read('lib/practitioners/public-service-enquiry.js')
  const style=read('components/free-diagnostic-start.module.css')
  assert.match(page,/id="free-diagnostic-start"|FreeDiagnosticStart/)
  assert.match(page,/formatOptions=\{t.paidFormats\}/)
  assert.match(page,/€50.*30|30.*€50/)
  assert.match(page,/€100.*60|60.*€100/)
  assert.match(entry,/sessionStorage\.setItem\(DIAGNOSTIC_START_KEY/)
  assert.match(intake,/data-coaching-enquiry-saved/)
  assert.match(intake, /offerChoice === "free" \? t\.sendTitle : t\.sendPaidTitle/)
  for (const heading of ["Request a personal coaching session", "Запросить личную коучинговую сессию", "Solicitar una sesión personal de coaching"]) assert.ok(intake.includes(heading))
  assert.match(intake,/contactConsent: true/)
  assert.match(intake,/sendDisclosure/)
  assert.match(intake,/requestDisclosure/)
  assert.doesNotMatch(intake,/checked=\{sendConsent\}/)
  assert.match(intake,/privateCopyMode \? <>/)
  assert.match(intake,/if \(privateCopyRequested\) appFetch/)
  assert.match(intake,/fetch\("\/api\/coaching-diagnostic"/)
  assert.match(route,/requireSameOrigin/)
  assert.match(route,/consumeRate/)
  assert.match(privacy,/seal\(description/)
  assert.match(style,/@media\(max-width:350px\)/)
  assert.doesNotMatch(intake,/gtag\(|dataLayer\.push|whatsappEnquiryUrl|telegramEnquiryUrl/)
})

test('coaching intake reuses consented attribution and existing owner-only notification',()=>{
  const route=read('app/api/coaching-diagnostic/route.js')
  const standard=read('app/api/service-enquiries/route.js')
  const notice=read('lib/app/public-enquiry-telegram.js')
  // No new analytics provider or implicit tracking: the same cookie parser
  // returns null when the visitor has not consented to source attribution.
  assert.match(route,/readPublicEnquiryAttribution\(request\)/)
  assert.match(standard,/readPublicEnquiryAttribution\(request\)/)
  assert.match(route,/createPublicServiceEnquiry\(\s*config,input,readPublicEnquiryAttribution\(request\),\{linkedTelegram:handoff\}\)/)
  // The message is sent only after a successful encrypted CRM commit. The
  // provider failure must not convert a saved lead into a failed submission.
  assert.match(route,/result\.saved === true/)
  assert.match(route,/after\(async \(\) => \{/)
  assert.match(route,/dispatchPublicServiceEnquiryTelegram\(config, result\.id, input\.operationId\)/)
  assert.match(notice,/telegramOwnerPilotReady\(env\)/)
  assert.match(notice,/notification_tg_public_enquiry_claim/)
  assert.doesNotMatch(route,/sendOneMessengerMessage|sendBulk|setInterval|marketing/i)
  assert.doesNotMatch(notice,/description_ciphertext|contact_ciphertext\s+as/i)
})
