import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { safePublicWhatsAppPath } from '../lib/whatsapp-enquiry.js'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'
import { buildCoachingDiagnosticEnquiry } from '../lib/coaching/diagnostic-enquiry.mjs'
import { COACHING_FIELDS } from '../lib/coaching/intake-model.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const live = read('components/coaching-lounge-entry.tsx')
const paid = read('components/compact-lead-capture.tsx')
const free = read('components/free-diagnostic-start.tsx')
const intake = read('components/coaching-intake-form.tsx')
const page = read('app/[locale]/coaching/intake/page.tsx')
const style = read('components/coaching-intake-form.module.css')

test('three localized offers reveal one short phone-only inline request beneath choice', () => {
  assert.match(live, /hidden=\{!requestOpen\}/)
  assert.match(live, /data-coaching-intake/)
  assert.match(live, /<CompactLeadCapture key=\{format\} locale=\{locale\} variant="coaching"/)
  assert.match(live, /<FreeDiagnosticStart locale=\{locale\} compact \/>/)
  assert.match(paid, /data-coaching-paid-phone=\{coachingMini \? "" : undefined\}/)
  assert.match(paid, /coachingMini \? "tel" : "text"/)
  assert.match(paid, /coachingMini \? t\.miniConsent : t\.consent/)
  assert.match(paid, /fetch\("\/api\/service-enquiries"/)
  assert.match(paid, /setReference\(committedReference\)/)
  assert.match(paid, /handoffWindow\.location\.replace\(destination\)/)
  assert.match(free, /data-coaching-phone-start/)
  assert.match(free, /data-free-coaching-start/)
  assert.match(free, /data-free-diagnostic-phone-only/)
  assert.match(free, /sessionStorage\.setItem\(DIAGNOSTIC_START_KEY/)
  assert.match(free, /\?guided=1/)
  for (const label of ['Phone number','Номер телефона','Teléfono',
    'Start free diagnosis','Начать бесплатную диагностику','Comenzar diagnóstico gratis']) {
    assert.ok(free.includes(label) || paid.includes(label), label)
  }
  assert.doesNotMatch(live, /fetch\(|window\.open|whatsappEnquiryUrl|gtag\(|fbq\(/)
  assert.doesNotMatch(free, /fetch\(|gtag\(|window\.open/)
})

test('paid /coaching source writes only consented phone to CRM, private URLs are blocked', () => {
  const uuid = '13b822f6-8d70-4b1c-b44e-d0c31ad1d82f'
  for (const locale of ['en','ru','es']) {
    const sourcePath = '/' + locale + '/coaching'
    assert.equal(safePublicWhatsAppPath(sourcePath + '?phone=private'), sourcePath)
    const result = normalizePublicServiceEnquiry({
      operationId:uuid, serviceTitle:'Personal Coaching Session with Andrey · 60 min · €100',
      description:'Preferred reply channel: Telegram', sourcePath, locale,
      contact:{displayName:'',email:'',phone:'+1 (416) 555-0123'},
      contactConsent:true, website:''
    })
    assert.equal(result.contact.phone, '+14165550123')
    assert.equal(result.contact.source, 'website')
  }
  assert.equal(safePublicWhatsAppPath('/en/coaching/private'), '')
  assert.equal(safePublicWhatsAppPath('/en/coaching/intake?phone=private'), '/en/coaching/intake')
  assert.throws(() => normalizePublicServiceEnquiry({
    operationId:uuid, serviceTitle:'Personal Coaching Session with Andrey',
    description:'',sourcePath:'/en/coaching',locale:'en',
    contact:{displayName:'',email:'',phone:'+14165550123'},contactConsent:false
  }))
})

test('guided free question first, invitation second, one authored question per screen, explicit send last', () => {
  assert.match(page, /guided = \(await searchParams\)\?\.guided === "1"/)
  assert.match(page, /<CoachingIntakeForm locale=\{locale\} guided=\{guided\} \/>/)
  assert.match(intake, /const \[guidedStep, setGuidedStep\] = useState\(0\)/)
  assert.match(intake, /guidedStep === 0 \? COACHING_FIELDS\[0\]/)
  assert.match(intake, /guidedStep === 1 \?/)
  assert.match(intake, /data-guided-coaching-question=\{guidedField\.id\}/)
  assert.match(intake, /data-guided-next/)
  assert.match(intake, /data-guided-back/)
  assert.match(intake, /data-guided-coaching-send/)
  assert.match(intake, /!sendConsent/)
  assert.match(intake, /fetch\("\/api\/coaching-diagnostic"/)
  assert.match(intake, /sessionStorage\.removeItem\(DIAGNOSTIC_START_KEY\)/)
  assert.deepEqual(COACHING_FIELDS.filter(field=>field.required).map(field=>field.id), ['request','idealOutcome','priorityQuestion'])
  for (const label of ['Briefly, what is your question about?','Укажите кратко, в чём суть вашего вопроса',
    'Describe brevemente cuál es tu pregunta','коучинговой анкеты'])
    assert.ok(intake.includes(label), label)
  assert.doesNotMatch(intake, /whatsappEnquiryUrl|telegramEnquiryUrl|gtag\(|fbq\(/)
})

test('browser-target mobile one-screen layout, parsing and secure free final write', () => {
  for (const fragment of ['.guidedCard','.guidedActions','.guidedProgress','.guidedConsent',
    '@media(max-width:520px)','@media(max-width:350px)',':focus-visible','prefers-reduced-motion']) {
    assert.ok(style.includes(fragment), fragment)
  }
  for (const [path,content,kind] of [
    ['entry.tsx',live,ts.ScriptKind.TSX],['paid.tsx',paid,ts.ScriptKind.TSX],
    ['free.tsx',free,ts.ScriptKind.TSX],['intake.tsx',intake,ts.ScriptKind.TSX],
    ['page.tsx',page,ts.ScriptKind.TSX],
  ]) {
    const parsed=ts.createSourceFile(path,content,ts.ScriptTarget.Latest,true,kind)
    assert.deepEqual(parsed.parseDiagnostics.map(e=>e.messageText),[],path)
  }
  const req = {operationId:'13b822f6-8d70-4b1c-b44e-d0c31ad1d82f', locale:'en',
    offer:'free',topic:'personal',name:'',city:'',answers:{
      request:'My situation',idealOutcome:'My goal',priorityQuestion:'My next step?' },
    questions:[],contact:{displayName:'',email:'',phone:'+14165550123'},
    contactConsent:true,website:''}
  const validated=normalizePublicServiceEnquiry(buildCoachingDiagnosticEnquiry(req))
  assert.equal(validated.contact.phone,'+14165550123')
  assert.ok(validated.description.includes('My situation'))
  assert.throws(()=>buildCoachingDiagnosticEnquiry({...req,contactConsent:false}))
})
