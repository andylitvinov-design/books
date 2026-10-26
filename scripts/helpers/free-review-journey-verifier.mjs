import assert from 'node:assert/strict'
import {hypnotherapyRequestGate, installHypnotherapyPopupSpy, withHypnotherapyIsolation} from './hypnotherapy-enquiry-journey-verifier.mjs'
import {alchemyRequestGate} from './alchemy-enquiry-journey-verifier.mjs'
import {createFreeReviewStartupDiagnostics} from './free-review-startup-diagnostics.mjs'

export const FREE_REVIEW_PHONE = '+14165550123'
export const FREE_REVIEW_NATIONAL_PHONE = '4165550123'
export const freeReviewPublicTopic = locale => 'Express review focus: ' + (locale === 'ru' ? 'Ситуация' : 'Situation')
export const FREE_REVIEW_CONTACT = 'free-review-browser-fixture@example.invalid'
export const FREE_REVIEW_REFERENCE = 'HH-F4EE1234ABCD'
export const FREE_REVIEW_RECEIPT_KEY = 'hh-service-enquiry-receipt:v1'
export const freeReviewPath = locale => `/${locale}/services/free-situation-review`
// One localized service; the current inline disclosure keeps its chooser mounted while folded.
export const freeReviewService = (locale, kind) => kind === 'compact' ? (locale === 'ru' ? 'Бесплатная личная экспресс-диагностика' : 'Free personal express review')
  : locale === 'ru' ? 'Коучинг-форма — бесплатная диагностика по рисунку' : 'Coaching questionnaire — free drawing assessment'
export const freeReviewMarkers = locale => ['problem', 'goal', 'obstacle', 'tried'].map(field => `Synthetic free review ${locale} ${field} marker`)
const copy = {
  en:{heading:'Free personal express review with Andrey.', privateTitle:'Prepare your question privately', privateAction:'Open private coaching questionnaire', privateWarning:'Do not send private answers, drawings or test results through WhatsApp, Telegram or email.', privateSaving:'Saving does not send it to a coach or create a booking.'},
  ru:{heading:'Личная экспресс-диагностика с Андреем.', privateTitle:'Подготовьте запрос приватно', privateAction:'Открыть приватную коучинг-анкету', privateWarning:'Не отправляйте личные ответы, рисунки и результаты тестов через WhatsApp, Telegram или email.', privateSaving:'Сохранение не отправляет его коучу и не создаёт запись.'},
}

export function freeReviewOrigin(raw, locale) {
  assert.ok(['en', 'ru'].includes(locale), 'Only verified free-review locales')
  const url = new URL(raw)
  assert.equal(url.protocol, 'http:')
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname))
  assert.ok(url.port && !url.username && !url.password && !url.search && !url.hash)
  assert.equal(url.pathname, freeReviewPath(locale))
  return url.origin
}

export function assertFreeReviewBody(raw, locale, kind, channel) {
  assert.ok(['en', 'ru'].includes(locale))
  assert.ok(['compact', 'drawing'].includes(kind))
  assert.ok(kind === 'drawing' ? channel === undefined : ['whatsapp', 'telegram'].includes(channel))
  const body = JSON.parse(raw)
  assert.deepEqual(Object.keys(body).sort(), ['operationId', 'serviceTitle', 'description', 'sourcePath', 'locale', 'contact', 'contactConsent', 'website'].sort())
  assert.match(body.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.equal(body.serviceTitle, freeReviewService(locale, kind))
  assert.equal(body.description, kind === 'drawing' ? '' : freeReviewPublicTopic(locale))
  assert.equal(body.sourcePath, freeReviewPath(locale))
  assert.equal(body.locale, locale)
  assert.deepEqual(body.contact, kind === 'compact' ? {displayName:'', email:'', phone:FREE_REVIEW_PHONE} : {displayName:'', email:FREE_REVIEW_CONTACT, phone:''})
  assert.equal(body.contactConsent, true)
  assert.equal(body.website, '')
  for (const marker of freeReviewMarkers(locale)) assert.ok(!raw.includes(marker), 'Drawing answers never enter contact payload')
}

export function syntheticFreeReviewReceipt(locale, kind, channel) {
  let firstBody, count = 0, pending = null, closed = false, confirmed = false
  return {
    get count() { return count },
    get pending() { return Boolean(pending) },
    get confirmed() { return confirmed },
    async accept(route) {
      assert.equal(closed, false, 'No request after fixture close')
      assert.equal(route.request().headers()['content-type'], 'application/json')
      const raw = route.request().postData()
      assertFreeReviewBody(raw, locale, kind, channel)
      if (firstBody !== undefined) assert.equal(raw, firstBody, 'Retry body and UUID are byte-identical; messenger choice never rewrites CRM context')
      else firstBody = raw
      assert.ok(count < 2, 'Only initial failure and explicit retry are accepted')
      count++
      if (count === 1) await route.fulfill({status:503, contentType:'application/json', body:'{"saved":false}'})
      else pending = route
    },
    async confirm() {
      assert.equal(closed, false, 'No stale receipt completion')
      assert.ok(pending, 'A real intercepted retry is required')
      const route = pending
      // Mark before releasing the response: the genuine router may request its
      // receipt immediately. No /thank-you read is admitted before this point.
      confirmed = true
      await route.fulfill({status:200, contentType:'application/json', body:JSON.stringify({saved:true, referenceCode:FREE_REVIEW_REFERENCE})})
      pending = null
    },
    async close() { closed = true; const route = pending; pending = null; if (route) await route.abort() },
  }
}

// Observe a denied request only; none of these reads can grant or forward it.
// Unknown/throwing diagnostic getters retain no raw value or exception text.
function freeReviewFatalRequestDiagnostic(request, url, decoded, locale, origin, beforeInteraction) {
  const scalar = (read, allowed) => {
    try { const value = read(); return allowed.includes(value) ? value : null } catch { return null }
  }
  let mainFrame = null, subframe = null
  try {
    const frame = request.frame(), main = frame.page().mainFrame()
    if (frame && main) { mainFrame = frame === main; subframe = !mainFrame }
  } catch { /* A navigation may not have an associated frame yet. */ }
  const method = scalar(() => request.method(), ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'CONNECT', 'TRACE'])
  const resource = scalar(() => request.resourceType(), ['document', 'stylesheet', 'image', 'media', 'font', 'script', 'texttrack', 'xhr', 'fetch', 'eventsource', 'websocket', 'manifest', 'other'])
  // Exact Next 15.5.21 source endpoint, not an initiator or root-cause claim.
  // Observation only: the original fatal failure and abort remain unchanged.
  const devStackLookupPath = '/__nextjs_original-stack-frames'
  const endpointCategory = url.origin === origin && url.pathname === devStackLookupPath
    && url.href === origin + devStackLookupPath && method === 'POST' && resource === 'fetch'
    ? 'dev-stack-lookup' : 'unclassified'
  return Object.freeze({
    method, resource, endpointCategory,
    pathnameCategory:/^\/api(?:\/|$)/i.test(decoded) ? 'api'
      : url.pathname === freeReviewPath(locale) ? 'free-review'
      : url.pathname === `/${locale}/thank-you` ? 'receipt'
      : url.pathname.startsWith('/_next/static/') ? 'next-static'
      : url.pathname.startsWith('/_next/') ? 'next-internal' : 'other',
    sameOrigin:url.origin === origin,
    navigation:scalar(() => request.isNavigationRequest(), [true, false]),
    mainFrame, subframe, beforeInteraction,
  })
}

/** Reuse the reviewed strict guards; narrow their inputs for this exact route. */
export function freeReviewRequestGate(origin, locale, kind, receipt, failures, blockedReads, {bootstrap=false}={}) {
  assert.ok(['en', 'ru'].includes(locale) && ['compact', 'drawing', 'private-entry'].includes(kind))
  assert.equal(freeReviewOrigin(origin + freeReviewPath(locale), locale), origin)
  assert.equal(typeof bootstrap, 'boolean')
  let draining = false, initialAvailable = bootstrap, initialDocumentLoaded = false, acceptingRequests = !bootstrap
  let firstFatalRequest = null
  // Alchemy's older gate records assertion messages. Never retain those raw
  // diffs here: a rejected payload can contain a private questionnaire marker.
  const redactedFailures = {push: () => failures.push('Free-review delegated boundary failed')}
  const gate = kind !== 'drawing'
    ? hypnotherapyRequestGate(origin, locale, route => receipt.accept(route), redactedFailures, blockedReads)
    : alchemyRequestGate(origin, locale, route => receipt.accept(route), redactedFailures, blockedReads)
  const wrapped = async route => {
    const request = route.request()
    try {
      const url = new URL(request.url()), decoded = decodeURIComponent(url.pathname)
      const exactPost = request.url() === origin + '/api/service-enquiries' && request.method() === 'POST'
      if (exactPost && (!acceptingRequests || kind === 'private-entry')) {
        failures.push(kind === 'private-entry' ? 'Private entry submission blocked' : 'Unexpected startup submission blocked')
        return await route.abort()
      }
      const receiptRead = url.origin === origin && url.pathname === `/${locale}/thank-you`
      if (initialAvailable && !draining && request.url() === origin + freeReviewPath(locale) && request.method() === 'GET' && request.resourceType() === 'document') {
        // Consume before awaiting: a concurrent request/reload cannot reuse it.
        initialAvailable = false
        const response = await route.fetch({maxRedirects:0})
        try {
          assert.equal(response.url(), request.url())
          assert.ok(response.status() >= 200 && response.status() < 300)
          await route.fulfill({response})
          initialDocumentLoaded = true
        } finally { await response.dispose() }
        return
      }
      if ((!exactPost && (request.method() !== 'GET' || /^\/api(?:\/|$)/i.test(decoded))) ||
          (receiptRead && (kind !== 'drawing' || !receipt.confirmed)) ||
          (request.resourceType() === 'document' && !(receiptRead && kind === 'drawing' && receipt.confirmed))) {
        failures.push('Unexpected API, write or navigation blocked')
        if (!firstFatalRequest) {
          try { firstFatalRequest = freeReviewFatalRequestDiagnostic(request, url, decoded, locale, origin, !acceptingRequests) }
          catch { /* Observation never changes the original failure or abort. */ }
        }
        return await route.abort()
      }
      if (draining && !exactPost) return await route.abort()
      await gate(route)
    } catch {
      // Synthetic data stays inside assertions, never diagnostic output.
      failures.push('Free-review request boundary failed')
      await route.abort()
    }
  }
  wrapped.beginTeardown = () => { draining = true; gate.beginTeardown?.() }
  Object.defineProperty(wrapped, 'initialDocumentLoaded', {get: () => initialDocumentLoaded})
  Object.defineProperty(wrapped, 'firstFatalRequest', {get: () => firstFatalRequest})
  wrapped.beginInteraction = () => { assert.equal(initialDocumentLoaded, true); assert.equal(draining, false); acceptingRequests = true }
  return wrapped
}

/** Keep the inherited popup/storage fakes until close, and drain admitted reads
 * before close. Existing Hypnotherapy cleanup also drains callbacks after close. */
export async function withFreeReviewIsolation(context, handler, receipt, run) {
  const active = new Set()
  const tracked = route => {
    const work = Promise.resolve().then(() => handler(route))
    active.add(work)
    work.then(() => active.delete(work), () => active.delete(work))
    return work
  }
  const drain = async () => { while (active.size) await Promise.allSettled([...active]) }
  const guardedContext = {
    route: (...args) => context.route(...args),
    close: async () => {
      const errors = []
      for (const cleanup of [() => handler.beginTeardown(), drain, () => context.close(), drain]) {
        try { await cleanup() } catch (error) { errors.push(error) }
      }
      if (errors.length) throw new AggregateError(errors, 'Free-review guarded close failed')
    },
  }
  return withHypnotherapyIsolation(guardedContext, tracked, receipt, run)
}

/** Socket callbacks cannot expose raw rejection text or outlive context cleanup. */
export function freeReviewSocketBoundary(failures) {
  const active = new Set()
  const handler = socket => {
    const work = Promise.resolve().then(() => socket.close()).catch(() => {
      failures.push('Free-review socket close failed')
    })
    active.add(work)
    work.then(() => active.delete(work))
    return work
  }
  const drain = async () => { while (active.size) await Promise.allSettled([...active]) }
  return {
    handler,
    drain,
    async closeContext(context) {
      await drain()
      try { await context.close() }
      catch { throw new Error('Free-review context close failed') }
      finally { await drain() }
    },
  }
}

export function assertFreeReviewLink(href, locale, kind, channel) {
  assert.ok(['en', 'ru'].includes(locale) && ['compact', 'drawing'].includes(kind))
  assert.ok(['whatsapp', 'telegram'].includes(channel))
  const url = new URL(href), expected = channel === 'whatsapp' ? ['wa.me', '/14376066502'] : ['t.me', '/AndyTherapist']
  assert.equal(url.protocol, 'https:'); assert.equal(url.hostname, expected[0]); assert.equal(url.pathname, expected[1])
  assert.ok(!url.username && !url.password && !url.port && !url.hash)
  assert.deepEqual([...url.searchParams.keys()], ['text'])
  const message = url.searchParams.get('text') || ''
  assert.ok(message.includes(freeReviewService(locale, kind)))
  assert.ok(message.includes(FREE_REVIEW_REFERENCE))
  assert.ok(message.includes('https://holistichouse.vercel.app' + freeReviewPath(locale)))
  for (const marker of [FREE_REVIEW_CONTACT, FREE_REVIEW_PHONE, ...freeReviewMarkers(locale)]) assert.ok(!decodeURIComponent(href).includes(marker), 'Private value never enters messenger draft')
  assert.ok(!message.includes(freeReviewPublicTopic(locale)), 'CRM focus is omitted from external messenger draft')
  assert.doesNotMatch(message, /operationId|contactConsent|example\.invalid|\/api\/|\/app\/|\/auth\/|\/checkout\//)
  return message
}

export async function assertFreeReviewLanding(page, expect, locale) {
  freeReviewOrigin(page.url(), locale)
  const main = page.locator('main[data-free-entry-landing="situation"]')
  await expect(main).toHaveCount(1)
  await expect(main.locator('h1#free-entry-title')).toHaveText(copy[locale].heading)
  const enquiry = main.locator('#request-free-review[data-personal-express-enquiry]')
  await expect(enquiry).toHaveCount(1)
  await expect(main.locator('[data-diagnosis-offer],[data-free-diagnosis-options]')).toHaveCount(0)
  await expect(main.locator('[role="dialog"],[aria-modal="true"]')).toHaveCount(0)
  const reveal = enquiry.locator('button[data-express-reveal]')
  await expect(reveal).toHaveCount(1); await expect(reveal).toBeVisible()
  await expect(reveal).toHaveAttribute('type','button')
  await expect(reveal).toHaveAttribute('aria-expanded','false')
  await expect(reveal).toHaveAttribute('aria-controls','express-request-form')
  const capture = enquiry.locator('#express-request-form[data-express-inline-disclosure]')
  await expect(capture).toHaveCount(1); await expect(capture).toHaveAttribute('role','region')
  await expect(capture).toBeHidden()
  await expect(capture.locator('input[name="express-review-focus"]')).toHaveCount(2)
  await expect(capture.locator('input[name="express-review-focus"][value="situation"]')).toBeChecked()
  await expect(capture.locator('[data-contact-channel-chooser]')).toHaveCount(1)
  await expect(capture.locator('[data-contact-channel-chooser]')).toBeHidden()
  await expect(capture.locator('[data-free-diagnostic-start],[data-service-lead-capture]')).toHaveCount(0)
  const advanced = main.locator('details[data-optional-written-review]')
  await expect(advanced).toHaveCount(1)
  assert.equal(await advanced.evaluate(element => element.open), false, 'Private questionnaire entry information starts collapsed')
  const intake = advanced.locator('[data-free-drawing-intake]')
  await expect(intake).toHaveCount(1)
  await expect(intake).toBeHidden()
  // The independent private questionnaire link remains separate from contact capture.
  const legacy = main.locator('a[data-source="coaching-questionnaire"]')
  await expect(legacy).toHaveCount(1)
  await expect(legacy).toHaveAttribute('href', `/${locale}/coaching/intake`)
  return {main, enquiry, reveal, capture, advanced, intake}
}

export function installFreeReviewProbe() {
  const grant = () => { if (document.documentElement) document.documentElement.dataset.analyticsConsent = 'granted' }
  grant()
  document.addEventListener('DOMContentLoaded', grant, {once:true})
  window.__freeReviewEvents = []
  window.__freeReviewProbeStorageFailed = false
  // Only scalar fixture counts persist across genuine document navigation.
  // No event content, contact, answers or popup URL enters storage.
  const increment = key => {
    try {
      const count = Number(sessionStorage.getItem(key) || 0)
      if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid fixture count')
      sessionStorage.setItem(key, String(count + 1))
    } catch { window.__freeReviewProbeStorageFailed = true }
  }
  window.addEventListener('holistic-house:acquisition', event => {
    window.__freeReviewEvents.push(event.detail)
    increment('hh-synthetic-free-review-events:v1')
  })
  const inertOpen = window.open
  window.open = (...args) => {
    increment('hh-synthetic-free-review-popups:v1')
    return inertOpen(...args)
  }
  window.__freeReviewClipboard = {denied:false, attempts:0, values:[]}
  Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async value => {
    window.__freeReviewClipboard.attempts++
    if (window.__freeReviewClipboard.denied) throw new DOMException('Synthetic clipboard denial', 'NotAllowedError')
    window.__freeReviewClipboard.values.push(value)
  }}})
}

export function freeReviewInitScript(denyReceiptStorage) {
  assert.equal(typeof denyReceiptStorage, 'boolean')
  // One ordered init script, installed before creating a page. Neither function
  // clears the receipt; a real thank-you document must read the saved reference.
  return {content:'(' + installHypnotherapyPopupSpy.toString() + ')(' + JSON.stringify({receiptKey:FREE_REVIEW_RECEIPT_KEY, denyReceiptStorage}) + ');\n(' + installFreeReviewProbe.toString() + ')();'}
}

async function assertPrivateState(page, locale) {
  const state = await page.evaluate(key => ({events:window.__freeReviewEvents, eventCount:Number(sessionStorage.getItem('hh-synthetic-free-review-events:v1') || 0), probeStorageFailed:window.__freeReviewProbeStorageFailed, url:window.location.href, receipt:sessionStorage.getItem(key)}), FREE_REVIEW_RECEIPT_KEY)
  assert.equal(state.events.length, 0, 'Temporary analytics hold emits no acquisition event, even with stale granted dataset')
  assert.equal(state.eventCount, 0, 'No earlier document emitted an acquisition event')
  assert.equal(state.probeStorageFailed, false, 'Cross-document fixture count must remain observable')
  for (const marker of [FREE_REVIEW_CONTACT, FREE_REVIEW_PHONE, ...freeReviewMarkers(locale)]) {
    assert.ok(!decodeURIComponent(state.url).includes(marker), 'Private values never enter page URL')
    assert.ok(!JSON.stringify(state.events).includes(marker), 'Private values never enter event metadata')
    assert.ok(!String(state.receipt).includes(marker), 'Receipt never contains private values')
  }
}

async function assertReceiptStorage(page, denyReceiptStorage) {
  const stored = await page.evaluate(key => sessionStorage.getItem(key), FREE_REVIEW_RECEIPT_KEY)
  if (denyReceiptStorage) assert.equal(stored, null)
  else {
    const value = JSON.parse(stored)
    assert.deepEqual(Object.keys(value).sort(), ['createdAt', 'referenceCode'])
    assert.equal(value.referenceCode, FREE_REVIEW_REFERENCE)
    assert.ok(Number.isSafeInteger(value.createdAt))
  }
}

async function assertLinks(scope, expect, locale, kind, attribute) {
  const links = scope.locator(`a[${attribute}]`), hrefs = {}, messages = []
  await expect(links).toHaveCount(2)
  for (const channel of ['whatsapp', 'telegram']) {
    const link = scope.locator(`a[${attribute}="${channel}"]`)
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('target', '_blank')
    assert.deepEqual((await link.getAttribute('rel')).split(/\s+/).sort(), ['noopener', 'noreferrer'])
    hrefs[channel] = await link.getAttribute('href')
    messages.push(assertFreeReviewLink(hrefs[channel], locale, kind, channel))
  }
  assert.equal(messages[0], messages[1], 'Both channels retain the same public draft')
  return hrefs
}

export async function verifyFreeReviewCompactInPage(page, expect, locale, receipt, failures, {channel='whatsapp', denyReceiptStorage=false}={}) {
  const origin = freeReviewOrigin(page.url(), locale)
  const {main, enquiry, reveal, capture, advanced} = await assertFreeReviewLanding(page, expect, locale)
  await reveal.click()
  await expect(capture).toBeVisible(); await expect(capture).toHaveAttribute('role','region')
  await expect(enquiry.locator('h2#express-enquiry-title')).toBeVisible()
  await expect(capture.locator('input[name="express-review-focus"][value="energy"]')).toHaveCount(1)
  await capture.locator('input[name="express-review-focus"][value="energy"]').check()
  await expect(main.locator('[data-optional-written-review]')).toHaveCount(0)
  await capture.locator('input[name="express-review-focus"][value="situation"]').check()
  await expect(advanced).toHaveCount(1)
  await expect(capture.locator('[data-free-diagnostic-start]')).toHaveCount(0)
  await expect(capture.locator('[data-reiki-phone-enquiry]')).toHaveCount(1)
  await expect(capture.locator('[data-phone-country-input] select')).toHaveCount(1)
  assert.equal(receipt.count,0,'Selecting a focus never submits or creates another service')
  await capture.scrollIntoViewIfNeeded()
  const form = capture.locator('[data-reiki-phone-enquiry] form'), contact = form.locator('input[type="tel"]')
  const country = form.locator('[data-phone-country-input] select')
  await country.selectOption('CA')
  const consent = form.locator('input[type="checkbox"]'), submit = form.locator(`button[data-contact-channel-submit="${channel}"]`)
  const other = form.locator(`button[data-contact-channel-submit="${channel === 'whatsapp' ? 'telegram' : 'whatsapp'}"]`)
  const popups = () => page.evaluate(() => window.__hypnotherapyFixture.popups.map(p => ({closed:p.closed, opener:p.opener, destinations:p.destinations})))
  await expect(consent).not.toBeChecked()
  await expect(capture.locator('a[data-contact-channel]')).toHaveCount(0)
  await consent.check(); await contact.fill('invalid-contact'); await submit.click()
  await expect(form.locator('[role="alert"]')).toBeVisible()
  assert.equal(receipt.count, 0); assert.deepEqual(await popups(), [])
  await contact.fill(FREE_REVIEW_CONTACT); await submit.click()
  await expect(form.locator('[role="alert"]')).toBeVisible()
  assert.equal(receipt.count,0); assert.deepEqual(await popups(),[]);
  await consent.uncheck(); await contact.fill(FREE_REVIEW_NATIONAL_PHONE); await submit.click()
  await expect(form.locator('[role="alert"]')).toBeVisible()
  assert.equal(receipt.count, 0); assert.deepEqual(await popups(), [])
  await consent.check(); await submit.click()
  await expect.poll(() => receipt.count).toBe(1)
  await expect(form.locator('[role="alert"]')).toBeVisible()
  await expect(submit).toBeEnabled()
  for (const control of [country, contact, consent]) await expect(control).toBeDisabled()
  await expect(other).toBeEnabled()
  await expect(contact).toHaveValue(FREE_REVIEW_NATIONAL_PHONE); await expect(consent).toBeChecked()
  await expect(capture.locator('[role="status"]')).toHaveCount(0)
  await expect(capture.locator('a[data-contact-channel]')).toHaveCount(0)
  assert.deepEqual(await popups(), [{closed:true, opener:null, destinations:[]}])
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), FREE_REVIEW_RECEIPT_KEY), null)
  await reveal.click(); await expect(capture).toBeHidden()
  await expect(form).toHaveCount(1) // Fold is visibility-only, not unmount/cancellation.
  await reveal.click(); await expect(capture).toBeVisible()
  await expect(contact).toHaveValue(FREE_REVIEW_NATIONAL_PHONE); await expect(consent).toBeChecked()
  for (const control of [country, contact, consent]) await expect(control).toBeDisabled()
  assert.equal(receipt.count,1,'Revealing an unknown operation does not retry it')
  await submit.click()
  await expect.poll(() => receipt.pending).toBe(true)
  for (const control of [submit, other, country, contact, consent]) await expect(control).toBeDisabled()
  await expect(capture.locator('[role="status"]')).toHaveCount(0)
  await expect(capture.locator('a[data-contact-channel]')).toHaveCount(0)
  assert.deepEqual(await popups(), [{closed:true, opener:null, destinations:[]}, {closed:false, opener:null, destinations:[]}])
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), FREE_REVIEW_RECEIPT_KEY), null)
  assert.deepEqual(failures, [])
  await reveal.click(); await expect(capture).toBeHidden(); await expect(form).toHaveCount(1)
  assert.equal(receipt.pending,true,'Folding does not cancel the pending operation')
  await reveal.click(); await expect(capture).toBeVisible()
  for (const control of [submit, other, country, contact, consent]) await expect(control).toBeDisabled()
  await receipt.confirm()
  await expect(capture.locator('[role="status"]')).toBeVisible()
  await expect(capture.locator('[role="status"]')).toContainText(FREE_REVIEW_REFERENCE)
  await expect(form).toHaveCount(0)
  await expect(page).toHaveURL(origin + freeReviewPath(locale))
  const hrefs = await assertLinks(capture, expect, locale, 'compact', 'data-contact-channel')
  await expect.poll(popups).toEqual([{closed:true, opener:null, destinations:[]}, {closed:false, opener:null, destinations:[hrefs[channel]]}])
  const spy = await page.evaluate(() => ({opens:window.__hypnotherapyFixture.opens, unexpected:window.__hypnotherapyFixture.unexpected}))
  assert.equal(spy.opens.length, 2)
  assert.equal(await page.evaluate(() => Number(sessionStorage.getItem('hh-synthetic-free-review-popups:v1') || 0)), 2, 'No startup or earlier document popup escaped observation')
  assert.ok(spy.opens.every(p => p.url === 'about:blank' && p.target === '_blank' && p.features === undefined))
  assert.deepEqual(spy.unexpected, [])
  assert.equal(await advanced.evaluate(element => element.open), false, 'A compact request never requires the drawing questionnaire')
  await assertReceiptStorage(page, denyReceiptStorage)
  await assertPrivateState(page, locale)
  assert.equal(receipt.count, 2); assert.deepEqual(failures, [])
}

// A snapshot of the actual rendered public entry, not an invented answer form.
// The browser deliberately stops before private navigation/authentication.
export function assertFreeReviewPrivateEntrySnapshot(snapshot, locale, topic = 'personal') {
  assert.ok(['en', 'ru'].includes(locale))
  assert.ok(['personal','wellbeing','relationships','career','business','goal','other'].includes(topic))
  assert.equal(snapshot.lang, locale)
  assert.equal(snapshot.heading, copy[locale].privateTitle)
  assert.ok(snapshot.titleId)
  assert.equal(snapshot.labelledBy, snapshot.titleId)
  assert.deepEqual(snapshot.hrefs, [`/${locale}/coaching/intake?topic=${topic}`])
  assert.deepEqual(snapshot.linkNames, [copy[locale].privateAction])
  assert.equal(snapshot.controls, 0, 'Public entry must not collect, submit, copy or export private answers')
  assert.ok(snapshot.text.includes(copy[locale].privateWarning), 'Private materials must not be sent through messenger/email')
  assert.ok(snapshot.text.includes(copy[locale].privateSaving), 'A private draft is not a send or booking')
  for (const marker of [FREE_REVIEW_CONTACT, FREE_REVIEW_PHONE, ...freeReviewMarkers(locale)]) assert.ok(!JSON.stringify(snapshot).includes(marker), 'No private fixture value may escape into public entry')
}

export async function verifyFreeReviewPrivateEntryInPage(page, expect, locale, receipt, failures, {output} = {}) {
  const origin = freeReviewOrigin(page.url(), locale)
  const {capture, advanced, intake} = await assertFreeReviewLanding(page, expect, locale)
  await advanced.locator(':scope > summary').click()
  await expect(intake).toBeVisible()
  const snapshot = await intake.evaluate(node => ({
    lang: node.getAttribute('lang'), labelledBy: node.getAttribute('aria-labelledby'),
    titleId: node.querySelector('h2')?.id, heading: node.querySelector('h2')?.textContent?.trim(),
    hrefs: [...node.querySelectorAll('a')].map(link => link.getAttribute('href')),
    linkNames: [...node.querySelectorAll('a')].map(link => link.textContent.trim()),
    controls: node.querySelectorAll('form,input,textarea,button,[data-contact-channel-chooser],a[data-contact-channel]').length,
    text: node.textContent,
  }))
  assertFreeReviewPrivateEntrySnapshot(snapshot, locale)
  const link = intake.locator(`a[href="/${locale}/coaching/intake?topic=personal"]`)
  await expect(link).toHaveCount(1); await expect(link).toBeVisible()
  await link.scrollIntoViewIfNeeded(); await link.focus(); await expect(link).toBeFocused()
  const box = await link.boundingBox(), viewport = page.viewportSize()
  assert.ok(box && viewport && box.width > 0 && box.height > 0 && box.x >= -2 && box.x + box.width <= viewport.width + 2,
    'Private questionnaire entry remains visible without horizontal overflow')
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), 'Expanded private entry fits the viewport')
  await expect(page).toHaveURL(origin + freeReviewPath(locale))
  await expect(capture.locator('[data-free-diagnostic-start]')).toHaveCount(0)
  await expect(capture.locator('[data-contact-channel-chooser]')).toHaveCount(1)
  await expect(capture).toBeHidden()
  await expect(capture.locator('[data-compact-lead-form]')).toHaveCount(0)
  await expect(capture.locator('[role="status"]')).toHaveCount(0)
  assert.equal(receipt.count, 0, 'Opening private-entry information never submits a contact or answers')
  assert.equal(receipt.pending, false); assert.equal(receipt.confirmed, false)
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), FREE_REVIEW_RECEIPT_KEY), null)
  assert.deepEqual(await page.evaluate(() => window.__freeReviewClipboard), {denied:false, attempts:0, values:[]}, 'No copy/export attempt before private navigation')
  assert.deepEqual(await page.evaluate(() => window.__hypnotherapyFixture.opens), [], 'No automatic messenger or external navigation')
  assert.equal(await page.evaluate(() => Number(sessionStorage.getItem('hh-synthetic-free-review-popups:v1') || 0)), 0)
  await assertPrivateState(page, locale)
  assert.deepEqual(failures, [])
  if (output) await intake.screenshot({path:`${output}/free-review-${locale}-private-entry-390.png`})
}

export async function verifyFreeReviewJourney(sourcePage, expect, locale, {kind='compact', channel='whatsapp', denyReceiptStorage=false, output}={}) {
  const origin = freeReviewOrigin(sourcePage.url(), locale)
  assert.ok(['compact', 'private-entry'].includes(kind))
  assert.ok(['whatsapp', 'telegram'].includes(channel))
  const context = await sourcePage.context().browser().newContext({serviceWorkers:'block', viewport:sourcePage.viewportSize()})
  const receipt = syntheticFreeReviewReceipt(locale, kind === 'compact' ? 'compact' : 'drawing', kind === 'compact' ? channel : undefined)
  const failures = [], blockedReads = [], pageErrors = []
  const sockets = freeReviewSocketBoundary(failures)
  const guardedContext = {route:(...args) => context.route(...args), close:() => sockets.closeContext(context)}
  let primary, handler, observedPage, pageErrorListener, completed = false
  const startupDiagnostics = createFreeReviewStartupDiagnostics(() => failures.length === 0 && !handler?.firstFatalRequest)
  try {
    await context.routeWebSocket('**/*', sockets.handler)
    handler = freeReviewRequestGate(origin, locale, kind, receipt, failures, blockedReads, {bootstrap:true})
    await withFreeReviewIsolation(guardedContext, handler, receipt, async () => {
      try {
        await context.addInitScript(freeReviewInitScript(denyReceiptStorage))
        const page = await context.newPage()
        observedPage = page
        pageErrorListener = error => { pageErrors.push('Page error'); startupDiagnostics.observePageError(error) }
        page.on('pageerror', pageErrorListener)
        startupDiagnostics.attachConsole(page)
        // HTTP, API/write, socket and popup boundaries exist before any page script.
        await page.goto(origin + freeReviewPath(locale), {waitUntil:'networkidle'})
        assert.equal(handler.initialDocumentLoaded, true, 'Only the exact guarded initial document may load')
        assert.equal(receipt.count, 0, 'Bootstrap never submits a contact')
        assert.deepEqual(failures, [])
        assert.equal(await page.evaluate(() => window.__hypnotherapyFixture.opens.length), 0, 'No startup popup')
        startupDiagnostics.freeze('interaction'); startupDiagnostics.detachConsole()
        handler.beginInteraction()
        if (kind === 'compact') {
          await verifyFreeReviewCompactInPage(page, expect, locale, receipt, failures, {channel, denyReceiptStorage})
        } else await verifyFreeReviewPrivateEntryInPage(page, expect, locale, receipt, failures, {output})
      } finally { startupDiagnostics.freeze(failures.length ? 'boundary' : 'cleanup'); startupDiagnostics.detachConsole() }
    })
  } catch (error) { primary = error }
  finally {
    startupDiagnostics.freeze(failures.length ? 'boundary' : 'cleanup'); startupDiagnostics.detachConsole()
    // Also covers partial setup before withFreeReviewIsolation owns the context.
    try { await guardedContext.close() } catch (error) { if (!primary) primary = error }
    // Preserve the original pageerror count through both closes, then detach.
    try { observedPage?.off('pageerror', pageErrorListener) } catch { /* Observation cleanup is best effort. */ }
    // Only decide success after the last close AND all admitted socket callbacks.
    if (!primary) {
      try {
        assert.equal(receipt.count, kind === 'compact' ? 2 : 0); assert.deepEqual(failures, []); assert.deepEqual(pageErrors, [])
        completed = true
      } catch (error) { primary = error }
    }
    console.log('SYNTHETIC_FREE_REVIEW_BOUNDARY', JSON.stringify({locale, kind, channel:kind === 'compact' ? channel : null, denyReceiptStorage, completed:completed && !primary,
      requestCount:receipt.count, failureCount:failures.length, pageErrorCount:pageErrors.length,
      blocked:blockedReads.map(read => ({type:read.type, asset:read.asset || (read.path?.startsWith('/_next/static/') ? 'next-static' : 'other')})),
      ...(primary ? {startupDiagnostics:startupDiagnostics.snapshot()} : {}),
      ...(primary && handler?.firstFatalRequest ? {firstFatalRequest:handler.firstFatalRequest} : {})}))
  }
  if (primary) throw primary
}
