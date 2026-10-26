import assert from 'node:assert/strict'

export const HYPNOTHERAPY_CONTACT = 'hypnotherapy-browser-fixture@example.invalid'
export const HYPNOTHERAPY_REFERENCE = 'HH-B7A9C0D12345'
export const HYPNOTHERAPY_RECEIPT_KEY = 'hh-service-enquiry-receipt:v1'
const portrait = '/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp'
export const hypnotherapyService = locale => locale === 'ru' ? 'Курс гипнотерапии' : 'Guided Imagery Hypnotherapy'
const sourcePath = locale => `/${locale}/services/hypnotherapy-course`

export function hypnotherapyOrigin(raw, locale) {
  assert.ok(['en', 'ru'].includes(locale))
  const url = new URL(raw)
  assert.equal(url.protocol, 'http:')
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname))
  assert.ok(url.port && !url.username && !url.password && !url.search && !url.hash)
  assert.equal(url.pathname, sourcePath(locale))
  return url.origin
}

export function assertHypnotherapyBody(raw, locale, channel) {
  assert.ok(['en', 'ru'].includes(locale))
  assert.ok(['whatsapp', 'telegram'].includes(channel))
  const body = JSON.parse(raw)
  assert.deepEqual(Object.keys(body).sort(), ['operationId', 'serviceTitle', 'description', 'sourcePath', 'locale', 'contact', 'contactConsent', 'website'].sort())
  assert.match(body.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.equal(body.serviceTitle, hypnotherapyService(locale))
  assert.equal(body.description, 'Preferred reply channel: ' + (channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'))
  assert.equal(body.sourcePath, sourcePath(locale))
  assert.equal(body.locale, locale)
  assert.deepEqual(body.contact, {displayName:'', email:HYPNOTHERAPY_CONTACT, phone:''})
  assert.equal(body.contactConsent, true)
  assert.equal(body.website, '')
}

// Same bounded Next15 static patterns as the published Alchemy HMR verifier.
// Deliberately no thank-you/document allowance: CompactLeadCapture stays in place.
export function permittedHypnotherapyRead(request, origin) {
  const url = new URL(request.url())
  if (request.method() !== 'GET' || url.origin !== origin || url.username || url.password || url.hash) return false
  const type = request.resourceType()
  if (type === 'fetch' && !url.search && /^\/_next\/static\/webpack\/[a-f0-9]{16}\.webpack\.hot-update\.json$/.test(url.pathname)) return true
  if (url.pathname === portrait) return type === 'image' && !url.search
  if (url.search && !(['script', 'stylesheet'].includes(type) && /^\?v=[1-9][0-9]{12}$/.test(url.search))) return false
  const extension = {script:'js', stylesheet:'css', font:'woff2?'}[type]
  return Boolean(extension && new RegExp('^/_next/static/(?:(?:[a-zA-Z0-9_-]+|%5[Bb]locale%5[Dd]|\\[locale\\])/)*[a-zA-Z0-9_.-]+\\.(?:' + extension + ')$').test(url.pathname)
    && !url.pathname.includes('..'))
}

export function hypnotherapyRequestGate(origin, locale, accept, failures, blockedReads) {
  assert.ok(['en', 'ru'].includes(locale))
  return async route => {
    const request = route.request()
    try {
      if (request.url() === origin + '/api/service-enquiries' && request.method() === 'POST') return await accept(route)
      if (permittedHypnotherapyRead(request, origin)) {
        // No continue/fallback or redirect-following path can reach a live service.
        const response = await route.fetch({maxRedirects:0})
        try {
          assert.equal(response.url(), request.url(), 'No redirected or rewritten local read')
          assert.ok(response.status() >= 200 && response.status() < 300, 'Allowed local read must succeed without redirect')
          await route.fulfill({response})
        } finally { await response.dispose() }
        return
      }
      const url = new URL(request.url())
      if (request.method() !== 'GET' || /^\/api(?:\/|$)/i.test(decodeURIComponent(url.pathname)) || request.resourceType() === 'document') failures.push('Unexpected API, write or navigation blocked')
      else blockedReads.push({type:request.resourceType(), asset:url.pathname.startsWith('/_next/static/') ? 'next-static' : 'other'})
      await route.abort()
    } catch {
      // Never serialize request contents, auth headers or arbitrary error text.
      failures.push('Request boundary assertion failed')
      await route.abort()
    }
  }
}

export function syntheticHypnotherapyReceipt(locale, channel) {
  let firstBody, count = 0, pending = null, closed = false
  return {
    get count() { return count },
    get pending() { return Boolean(pending) },
    async accept(route) {
      assert.equal(closed, false, 'No request accepted after fixture closes')
      const request = route.request()
      assert.equal(request.headers()['content-type'], 'application/json')
      const raw = request.postData()
      assertHypnotherapyBody(raw, locale, channel)
      if (firstBody !== undefined) assert.equal(raw, firstBody, 'Retry body and UUID must be byte-identical')
      else firstBody = raw
      assert.ok(count < 2, 'At most initial failure and explicit retry')
      count++
      if (count === 1) await route.fulfill({status:503, contentType:'application/json', body:'{"saved":false}'})
      else pending = route
    },
    async confirm() {
      assert.equal(closed, false, 'Stale fixture outcome is rejected')
      assert.ok(pending, 'A real intercepted retry is required')
      const route = pending
      await route.fulfill({status:200, contentType:'application/json', body:JSON.stringify({saved:true, referenceCode:HYPNOTHERAPY_REFERENCE})})
      pending = null
    },
    async close() {
      closed = true
      const route = pending; pending = null
      if (route) await route.abort()
    },
  }
}

// The reserved popup is an inert object, never a browser window. Both an early
// navigation and attempts to open any other destination remain observable only.
export function installHypnotherapyPopupSpy({receiptKey, denyReceiptStorage}) {
  const fixture = {opens:[], popups:[], unexpected:[]}
  window.__hypnotherapyFixture = fixture
  window.open = (url, target, features) => {
    fixture.opens.push({url, target, features})
    if (url !== 'about:blank' || target !== '_blank' || features !== undefined) {
      fixture.unexpected.push('Unexpected popup arguments'); return null
    }
    const popup = {closed:false, opener:undefined, destinations:[], close() { this.closed = true }, location:{replace(destination) { popup.destinations.push(destination) }}}
    fixture.popups.push(popup)
    return popup
  }
  if (denyReceiptStorage) {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) {
      if (this === sessionStorage && key === receiptKey) throw new DOMException('Synthetic receipt-only storage denial', 'SecurityError')
      return setItem.call(this, key, value)
    }
  }
}

export async function withHypnotherapyIsolation(context, handler, receipt, run) {
  let primary, result
  const errors = [], active = new Set()
  const tracked = route => {
    const pending = Promise.resolve().then(() => handler(route))
    active.add(pending)
    pending.then(() => active.delete(pending), error => { errors.push(error); active.delete(pending) })
    return pending
  }
  try {
    await context.route('**/*', tracked)
    result = await run()
  } catch (error) { primary = error }
  finally {
    for (const cleanup of [() => receipt.close(), () => context.close(), async () => {
      // Keep guard and popup spy installed through close, then drain callbacks
      // which began during shutdown. This context is disposable; no restoration.
      while (active.size) await Promise.allSettled([...active])
    }]) {
      try { await cleanup() } catch (error) { errors.push(error) }
    }
  }
  if (primary) throw primary
  if (errors.length) throw new AggregateError(errors, 'Hypnotherapy fixture cleanup failed')
  return result
}

export function assertHypnotherapyLink(href, locale, channel) {
  const url = new URL(href)
  const expected = channel === 'whatsapp' ? ['wa.me', '/14376066502'] : ['t.me', '/AndyTherapist']
  assert.equal(url.protocol, 'https:'); assert.equal(url.hostname, expected[0]); assert.equal(url.pathname, expected[1])
  assert.ok(!url.username && !url.password && !url.port && !url.hash)
  assert.deepEqual([...url.searchParams.keys()], ['text'])
  const message = url.searchParams.get('text') || ''
  assert.ok(message.includes(hypnotherapyService(locale)))
  assert.ok(message.includes(HYPNOTHERAPY_REFERENCE))
  assert.ok(message.includes('https://holistichouse.vercel.app' + sourcePath(locale)))
  assert.ok(!decodeURIComponent(href).includes(HYPNOTHERAPY_CONTACT), 'Contact never enters messenger draft')
  assert.doesNotMatch(message, /operationId|contactConsent|example\.invalid|\/api\/|\/app\/|\/auth\/|\/checkout\//)
  return message
}

export async function verifyHypnotherapyInPage(page, expect, locale, channel, receipt, failures, {denyReceiptStorage=false}={}) {
  const origin = hypnotherapyOrigin(page.url(), locale)
  const capture = page.locator('[data-sitewide-capture="core-service"][data-core-service-capture="hypnotherapy"]')
  await expect(capture).toHaveCount(1)
  await capture.scrollIntoViewIfNeeded()
  await expect(capture).toBeVisible()
  const form = capture.locator('[data-compact-lead-form]')
  await expect(form).toHaveCount(1)
  const contact = form.locator('input[name="contact"]')
  const consent = form.locator('input[type="checkbox"]')
  const submit = form.locator(`button[data-compact-channel="${channel}"]`)
  const other = form.locator(`button[data-compact-channel="${channel === 'whatsapp' ? 'telegram' : 'whatsapp'}"]`)
  const links = capture.locator('a[data-compact-channel]')
  await expect(contact).toBeEnabled()
  await expect(consent).not.toBeChecked()
  await expect(links).toHaveCount(0)
  await contact.fill(HYPNOTHERAPY_CONTACT)
  // Valid contact without consent must not reserve a popup or submit a request.
  await submit.click()
  await expect(form.locator('[role="alert"]')).toBeVisible()
  assert.equal(receipt.count, 0)
  assert.deepEqual(await page.evaluate(() => window.__hypnotherapyFixture.opens), [])
  await consent.check()
  await submit.click()
  await expect.poll(() => receipt.count).toBe(1)
  await expect(form.locator('[role="alert"]')).toBeVisible()
  await expect(submit).toBeEnabled()
  await expect(other).toBeDisabled()
  await expect(contact).toBeDisabled()
  await expect(consent).toBeDisabled()
  await expect(contact).toHaveValue(HYPNOTHERAPY_CONTACT)
  await expect(consent).toBeChecked()
  await expect(links).toHaveCount(0)
  assert.deepEqual(await page.evaluate(() => window.__hypnotherapyFixture.popups.map(p => ({closed:p.closed, opener:p.opener, destinations:p.destinations}))), [{closed:true, opener:null, destinations:[]}])
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), HYPNOTHERAPY_RECEIPT_KEY), null)
  await expect(page).toHaveURL(origin + sourcePath(locale))
  // Only the original channel is retryable. Never switch channel/UUID/payload.
  await submit.click()
  await expect.poll(() => receipt.pending).toBe(true)
  for (const input of [submit, other, contact, consent]) await expect(input).toBeDisabled()
  await expect(links).toHaveCount(0)
  assert.deepEqual(await page.evaluate(() => window.__hypnotherapyFixture.popups.map(p => p.destinations)), [[], []])
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), HYPNOTHERAPY_RECEIPT_KEY), null)
  assert.deepEqual(failures, [])
  await receipt.confirm()
  await expect(capture.locator('[data-lead-saved][role="status"]')).toContainText(HYPNOTHERAPY_REFERENCE)
  await expect(form).toHaveCount(0)
  await expect(page).toHaveURL(origin + sourcePath(locale))
  await expect(links).toHaveCount(2)
  const messages = [], hrefs = {}
  for (const name of ['whatsapp', 'telegram']) {
    const link = capture.locator(`a[data-compact-channel="${name}"]`)
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('target', '_blank')
    assert.deepEqual((await link.getAttribute('rel')).split(/\s+/).sort(), ['noopener', 'noreferrer'])
    hrefs[name] = await link.getAttribute('href')
    messages.push(assertHypnotherapyLink(hrefs[name], locale, name))
  }
  assert.equal(messages[0], messages[1], 'Both channels retain the same private-data-free draft')
  await expect.poll(async () => await page.evaluate(() => window.__hypnotherapyFixture.popups[1].destinations)).toEqual([hrefs[channel]])
  const popups = await page.evaluate(() => ({opens:window.__hypnotherapyFixture.opens, unexpected:window.__hypnotherapyFixture.unexpected, popups:window.__hypnotherapyFixture.popups.map(p => ({closed:p.closed, opener:p.opener, destinations:p.destinations}))}))
  assert.equal(popups.opens.length, 2)
  assert.ok(popups.opens.every(p => p.url === 'about:blank' && p.target === '_blank' && p.features === undefined))
  assert.deepEqual(popups.unexpected, [])
  assert.deepEqual(popups.popups, [{closed:true, opener:null, destinations:[]}, {closed:false, opener:null, destinations:[hrefs[channel]]}])
  const stored = await page.evaluate(key => sessionStorage.getItem(key), HYPNOTHERAPY_RECEIPT_KEY)
  if (denyReceiptStorage) assert.equal(stored, null)
  else {
    const value = JSON.parse(stored)
    assert.deepEqual(Object.keys(value).sort(), ['createdAt', 'referenceCode'])
    assert.equal(value.referenceCode, HYPNOTHERAPY_REFERENCE)
    assert.ok(Number.isSafeInteger(value.createdAt))
  }
  assert.equal(receipt.count, 2)
  assert.deepEqual(failures, [])
}

export async function verifyHypnotherapyEnquiryJourney(sourcePage, expect, locale, {channel='whatsapp', denyReceiptStorage=false}={}) {
  const origin = hypnotherapyOrigin(sourcePage.url(), locale)
  assert.ok(['whatsapp', 'telegram'].includes(channel))
  const context = await sourcePage.context().browser().newContext({serviceWorkers:'block', viewport:sourcePage.viewportSize()})
  const receipt = syntheticHypnotherapyReceipt(locale, channel), failures = [], blockedReads = [], pageErrors = []
  let completed = false, guarded = false, primary
  try {
    // Block sockets before loading; no messenger, payment or auth transport.
    await context.routeWebSocket('**/*', socket => socket.close())
    const page = await context.newPage()
    page.on('pageerror', () => pageErrors.push('Page error'))
    // Load the genuine isolated public page first. Shared public bootstrap/media
    // reads are not form requests; no form interaction occurs before the guard.
    await page.goto(origin + sourcePath(locale), {waitUntil:'networkidle'})
    const handler = hypnotherapyRequestGate(origin, locale, route => receipt.accept(route), failures, blockedReads)
    guarded = true
    await withHypnotherapyIsolation(context, handler, receipt, async () => {
      await page.evaluate(installHypnotherapyPopupSpy, {receiptKey:HYPNOTHERAPY_RECEIPT_KEY, denyReceiptStorage})
      await verifyHypnotherapyInPage(page, expect, locale, channel, receipt, failures, {denyReceiptStorage})
    })
    // Final assertions happen after context close AND all active route callbacks.
    assert.equal(receipt.count, 2)
    assert.deepEqual(failures, [])
    assert.deepEqual(pageErrors, [])
    completed = true
  } catch (error) { primary = error }
  finally {
    // Setup failures before the interaction guard also close the clean context.
    if (!guarded) {
      try { await context.close() } catch (error) { if (!primary) primary = error }
    }
    console.log('SYNTHETIC_HYPNOTHERAPY_BOUNDARY', JSON.stringify({locale, channel, denyReceiptStorage, completed, requestCount:receipt.count, failureCount:failures.length, pageErrorCount:pageErrors.length, blocked:blockedReads}))
  }
  if (primary) throw primary
}
