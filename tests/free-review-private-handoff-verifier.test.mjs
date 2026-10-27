import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { RECEIPT_SESSION_KEY } from '../lib/practitioners/enquiry-receipt.mjs'
import { assertFreeReviewVerifierBoundary, createFreeReviewRouteGuard,
 assertFreeReviewSyntheticPayload, assertFreeReviewPreparedUrls,
 verifyFreeReviewPrivateHandoff } from '../scripts/helpers/free-review-private-handoff-verifier.mjs'

const origin = 'http://localhost:3100'
const env = { CI: 'true', HH_APP_TEST_RUNTIME: 'isolated', HH_TEST_ADMIN_DATABASE_URL: 'postgres://synthetic@127.0.0.1/hh_app_test' }
const reference = 'HH-ABCD1234EF56'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
function payload(locale = 'en', question = 'Synthetic question') {
 return { operationId: '12345678-1234-1234-1234-123456789abc',
  serviceTitle: locale === 'en' ? 'Free personal express review' : 'Бесплатная личная экспресс-диагностика',
  description: 'Express review focus: ' + (locale === 'en' ? 'Situation' : 'Ситуация') + '\nInitial question: ' + question,
  sourcePath: '/' + locale + '/services/free-situation-review', locale,
  contact: { displayName: '', email: '', phone: '+14165550123' }, contactConsent: true, website: '' }
}
const urls = (message = 'Neutral request\nEnquiry: ' + reference) => ['https://wa.me/14376066502', 'https://t.me/AndyTherapist'].map(base => base + '?text=' + encodeURIComponent(message))

test('boundary permits only pinned locales on isolated loopback hh_app_test', () => {
 for (const locale of ['en', 'ru']) assertFreeReviewVerifierBoundary(origin, locale, env)
 for (const [url, locale, options] of [
  ['https://holistichouse.vercel.app', 'en', env], [origin + '/', 'en', env],
  [origin, 'es', env], [origin, 'en', { ...env, CI: 'false' }],
  [origin, 'en', { ...env, VERCEL: '1' }], [origin, 'en', { ...env, HH_APP_TEST_RUNTIME: 'production' }],
  [origin, 'en', { ...env, HH_TEST_ADMIN_DATABASE_URL: 'postgres://x@remote/hh_app_test' }],
  [origin, 'en', { ...env, HH_TEST_ADMIN_DATABASE_URL: 'postgres://x@localhost/real' }],
 ]) assert.throws(() => assertFreeReviewVerifierBoundary(url, locale, options))
})

test('guard permits only same-origin reads and fulfills exact synthetic POST; all other traffic aborts', async () => {
 const guard = createFreeReviewRouteGuard(origin, 'en', env)
 for (const [url, method, expected] of [
  [origin + '/en/services/free-situation-review', 'GET', 'continue'], [origin + '/asset', 'HEAD', 'continue'],
  [origin + '/api/service-enquiries', 'POST', 'fulfill'],
  [origin + '/api/service-enquiries?private=1', 'POST', 'abort'],
  [origin + '/api/app/coaching/intake', 'POST', 'abort'], [origin + '/api/service-enquiries', 'DELETE', 'abort'],
  ['https://wa.me/14376066502', 'GET', 'abort'], ['https://t.me/AndyTherapist', 'GET', 'abort'],
  ['https://example.supabase.co/rest/v1/table', 'POST', 'abort'],
 ]) {
  const calls = []
  await guard.route({ request: () => ({ url: () => url, method: () => method, postDataJSON: () => payload() }),
   continue: () => calls.push('continue'), abort: reason => { assert.equal(reason, 'blockedbyclient'); calls.push('abort') },
   fulfill: response => { assert.equal(response.status, 201); assert.deepEqual(JSON.parse(response.body), { saved: true, referenceCode: reference }); calls.push('fulfill') } })
  assert.deepEqual(calls, [expected])
 }
 assert.equal(guard.submissions.length, 1)
 assert.equal(guard.blocked.length, 6)
 assert.ok(!JSON.stringify(guard.blocked).includes('private'))
})

for (const locale of ['en', 'ru']) test(locale + ' exact payload and neutral link contracts accept only the intended handoff', () => {
 assertFreeReviewSyntheticPayload(payload(locale), locale, 'Synthetic question')
 assertFreeReviewPreparedUrls(urls(), ['Synthetic question'])
})
for (const field of ['contactConsent', 'serviceTitle', 'description', 'sourcePath', 'locale', 'website', 'operationId', 'contact'])
 test('payload rejects mutation: ' + field, () => {
  const value = payload(); value[field] = field === 'contactConsent' ? false : field === 'contact' ? { ...value.contact, email: 'leak@example.test' } : 'unexpected'
  assert.throws(() => assertFreeReviewSyntheticPayload(value, 'en', 'Synthetic question'))
 })
for (const marker of ['Synthetic question', '+14165550123', '4165550123', 'Express review focus:', 'Initial question:'])
 test('prepared messages reject private marker: ' + marker, () => assert.throws(() => assertFreeReviewPreparedUrls(urls('Neutral ' + reference + marker), ['Synthetic question'])))
for (const [name, mutate] of [
 ['missing link', value => value.pop()], ['provider host', value => { value[0] = value[0].replace('wa.me', 'example.test') }],
 ['recipient', value => { value[1] = value[1].replace('AndyTherapist', 'Other') }],
 ['extra parameter', value => { value[0] += '&phone=private' }], ['different drafts', value => { value[1] += 'different' }],
 ['missing receipt', value => { value[0] = urls('Neutral')[0] }],
]) test('prepared link rejects ' + name, () => { const value = urls(); mutate(value); assert.throws(() => assertFreeReviewPreparedUrls(value, [])) })

function fixture(locale, fault = '') {
 const state = { expanded: false, advanced: false, details: false, focus: 'situation', phone: '', consent: fault === 'implicit-consent', question: '', alert: '', saved: false, clicks: [], routed: false, unroute: false }
 const words = locale === 'en'
  ? { title: 'Free personal express review with Andrey.', privateTitle: 'Prepare your question privately', privateAction: 'Open private coaching questionnaire', privateSave: 'Saving does not send it to a coach or create a booking.', phoneError: 'Enter your international phone number.', consentError: 'Please agree to one personal reply before continuing.' }
  : { title: 'Личная экспресс-диагностика с Андреем.', privateTitle: 'Подготовьте запрос приватно', privateAction: 'Открыть приватную коучинг-анкету', privateSave: 'Сохранение не отправляет его коучу и не создаёт запись.', phoneError: 'Введите номер телефона с кодом страны.', consentError: 'Для отправки подтвердите согласие на один личный ответ.' }
 const storage = () => Object.defineProperty({}, 'getItem', { value(key) { return this[key] || null } })
 const sandbox = { window: {}, document: { documentElement: { dataset: {} } }, sessionStorage: storage(), localStorage: storage() }
 sandbox.window.addEventListener = () => {}
 let handler
 const context = { route: async (pattern, fn) => { assert.equal(pattern, '**/*'); handler = fn; state.routed = true }, unroute: async (pattern, fn) => { assert.equal(pattern, '**/*'); assert.equal(fn, handler); state.unroute = true } }
 const kind = (selector, parent) => {
  if (selector === ':scope > summary') return parent === 'advanced' ? 'advanced-summary' : 'details-summary'
  if (selector === 'details') return 'details'
  if (selector === 'main[data-free-entry-landing="situation"]') return 'main'
  if (selector === '[data-personal-express-enquiry]') return 'enquiry'
  if (selector === '[data-express-reveal]') return 'reveal'
  if (selector === '[data-express-inline-disclosure]') return 'disclosure'
  if (selector === '[data-free-express-lead]') return 'wizard'
  if (selector === 'details[data-optional-written-review]') return 'advanced'
  if (selector === '[data-free-drawing-intake]') return 'intake'
  if (selector === 'form, textarea, input[type="file"]') return 'private-controls'
  if (selector === '[data-contact-channel-chooser][data-reiki-phone-enquiry]') return 'chooser'
  if (selector === 'a[data-contact-channel]') return 'links'
  if (selector === 'form') return 'form'
  if (selector === '[data-phone-country-input] input[type="tel"]') return 'phone'
  if (selector === '[data-phone-country-input] select') return 'country'
  if (selector === 'input[type="checkbox"]') return 'consent'
  if (selector === 'textarea') return 'question'
  if (selector === 'button[data-contact-channel-submit="whatsapp"]') return 'submit'
  if (/^\[data-express-focus="/.test(selector)) return 'focus-' + selector.match(/"([^"]+)"/)[1]
  if (/^input\[value="/.test(selector)) return 'radio-' + selector.match(/"([^"]+)"/)[1]
  if (/^a\[data-contact-channel="/.test(selector)) return 'link-' + selector.match(/"([^"]+)"/)[1]
  assert.fail('Unexpected selector: ' + selector)
 }
 const count = key => ['wizard', 'private-controls'].includes(key) ? 0 : key === 'links' ? state.saved ? fault === 'missing-link' ? 1 : 2 : 0 : key === 'form' ? Number(!state.saved) : 1
 const getText = key => key === 'intake' ? fault === 'missing-private-warning' ? '' : words.privateSave : key === 'alert' ? state.alert : key === 'status' ? reference : ''
 const loc = key => ({ key, locator: selector => loc(kind(selector, key)), filter: () => loc(key),
  getByRole: (role, options) => {
   if (role === 'heading') assert.equal(options.name, key === 'main' ? words.title : words.privateTitle)
   if (role === 'link') { assert.equal(options.name, words.privateAction); return loc('private-link') }
   return loc(role)
  },
  evaluate: async fn => fn({ open: key === 'advanced' ? state.advanced : state.details }),
  getAttribute: async name => {
   if (name === 'href') return key === 'private-link' ? '/' + locale + '/coaching/intake?topic=' + (fault === 'private-url-leak' ? 'Synthetic' : 'personal') : urls('Neutral request ' + reference + (fault === 'question-leak' ? state.question : fault === 'focus-leak' ? 'Situation' : ''))[key === 'link-whatsapp' ? 0 : 1]
   if (name === 'aria-expanded') return String(state.expanded)
   if (name === 'lang') return locale
   if (name === 'data-selected') return String(key === 'focus-' + state.focus)
   if (name === 'required') return ''
   if (name === 'target') return '_blank'
   if (name === 'rel') return 'noopener noreferrer'
   assert.fail('Unexpected attribute ' + name)
  },
  selectOption: async value => { assert.equal(key, 'country'); assert.equal(value, 'CA') },
  fill: async value => { assert.ok(['phone', 'question'].includes(key)); state[key] = value },
  check: async () => { assert.equal(key, 'consent'); state.consent = fault !== 'ignored-consent' },
  click: async () => {
   state.clicks.push(key)
   if (key === 'advanced-summary') { state.advanced = !state.advanced; return }
   if (key === 'details-summary') { state.details = !state.details; return }
   if (key === 'reveal') { state.expanded = !state.expanded; return }
   if (key.startsWith('focus-')) { state.focus = key.slice(6); return }
   assert.equal(key, 'submit', 'Never click private links, OAuth or external providers')
   if (!state.phone && fault !== 'phone-bypass') { state.alert = words.phoneError; return }
   if (!state.consent && fault !== 'consent-bypass' && fault !== 'phone-bypass') { state.alert = words.consentError; return }
   assert.ok(state.routed)
   const data = payload(locale, state.question)
   if (fault === 'wrong-service') data.serviceTitle = 'Other'
   const route = { request: () => ({ url: () => origin + '/api/service-enquiries', method: () => 'POST', postDataJSON: () => data }),
    continue: () => assert.fail('Never send the POST'), abort: () => assert.fail('Known synthetic POST should be fulfilled'),
    fulfill: response => { assert.equal(response.status, 201); state.saved = true; sandbox.sessionStorage[RECEIPT_SESSION_KEY] = JSON.stringify({ referenceCode: reference, createdAt: 123 });
     if (fault === 'storage-leak') sandbox.localStorage.private = state.question } }
   const popup = sandbox.window.open('about:blank', '_blank')
   await handler(route); if (fault === 'duplicate-save') await handler(route)
   popup.location.replace(urls()[0])
  },
 })
 const expect = value => {
  const methods = {
   toHaveCount: async expected => assert.equal(count(value.key), expected, value.key + ' count'),
   toHaveAttribute: async (name, expected) => { const actual = await value.getAttribute(name); expected instanceof RegExp ? assert.match(actual, expected) : assert.equal(actual, expected) },
   toBeVisible: async () => { assert.equal(count(value.key), 1); if (value.key === 'intake') assert.equal(state.advanced, true); if (value.key === 'disclosure') assert.equal(state.expanded, true) },
   toBeHidden: async () => { assert.equal(value.key === 'intake' ? state.advanced : state.expanded, false) },
   toBeChecked: async () => assert.equal(value.key === 'consent' ? state.consent : value.key === 'radio-' + state.focus, true),
   toHaveText: async text => assert.equal(getText(value.key), text),
   toContainText: async text => assert.ok(getText(value.key).includes(text)),
   not: { toBeChecked: async () => assert.equal(state.consent, false) },
  }; return methods
 }
 const page = { context: () => context, url: () => origin + '/' + locale + '/services/free-situation-review', locator: selector => loc(kind(selector)),
  evaluate: async (fn, arg) => { const result = runInNewContext('(' + fn.toString() + ')(arg)', { ...sandbox, arg }); return result === undefined ? undefined : JSON.parse(JSON.stringify(result)) },
  screenshot: async () => { state.screenshot = true } }
 return { page, expect, state }
}

for (const locale of ['en', 'ru']) test(locale + ' executes complete current browser helper on inert controls with both validation negatives and one private synthetic save', async () => {
 Object.assign(process.env, env)
 const f = fixture(locale)
 await verifyFreeReviewPrivateHandoff(f.page, f.expect, { origin, locale, screenshotPath: 'synthetic.png' })
 assert.equal(f.state.unroute, true)
 assert.equal(f.state.screenshot, true)
 assert.equal(f.state.clicks.filter(key => key === 'submit').length, 3)
 assert.equal(f.state.saved, true)
})
for (const fault of ['implicit-consent', 'missing-private-warning', 'private-url-leak', 'phone-bypass', 'consent-bypass', 'ignored-consent', 'wrong-service', 'duplicate-save', 'missing-link', 'question-leak', 'focus-leak', 'storage-leak'])
 test('actual helper rejects ' + fault + ' and removes route guard', async () => {
  Object.assign(process.env, env)
  const f = fixture('en', fault)
  await assert.rejects(verifyFreeReviewPrivateHandoff(f.page, f.expect, { origin, locale: 'en' }), { code: 'ERR_ASSERTION' })
  assert.equal(f.state.unroute, true)
 })

test('actual core caller retains all locale/viewport checks and invokes current handoff without retired textarea/clipboard flow', () => {
 const core = read('scripts/verify-app-r1.mjs')
 const start = core.indexOf(" for(const locale of ['en','ru']){\n  const publicPage=")
 const end = core.indexOf(' assert.deepEqual(publicErrors,[])', start)
 assert.ok(start > 0 && end > start)
 const block = core.slice(start, end)
 assert.match(block, /\[320,360,390,1280\]/)
 assert.match(block, /await assertFreeReviewLanding\(publicPage,expect,locale\)/)
 assert.match(block, /await verifyFreeReviewPrivateHandoff\(publicPage,expect,\{origin,locale,/)
 assert.match(block, /assertPublicViewportFits\(publicPage,locale\+'\/free-review\/390\/synthetic-receipt'\)/)
 assert.doesNotMatch(block, /data-free-quick-request|clipboard|textarea/)
 const landing = read('components/free-entry-landing.tsx'), express = read('components/personal-express-enquiry.tsx'), intake = read('components/free-drawing-intake.tsx')
 assert.match(landing, /data-optional-written-review/)
 assert.match(express, /compactPhone stayAfterSave resetKey=\{focus\}/)
 assert.match(express, /allowSecureExpressClaim publicServiceTitle=\{t.service\}/)
 assert.match(intake, /\/coaching\/intake\?topic=/)
 assert.doesNotMatch(intake, /<textarea|<form|navigator.clipboard|fetch\(/)
})
