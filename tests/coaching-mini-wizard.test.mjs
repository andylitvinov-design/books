import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { safePublicWhatsAppPath } from '../lib/whatsapp-enquiry.js'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'
import { buildCoachingDiagnosticEnquiry } from '../lib/coaching/diagnostic-enquiry.mjs'
import { COACHING_FIELDS } from '../lib/coaching/intake-model.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const live = read('components/coaching-live-session-capture.jsx')
const paid = read('components/compact-lead-capture.tsx')
const free = read('components/free-diagnostic-start.tsx')
const intake = read('components/coaching-intake-form.tsx')
const entry = read('app/[locale]/coaching/intake/page.tsx')
const style = read('components/coaching-intake-form.module.css')

test('EN, RU, ES present two distinct phone-only paths below chosen service', () => {
  assert.match(live, /aria-expanded=\{opened\}/)
  assert.match(live, /aria-controls="coaching-request-sheet"/)
  assert.match(live, /data-coaching-request-sheet=\{selected\}/)
  assert.match(live, /hidden=\{!opened\}/)
  assert.match(live, /<CompactLeadCapture key=\{selected\} locale=\{lang\} variant="coaching"/)
  assert.match(live, /<FreeDiagnosticStart locale=\{lang\} variant="coaching"/)
  assert.match(paid, /data-coaching-paid-phone=\{coachingMini \? "" : undefined\}/)
  assert.match(paid, /coachingMini \? "tel" : "text"/)
  assert.match(paid, /coachingMini \? t\.miniConsent : t\.consent/)
  assert.match(paid, /fetch\("\/api\/service-enquiries"/)
  assert.match(paid, /setReference\(committedReference\)/)
  assert.match(paid, /handoffWindow\.location\.replace\(destination\)/)
  assert.match(free, /data-coaching-phone-start/)
  assert.match(free, /data-free-coaching-start/)
  assert.match(free, /type="tel"/)
  assert.match(free, /sessionStorage\.setItem\(DIAGNOSTIC_START_KEY/)
  assert.match(free, /\?guided=1/)
  for (const fragment of ['Номер телефона', 'Phone number', 'Número de teléfono',
    'Начать бесплатную диагностику', 'Start free diagnosis', 'Iniciar diagnóstico gratuito']) {
    assert.ok(paid.includes(fragment) || free.includes(fragment), fragment)
  }
  assert.doesNotMatch(live, /fetch\(|window\.open|whatsappEnquiryUrl|gtag\(|fbq\(/)
  assert.doesNotMatch(free, /fetch\(|gtag\(|window\.open/)
})

test('public /coaching now can create consented, idempotent CRM request; private paths remain blocked', () => {
  const uuid = '13b822f6-8d70-4b1c-b44e-d0c31ad1d82f'
  for (const locale of ['en','ru','es']) {
    const sourcePath = '/' + locale + '/coaching'
    assert.equal(safePublicWhatsAppPath(sourcePath + '?phone=private'), sourcePath)
    const result = normalizePublicServiceEnquiry({
      operationId: uuid, serviceTitle: 'Personal Coaching Session · 30 min · €50',
      description: 'Preferred reply channel: Telegram', sourcePath, locale,
      contact: { displayName: '', email: '', phone: '+1 (416) 555-0123' },
      contactConsent: true, website: ''
    })
    assert.equal(result.contact.phone, '+14165550123')
    assert.equal(result.contact.source, 'website')
    assert.equal(result.sourcePath, sourcePath)
  }
  assert.equal(safePublicWhatsAppPath('/en/coaching/private'), '')
  assert.equal(safePublicWhatsAppPath('/en/coaching/intake?topic=personal&phone=private'), '/en/coaching/intake')
  assert.throws(() => normalizePublicServiceEnquiry({
    operationId: uuid, serviceTitle: 'Personal Coaching Session · 30 min · €50',
    description: '', sourcePath: '/en/coaching', locale: 'en',
    contact: { displayName: '', email: '', phone: '+14165550123' },
    contactConsent: false
  }))
})

test('guided free questionnaire begins with the question itself, invites on slide two, and shares no answers until final send', () => {
  assert.match(entry, /guided = \(await searchParams\)\?\.guided === "1"/)
  assert.match(entry, /<CoachingIntakeForm locale=\{locale\} guided=\{guided\} \/>/)
  assert.match(entry, /!guided \? <section className=\{styles\.hero\}/)
  assert.match(intake, /const \[guidedStep, setGuidedStep\] = useState\(0\)/)
  assert.match(intake, /guidedStep === 0 \? COACHING_FIELDS\[0\]/)
  assert.match(intake, /guidedStep === 1 \?/)
  assert.match(intake, /data-guided-coaching-question=\{guidedField\.id\}/)
  assert.match(intake, /!guidedField\?\.required \|\| Boolean/)
  assert.match(intake, /if \(guided\) return <section/)
  assert.match(intake, /data-coaching-guided/)
  assert.match(intake, /data-guided-coaching-send/)
  assert.match(intake, /!sendConsent/)
  assert.match(intake, /fetch\("\/api\/coaching-diagnostic"/)
  assert.match(intake, /leadAttempt\.current = \{ id, body: JSON\.stringify/)
  assert.match(intake, /sessionStorage\.removeItem\(DIAGNOSTIC_START_KEY\)/)
  assert.match(intake, /leadReceipt/)
  assert.deepEqual(COACHING_FIELDS.filter(field => field.required).map(field => field.id),
    ['request', 'idealOutcome', 'priorityQuestion'])
  for (const fragment of ['Briefly, what is your question about?', 'Укажите кратко, в чём суть вашего вопроса',
    'Describe brevemente cuál es tu pregunta', "Andrey's coaching questions", 'коучинговой анкеты']) {
    assert.ok(intake.includes(fragment), fragment)
  }
  assert.doesNotMatch(intake, /whatsappEnquiryUrl|telegramEnquiryUrl|gtag\(|fbq\(/)
})

test('mobile one-screen wizard has separate styling and typed TSX/JSX grammar', () => {
  for (const fragment of ['.guidedCard', '.guidedActions', '.guidedProgress', '.guidedInput', '.guidedConsent',
    '@media(max-width:520px)', '@media(max-width:350px)', ':focus-visible', 'prefers-reduced-motion']) {
    assert.ok(style.includes(fragment), fragment)
  }
  for (const [path, code, kind] of [
    ['capture.jsx', live, ts.ScriptKind.JSX],
    ['intake.tsx', intake, ts.ScriptKind.TSX],
    ['free.tsx', free, ts.ScriptKind.TSX],
    ['paid.tsx', paid, ts.ScriptKind.TSX],
    ['page.tsx', entry, ts.ScriptKind.TSX]
  ]) {
    const file = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true, kind)
    assert.deepEqual(file.parseDiagnostics.map(e => e.messageText), [], path + ' should parse')
  }
})

test('free final action stays a consented questionnaire, not an early separate lead', () => {
  const example = {
    operationId: '13b822f6-8d70-4b1c-b44e-d0c31ad1d82f', locale: 'en',
    offer: 'free', topic: 'personal', name: '', city: '',
    answers: { request: 'My question.', idealOutcome: 'My desired result.', priorityQuestion: 'What can I do next?' },
    questions: [], contact: { displayName: '', email: '', phone: '+14165550123' },
    contactConsent: true, website: ''
  }
  const validated = normalizePublicServiceEnquiry(buildCoachingDiagnosticEnquiry(example))
  assert.equal(validated.sourcePath, '/en/coaching/intake')
  assert.equal(validated.contact.phone, '+14165550123')
  assert.ok(validated.description.includes('My question.'))
  assert.throws(() => buildCoachingDiagnosticEnquiry({ ...example, contactConsent: false }))
})
