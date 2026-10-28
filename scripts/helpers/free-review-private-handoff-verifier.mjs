import assert from 'node:assert/strict'
import { RECEIPT_SESSION_KEY } from '../../lib/practitioners/enquiry-receipt.mjs'

const REFERENCE = 'HH-ABCD1234EF56'
const PHONE = '+14165550123'
const copy = {
 en: { title: 'Free personal express review with Andrey.', service: 'Free personal express review',
  focus: 'Situation', phoneError: 'Enter your international phone number.',
  consentError: 'Please agree to one personal reply before continuing.',
  privateTitle: 'Prepare your question privately', privateAction: 'Open private coaching questionnaire',
  privateSave: 'Saving does not send it to a coach or create a booking.' },
 ru: { title: 'Личная экспресс-диагностика с Андреем.', service: 'Бесплатная личная экспресс-диагностика',
  focus: 'Ситуация', phoneError: 'Введите номер телефона с кодом страны.',
  consentError: 'Для отправки подтвердите согласие на один личный ответ.',
  privateTitle: 'Подготовьте запрос приватно', privateAction: 'Открыть приватную коучинг-анкету',
  privateSave: 'Сохранение не отправляет его коучу и не создаёт запись.' },
}

export function assertFreeReviewVerifierBoundary(origin, locale, env = process.env) {
 assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/)
 assert.equal(new URL(origin).origin, origin)
 assert.ok(Object.hasOwn(copy, locale), 'Only the pinned EN/RU free-review flow is covered')
 const db = new URL(env.HH_TEST_ADMIN_DATABASE_URL || 'http://invalid')
 assert.ok(env.CI === 'true' && env.HH_APP_TEST_RUNTIME === 'isolated' && !env.VERCEL &&
  ['127.0.0.1', 'localhost'].includes(db.hostname) && db.pathname === '/hh_app_test',
  'Free review verification requires the isolated hh_app_test runtime')
}

// The sole permitted write is fulfilled in memory. Context routing protects
// popups too; unexpected writes and ALL provider requests are blocked, not sent.
export function createFreeReviewRouteGuard(origin, locale, env = process.env) {
 assertFreeReviewVerifierBoundary(origin, locale, env)
 const submissions = [], blocked = []
 const route = async route => {
  const request = route.request(), url = new URL(request.url()), method = request.method()
  if (url.origin === origin && url.pathname === '/api/service-enquiries' && !url.search && method === 'POST') {
   submissions.push(request.postDataJSON())
   return route.fulfill({ status: 201, contentType: 'application/json',
    body: JSON.stringify({ saved: true, referenceCode: REFERENCE }) })
  }
  if (url.origin === origin && ['GET', 'HEAD'].includes(method)) return route.continue()
  blocked.push({ sameOrigin: url.origin === origin, method })
  return route.abort('blockedbyclient')
 }
 return { route, submissions, blocked }
}

export function assertFreeReviewSyntheticPayload(payload, locale, question) {
 const t = copy[locale]
 assert.deepEqual(Object.keys(payload).sort(), ['operationId', 'serviceTitle', 'description', 'sourcePath', 'locale', 'contact', 'contactConsent', 'website'].sort())
 assert.match(payload.operationId, /^[a-f0-9-]{36}$/i)
 assert.equal(payload.serviceTitle, t.service)
 assert.equal(payload.description, 'Express review focus: ' + t.focus + '\nInitial question: ' + question)
 assert.equal(payload.sourcePath, '/' + locale + '/services/free-situation-review')
 assert.equal(payload.locale, locale)
 assert.deepEqual(payload.contact, { displayName: '', email: '', phone: PHONE })
 assert.equal(payload.contactConsent, true)
 assert.equal(payload.website, '')
}

export function assertFreeReviewPreparedUrls(urls, privateMarkers) {
 assert.equal(urls.length, 2)
 const parsed = urls.map(href => new URL(href))
 for (const [i, url] of parsed.entries()) {
  assert.equal(url.origin, i === 0 ? 'https://wa.me' : 'https://t.me')
  assert.equal(url.pathname, i === 0 ? '/14376066502' : '/AndyTherapist')
  assert.equal(url.username + url.password + url.hash, '')
  assert.deepEqual([...url.searchParams.keys()], ['text'])
  assert.ok(url.searchParams.get('text')?.trim())
  assert.ok(url.searchParams.get('text').includes(REFERENCE))
  for (const marker of [...privateMarkers, PHONE, '4165550123', 'Express review focus:', 'Initial question:'])
   assert.ok(!decodeURIComponent(url.href).includes(marker), 'Private answers, phone and focus never enter a messenger URL')
 }
 assert.equal(parsed[0].searchParams.get('text'), parsed[1].searchParams.get('text'))
}

export async function assertFreeReviewLanding(page, expect, locale) {
 assert.ok(Object.hasOwn(copy, locale))
 const main = page.locator('main[data-free-entry-landing="situation"]')
 await expect(main).toHaveCount(1)
 await expect(main.getByRole('heading', { level: 1, name: copy[locale].title, exact: true })).toBeVisible({ timeout: 30000 })
 const enquiry = main.locator('[data-personal-express-enquiry]')
 await expect(enquiry).toHaveCount(1)
 await expect(enquiry).toHaveAttribute('lang', locale)
 await expect(enquiry.locator('[data-express-reveal]')).toHaveAttribute('aria-expanded', 'false')
 await expect(enquiry.locator('[data-express-inline-disclosure]')).toBeHidden()
 await expect(enquiry.locator('[data-free-express-lead]')).toHaveCount(0)
 const advanced = main.locator('details[data-optional-written-review]')
 await expect(advanced).toHaveCount(1)
 assert.equal(await advanced.evaluate(element => element.open), false, 'Detailed private questionnaire starts collapsed')
 await expect(advanced.locator('[data-free-drawing-intake]')).toBeHidden()
 return { main, enquiry, advanced }
}

export async function verifyFreeReviewPrivateHandoff(page, expect, { origin, locale, screenshotPath }) {
 assertFreeReviewVerifierBoundary(origin, locale)
 assert.equal(page.url(), origin + '/' + locale + '/services/free-situation-review')
 const guard = createFreeReviewRouteGuard(origin, locale), context = page.context(), t = copy[locale]
 await context.route('**/*', guard.route)
 try {
  const { enquiry, advanced } = await assertFreeReviewLanding(page, expect, locale)
  const markers = ['Synthetic public form value — ' + locale, 'Synthetic public goal value — ' + locale]
  const question = markers.join('; ')
  await page.evaluate(() => {
   document.documentElement.dataset.analyticsConsent = 'granted'
   window.__publicAcquisition = []
   window.addEventListener('holistic-house:acquisition', event => window.__publicAcquisition.push(event.detail))
   // Exercise registration/privacy, not provider navigation. The separate native
   // gesture suite covers popups. This stub cannot visit a provider or send a chat.
   window.open = () => ({ opener: null, closed: false, location: { replace: () => {} }, close: () => {} })
  })
  await advanced.locator(':scope > summary').click()
  const intake = advanced.locator('[data-free-drawing-intake]')
  await expect(intake).toBeVisible()
  await expect(intake.getByRole('heading', { name: t.privateTitle, exact: true })).toBeVisible()
  await expect(intake).toContainText(t.privateSave)
  await expect(intake.locator('form, textarea, input[type="file"]')).toHaveCount(0)
  await expect(intake.getByRole('link', { name: t.privateAction, exact: true }))
   .toHaveAttribute('href', '/' + locale + '/coaching/intake?topic=personal')
  // The old public answer/copy form was retired. Its replacement prepares only
  // a private in-site questionnaire link, never answers in clipboard or chat.
  await advanced.locator(':scope > summary').click()
  await expect(intake).toBeHidden()
  const reveal = enquiry.locator('[data-express-reveal]')
  await reveal.click()
  await expect(reveal).toHaveAttribute('aria-expanded', 'true')
  await expect(enquiry.locator('[data-express-inline-disclosure]')).toBeVisible()
  for (const focus of ['energy', 'situation']) {
   await enquiry.locator('[data-express-focus="' + focus + '"]').click()
   await expect(enquiry.locator('input[value="' + focus + '"]')).toBeChecked()
   await expect(enquiry.locator('[data-express-focus="' + focus + '"]')).toHaveAttribute('data-selected', 'true')
   await expect(enquiry.locator('input[type="checkbox"]')).not.toBeChecked()
   assert.equal(guard.submissions.length, 0, 'Opening or choosing a focus is not a save')
  }
  const chooser = enquiry.locator('[data-contact-channel-chooser][data-reiki-phone-enquiry]')
  await expect(chooser).toHaveCount(1)
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
  const form = chooser.locator('form'), phone = form.locator('[data-phone-country-input] input[type="tel"]')
  const consent = form.locator('input[type="checkbox"]')
  const submit = form.locator('button[data-contact-channel-submit="whatsapp"]')
  await expect(phone).toHaveAttribute('required', '')
  await expect(consent).toHaveAttribute('required', '')
  await submit.click()
  await expect(form.getByRole('alert')).toHaveText(t.phoneError)
  assert.equal(guard.submissions.length, 0, 'An invalid phone never submits')
  await form.locator('[data-phone-country-input] select').selectOption('CA')
  await phone.fill('4165550123')
  await submit.click()
  await expect(form.getByRole('alert')).toHaveText(t.consentError)
  assert.equal(guard.submissions.length, 0, 'A phone without explicit consent never submits')
  const details = form.locator('details').filter({ has: page.locator('textarea') })
  assert.equal(await details.evaluate(element => element.open), false)
  await details.locator(':scope > summary').click()
  await form.locator('textarea').fill(question)
  await consent.check()
  await expect(consent).toBeChecked()
  await submit.click()
  await expect(chooser.getByRole('status')).toContainText(REFERENCE)
  assert.equal(guard.submissions.length, 1, 'Exactly one synthetic consented save')
  assertFreeReviewSyntheticPayload(guard.submissions[0], locale, question)
  await expect(chooser.locator('form')).toHaveCount(0)
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(2)
  const urls = []
  for (const channel of ['whatsapp', 'telegram']) {
   const link = chooser.locator('a[data-contact-channel="' + channel + '"]')
   await expect(link).toBeVisible()
   await expect(link).toHaveAttribute('target', '_blank')
   await expect(link).toHaveAttribute('rel', /noopener/)
   await expect(link).toHaveAttribute('rel', /noreferrer/)
   urls.push(await link.getAttribute('href'))
  }
  assertFreeReviewPreparedUrls(urls, [...markers, t.focus])
  assert.equal(page.url(), origin + '/' + locale + '/services/free-situation-review', 'The receipt stays on this page')
  const evidence = await page.evaluate(key => ({
   receipt: JSON.parse(sessionStorage.getItem(key) || 'null'),
   storage: [...Object.values(sessionStorage), ...Object.values(localStorage)],
   events: window.__publicAcquisition,
  }), RECEIPT_SESSION_KEY)
  assert.deepEqual(Object.keys(evidence.receipt).sort(), ['createdAt', 'referenceCode'])
  assert.equal(evidence.receipt.referenceCode, REFERENCE)
  assert.ok(Number.isFinite(evidence.receipt.createdAt))
  assert.deepEqual(evidence.events, [], 'The temporary analytics hold emits no acquisition events')
  for (const marker of [...markers, PHONE, '4165550123']) {
   assert.ok(!decodeURIComponent(page.url()).includes(marker))
   assert.ok(!JSON.stringify(evidence).includes(marker), 'Private answers and phone never enter storage or analytics')
  }
  assert.deepEqual(guard.blocked, [], 'No unexpected write or provider request was attempted')
  if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: false })
 } finally {
  await context.unroute('**/*', guard.route)
 }
}
