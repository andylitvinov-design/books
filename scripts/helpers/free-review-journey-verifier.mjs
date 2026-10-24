import assert from 'node:assert/strict'
import {hypnotherapyRequestGate, installHypnotherapyPopupSpy, withHypnotherapyIsolation} from './hypnotherapy-enquiry-journey-verifier.mjs'
import {alchemyRequestGate} from './alchemy-enquiry-journey-verifier.mjs'

export const FREE_REVIEW_CONTACT = 'free-review-browser-fixture@example.invalid'
export const FREE_REVIEW_REFERENCE = 'HH-F4EE1234ABCD'
export const FREE_REVIEW_RECEIPT_KEY = 'hh-service-enquiry-receipt:v1'
export const freeReviewPath = locale => `/${locale}/services/free-situation-review`
export const freeReviewService = (locale, kind) => kind === 'compact' ? 'Free written Situation Review'
  : locale === 'ru' ? 'Коучинг-форма — бесплатная диагностика по рисунку' : 'Coaching questionnaire — free drawing assessment'
export const freeReviewMarkers = locale => ['problem', 'goal', 'obstacle', 'tried'].map(field => `Synthetic free review ${locale} ${field} marker`)
const copy = {
  en:{heading:'See your situation from a fresh perspective.', ready:'Your answers are ready to copy. Nothing has been sent.', copy:'Copy answers', copied:'Copied', fallback:'Select and copy the text below'},
  ru:{heading:'Взгляните на свою ситуацию под другим углом.', ready:'Ответы готовы к копированию. Пока ничего не отправлено.', copy:'Скопировать ответы', copied:'Скопировано', fallback:'Выделите и скопируйте текст ниже'},
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
  assert.equal(body.description, kind === 'drawing' ? '' : 'Preferred reply channel: ' + (channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'))
  assert.equal(body.sourcePath, freeReviewPath(locale))
  assert.equal(body.locale, locale)
  assert.deepEqual(body.contact, {displayName:'', email:FREE_REVIEW_CONTACT, phone:''})
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
      if (firstBody !== undefined) assert.equal(raw, firstBody, 'Retry body, UUID and channel are byte-identical')
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

/** Reuse the reviewed strict guards; narrow their inputs for this exact route. */
export function freeReviewRequestGate(origin, locale, kind, receipt, failures, blockedReads, {bootstrap=false}={}) {
  assert.ok(['en', 'ru'].includes(locale) && ['compact', 'drawing'].includes(kind))
  assert.equal(freeReviewOrigin(origin + freeReviewPath(locale), locale), origin)
  assert.equal(typeof bootstrap, 'boolean')
  let draining = false, initialAvailable = bootstrap, initialDocumentLoaded = false, acceptingRequests = !bootstrap
  // Alchemy's older gate records assertion messages. Never retain those raw
  // diffs here: a rejected payload can contain a private questionnaire marker.
  const redactedFailures = {push: () => failures.push('Free-review delegated boundary failed')}
  const gate = kind === 'compact'
    ? hypnotherapyRequestGate(origin, locale, route => receipt.accept(route), redactedFailures, blockedReads)
    : alchemyRequestGate(origin, locale, route => receipt.accept(route), redactedFailures, blockedReads)
  const wrapped = async route => {
    const request = route.request()
    try {
      const url = new URL(request.url()), decoded = decodeURIComponent(url.pathname)
      const exactPost = request.url() === origin + '/api/service-enquiries' && request.method() === 'POST'
      if (exactPost && !acceptingRequests) {
        failures.push('Unexpected startup submission blocked')
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
  for (const marker of [FREE_REVIEW_CONTACT, ...freeReviewMarkers(locale)]) assert.ok(!decodeURIComponent(href).includes(marker), 'Private value never enters messenger draft')
  assert.doesNotMatch(message, /operationId|contactConsent|example\.invalid|\/api\/|\/app\/|\/auth\/|\/checkout\//)
  return message
}

export async function assertFreeReviewLanding(page, expect, locale) {
  freeReviewOrigin(page.url(), locale)
  const main = page.locator('main[data-free-entry-landing="situation"]')
  await expect(main).toHaveCount(1)
  await expect(main.locator('h1#free-entry-title')).toHaveText(copy[locale].heading)
  await expect(main.locator('a[href="#request-free-review"]')).toHaveCount(1)
  await expect(main.locator('a[href="#request-free-review"]')).toBeVisible()
  const capture = main.locator('#request-free-review[data-service-lead-capture]')
  await expect(capture).toHaveCount(1)
  await expect(capture).toBeVisible()
  await expect(capture.locator('[data-compact-lead-form]')).toHaveCount(1)
  const advanced = main.locator('details[data-optional-written-review]')
  await expect(advanced).toHaveCount(1)
  assert.equal(await advanced.evaluate(element => element.open), false, 'Detailed drawing form starts collapsed')
  const intake = advanced.locator('[data-free-drawing-intake]')
  await expect(intake).toHaveCount(1)
  await expect(intake).toBeHidden()
  // The independent original coaching questionnaire is not the drawing form.
  const legacy = main.locator('a[data-source="coaching-questionnaire"]')
  await expect(legacy).toHaveCount(1)
  await expect(legacy).toHaveAttribute('href', `/${locale}/coaching/intake`)
  return {main, capture, advanced, intake}
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
  window.__freeReviewClipboard = {denied:false, values:[]}
  Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async value => {
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
  for (const marker of [FREE_REVIEW_CONTACT, ...freeReviewMarkers(locale)]) {
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
  const {capture, advanced} = await assertFreeReviewLanding(page, expect, locale)
  await capture.scrollIntoViewIfNeeded()
  const form = capture.locator('[data-compact-lead-form]'), contact = form.locator('input[name="contact"]')
  const consent = form.locator('input[type="checkbox"]'), submit = form.locator(`button[data-compact-channel="${channel}"]`)
  const other = form.locator(`button[data-compact-channel="${channel === 'whatsapp' ? 'telegram' : 'whatsapp'}"]`)
  const popups = () => page.evaluate(() => window.__hypnotherapyFixture.popups.map(p => ({closed:p.closed, opener:p.opener, destinations:p.destinations})))
  await expect(consent).not.toBeChecked()
  await expect(capture.locator('a[data-compact-channel]')).toHaveCount(0)
  await consent.check(); await contact.fill('invalid-contact'); await submit.click()
  await expect(form.locator('[role="alert"]')).toBeVisible()
  assert.equal(receipt.count, 0); assert.deepEqual(await popups(), [])
  await consent.uncheck(); await contact.fill(FREE_REVIEW_CONTACT); await submit.click()
  await expect(form.locator('[role="alert"]')).toBeVisible()
  assert.equal(receipt.count, 0); assert.deepEqual(await popups(), [])
  await consent.check(); await submit.click()
  await expect.poll(() => receipt.count).toBe(1)
  await expect(form.locator('[role="alert"]')).toBeVisible()
  await expect(submit).toBeEnabled()
  for (const control of [other, contact, consent]) await expect(control).toBeDisabled()
  await expect(contact).toHaveValue(FREE_REVIEW_CONTACT); await expect(consent).toBeChecked()
  await expect(capture.locator('[data-lead-saved]')).toHaveCount(0)
  await expect(capture.locator('a[data-compact-channel]')).toHaveCount(0)
  assert.deepEqual(await popups(), [{closed:true, opener:null, destinations:[]}])
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), FREE_REVIEW_RECEIPT_KEY), null)
  await submit.click()
  await expect.poll(() => receipt.pending).toBe(true)
  for (const control of [submit, other, contact, consent]) await expect(control).toBeDisabled()
  await expect(capture.locator('[data-lead-saved]')).toHaveCount(0)
  await expect(capture.locator('a[data-compact-channel]')).toHaveCount(0)
  assert.deepEqual(await popups(), [{closed:true, opener:null, destinations:[]}, {closed:false, opener:null, destinations:[]}])
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), FREE_REVIEW_RECEIPT_KEY), null)
  assert.deepEqual(failures, [])
  await receipt.confirm()
  await expect(capture.locator('[data-lead-saved][role="status"]')).toContainText(FREE_REVIEW_REFERENCE)
  await expect(form).toHaveCount(0)
  await expect(page).toHaveURL(origin + freeReviewPath(locale))
  const hrefs = await assertLinks(capture, expect, locale, 'compact', 'data-compact-channel')
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

export async function verifyFreeReviewDrawingInPage(page, expect, locale, receipt, failures, {denyReceiptStorage=false, output}={}) {
  const origin = freeReviewOrigin(page.url(), locale), text = copy[locale], markers = freeReviewMarkers(locale)
  const {capture, advanced, intake} = await assertFreeReviewLanding(page, expect, locale)
  await advanced.locator(':scope > summary').click()
  await expect(intake).toBeVisible()
  const answersForm = intake.locator(':scope > form'), areas = answersForm.locator('textarea')
  await expect(answersForm).toHaveCount(1)
  await expect(areas).toHaveCount(4)
  await expect(areas.nth(0)).toHaveAttribute('required', '')
  await expect(areas.nth(1)).toHaveAttribute('required', '')
  await areas.nth(0).fill(markers[0]); await areas.nth(1).fill(markers[1])
  const optional = answersForm.locator('details')
  assert.equal(await optional.evaluate(element => element.open), false)
  await optional.locator('summary').click()
  await areas.nth(2).fill(markers[2]); await areas.nth(3).fill(markers[3])
  await answersForm.locator('button[type="submit"]').click()
  const ready = intake.locator('[role="region"]')
  await expect(ready).toBeVisible(); await expect(ready.getByRole('heading')).toHaveText(text.ready)
  await expect(ready).toHaveAttribute('aria-live', 'polite'); await expect(ready).toBeFocused()
  if (output && denyReceiptStorage) await ready.screenshot({path:`${output}/free-review-${locale}-ready-region-390.png`})
  const preview = ready.locator('textarea[readonly]'), expected = await preview.inputValue()
  for (const marker of markers) assert.ok(expected.includes(marker), 'Prepared copy includes each deliberately entered answer')
  const copyButton = ready.getByRole('button', {name:text.copy, exact:true}), status = ready.locator('p[aria-live="polite"]')
  await copyButton.click(); await expect(status).toContainText(text.copied)
  assert.deepEqual(await page.evaluate(() => window.__freeReviewClipboard.values), [expected])
  await page.evaluate(() => { window.__freeReviewClipboard.denied = true })
  await copyButton.click(); await expect(status).toContainText(text.fallback)
  await expect(preview).toHaveValue(expected)
  assert.deepEqual(await page.evaluate(() => window.__freeReviewClipboard.values), [expected])
  await page.evaluate(() => { window.__freeReviewClipboard.denied = false })
  await copyButton.click(); await expect(status).toContainText(text.copied)
  assert.deepEqual(await page.evaluate(() => window.__freeReviewClipboard.values), [expected, expected])
  assert.equal(receipt.count, 0, 'Prepare and copy never submit a contact or answers')
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), FREE_REVIEW_RECEIPT_KEY), null)
  assert.deepEqual(await page.evaluate(() => window.__hypnotherapyFixture.opens), [])
  await assertPrivateState(page, locale)
  const chooser = ready.locator('[data-contact-channel-chooser]'), trigger = chooser.locator('[data-contact-order]')
  await expect(chooser).toHaveCount(1); await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
  await trigger.click(); await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const form = chooser.locator('form'), contact = form.locator('input[type="email"]'), consent = form.locator('input[type="checkbox"]'), submit = form.locator('button[type="submit"]')
  await expect(consent).not.toBeChecked(); await expect(submit).toBeDisabled()
  await consent.check(); await contact.fill('invalid-contact'); await submit.click()
  assert.equal(receipt.count, 0, 'Native email validation prevents an invalid consented request')
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
  await consent.uncheck(); await contact.fill(FREE_REVIEW_CONTACT); await expect(submit).toBeDisabled()
  assert.equal(receipt.count, 0, 'Opening chooser and filling contact does not save without consent')
  await consent.check(); await submit.click()
  await expect.poll(() => receipt.count).toBe(1)
  await expect(form.locator('[role="alert"]')).toBeVisible(); await expect(submit).toBeEnabled()
  await expect(contact).toBeDisabled(); await expect(consent).toBeDisabled()
  await expect(contact).toHaveValue(FREE_REVIEW_CONTACT); await expect(consent).toBeChecked()
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
  await expect(page).toHaveURL(origin + freeReviewPath(locale))
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), FREE_REVIEW_RECEIPT_KEY), null)
  await submit.click(); await expect.poll(() => receipt.pending).toBe(true)
  for (const control of [submit, contact, consent]) await expect(control).toBeDisabled()
  await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), FREE_REVIEW_RECEIPT_KEY), null)
  assert.deepEqual(failures, [])
  await receipt.confirm()
  if (denyReceiptStorage) {
    await expect(chooser.locator('[role="status"]')).toContainText(FREE_REVIEW_REFERENCE)
    await expect(form).toHaveCount(0); await expect(page).toHaveURL(origin + freeReviewPath(locale))
    await assertLinks(chooser, expect, locale, 'drawing', 'data-contact-channel')
    await expect(preview).toHaveValue(expected)
    await expect(capture.locator('[data-compact-lead-form]')).toHaveCount(1)
    await expect(capture.locator('[data-lead-saved]')).toHaveCount(0)
    if (output) await page.screenshot({path:`${output}/free-review-${locale}-prepared-390.png`, fullPage:false})
  } else {
    await expect(page).toHaveURL(origin + `/${locale}/thank-you`)
    await expect(page.locator('[data-service-thank-you]')).toContainText(FREE_REVIEW_REFERENCE)
    await expect(page.locator('a[data-contact-channel]')).toHaveCount(0)
  }
  await assertReceiptStorage(page, denyReceiptStorage)
  await assertPrivateState(page, locale)
  assert.deepEqual(await page.evaluate(() => window.__hypnotherapyFixture.opens), [], 'Questionnaire never opens a messenger automatically')
  assert.equal(await page.evaluate(() => Number(sessionStorage.getItem('hh-synthetic-free-review-popups:v1') || 0)), 0, 'No startup or earlier document popup')
  assert.equal(receipt.count, 2); assert.deepEqual(failures, [])
}

export async function verifyFreeReviewJourney(sourcePage, expect, locale, {kind='compact', channel='whatsapp', denyReceiptStorage=false, output}={}) {
  const origin = freeReviewOrigin(sourcePage.url(), locale)
  assert.ok(['compact', 'drawing'].includes(kind))
  assert.ok(['whatsapp', 'telegram'].includes(channel))
  const context = await sourcePage.context().browser().newContext({serviceWorkers:'block', viewport:sourcePage.viewportSize()})
  const receipt = syntheticFreeReviewReceipt(locale, kind, kind === 'compact' ? channel : undefined)
  const failures = [], blockedReads = [], pageErrors = []
  const sockets = freeReviewSocketBoundary(failures)
  const guardedContext = {route:(...args) => context.route(...args), close:() => sockets.closeContext(context)}
  let primary, completed = false
  try {
    await context.routeWebSocket('**/*', sockets.handler)
    const handler = freeReviewRequestGate(origin, locale, kind, receipt, failures, blockedReads, {bootstrap:true})
    await withFreeReviewIsolation(guardedContext, handler, receipt, async () => {
      await context.addInitScript(freeReviewInitScript(denyReceiptStorage))
      const page = await context.newPage()
      page.on('pageerror', () => pageErrors.push('Page error'))
      // HTTP, API/write, socket and popup boundaries exist before any page script.
      await page.goto(origin + freeReviewPath(locale), {waitUntil:'networkidle'})
      assert.equal(handler.initialDocumentLoaded, true, 'Only the exact guarded initial document may load')
      assert.equal(receipt.count, 0, 'Bootstrap never submits a contact')
      assert.deepEqual(failures, [])
      assert.equal(await page.evaluate(() => window.__hypnotherapyFixture.opens.length), 0, 'No startup popup')
      handler.beginInteraction()
      if (kind === 'compact') {
        await verifyFreeReviewCompactInPage(page, expect, locale, receipt, failures, {channel, denyReceiptStorage})
      } else await verifyFreeReviewDrawingInPage(page, expect, locale, receipt, failures, {denyReceiptStorage, output})
    })
  } catch (error) { primary = error }
  finally {
    // Also covers partial setup before withFreeReviewIsolation owns the context.
    try { await guardedContext.close() } catch (error) { if (!primary) primary = error }
    // Only decide success after the last close AND all admitted socket callbacks.
    if (!primary) {
      try {
        assert.equal(receipt.count, 2); assert.deepEqual(failures, []); assert.deepEqual(pageErrors, [])
        completed = true
      } catch (error) { primary = error }
    }
    console.log('SYNTHETIC_FREE_REVIEW_BOUNDARY', JSON.stringify({locale, kind, channel:kind === 'compact' ? channel : null, denyReceiptStorage, completed:completed && !primary,
      requestCount:receipt.count, failureCount:failures.length, pageErrorCount:pageErrors.length,
      blocked:blockedReads.map(read => ({type:read.type, asset:read.asset || (read.path?.startsWith('/_next/static/') ? 'next-static' : 'other')}))}))
  }
  if (primary) throw primary
}
