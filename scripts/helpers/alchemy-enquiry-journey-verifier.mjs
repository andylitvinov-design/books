import assert from 'node:assert/strict'

export const ALCHEMY_CONTACT = 'alchemy-browser-fixture@example.invalid'
export const ALCHEMY_REFERENCE = 'HH-A1C4E0F12345'
export const ALCHEMY_RECEIPT_KEY = 'hh-service-enquiry-receipt:v1'
const portrait = '/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp'
export const alchemyService = locale => locale === 'ru'
  ? 'Алхимия души / Психогомеопатия · Экспресс · 30 минут · €50'
  : 'Alchemy of the Soul / Psycho-homeopathy · Express review · 30 min · €50'

export function alchemyOrigin(raw, locale) {
  assert.ok(['en','ru'].includes(locale))
  const url = new URL(raw)
  assert.equal(url.protocol, 'http:')
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname))
  assert.ok(url.port && !url.username && !url.password && !url.search && !url.hash)
  assert.equal(url.pathname, `/${locale}/services/alchemy-of-soul`)
  return url.origin
}

export function assertAlchemyBody(raw, locale) {
  const body = JSON.parse(raw)
  assert.deepEqual(Object.keys(body).sort(), ['operationId','serviceTitle','description','sourcePath','locale','contact','contactConsent','website'].sort())
  assert.match(body.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.equal(body.serviceTitle, alchemyService(locale))
  assert.equal(body.description, '')
  assert.equal(body.sourcePath, `/${locale}/services/alchemy-of-soul`)
  assert.equal(body.locale, locale)
  assert.deepEqual(body.contact, {displayName:'',email:ALCHEMY_CONTACT,phone:''})
  assert.equal(body.contactConsent, true)
  assert.equal(body.website, '')
}

// Only Next's typed static namespace and the exact real receipt destination.
// No APIs, arbitrary same-origin pages, optimizers or external media are fetched.
export function permittedAlchemyRead(request, origin, locale) {
  const url = new URL(request.url())
  if (request.method() !== 'GET' || url.origin !== origin || url.username || url.password || url.hash) return false
  const type = request.resourceType()
  if (url.pathname === `/${locale}/thank-you`) {
    if (!['document','fetch'].includes(type)) return false
    if (url.search === '') return true
    return /^\?_rsc=[a-zA-Z0-9_-]{1,128}$/.test(url.search) && type === 'fetch'
  }
  if (url.pathname === portrait) return type === 'image' && !url.search
  // Next15 development getLayerAssets/renderCssResource append the request
  // timestamp via getAssetQueryString(ctx,true). This is not an arbitrary query
  // exemption: one decimal timestamp, only JS/CSS, with the same path/type gate.
  if (url.search && !(['script','stylesheet'].includes(type) && /^\?v=[1-9][0-9]{12}$/.test(url.search))) return false
  const extension = {script:'js',stylesheet:'css',font:'woff2?'}[type]
  return Boolean(extension && new RegExp('^/_next/static/(?:(?:[a-zA-Z0-9_-]+|%5[Bb]locale%5[Dd]|\\[locale\\])/)*[a-zA-Z0-9_.-]+\\.(?:'+extension+')$').test(url.pathname)
    && !url.pathname.includes('..'))
}

export function alchemyBoundarySummary(blockedReads, failures, count, completed) {
  return {completed,requestCount:count,failureCount:failures.length,blocked:blockedReads.map(read=>({
    // No query values, contact details, response body, headers or arbitrary URL.
    type:read.type,queryKind:read.queryKind || 'none',
    asset: /^\/_next\/static\/[a-zA-Z0-9_./%[\]()-]+$/.test(read.path) ? read.path : 'other',
  }))}
}

export function alchemyRequestGate(origin, locale, accept, failures, blockedReads) {
  return async route => {
    const request = route.request()
    try {
      if (request.url() === origin + '/api/service-enquiries' && request.method() === 'POST') return await accept(route)
      if (permittedAlchemyRead(request, origin, locale)) {
        // continue() follows redirects outside a route guard. Fetch zero redirects,
        // verify the response and deliver the real response to the genuine router.
        const response = await route.fetch({maxRedirects:0})
        try {
          assert.equal(response.url(), request.url(), 'No rewritten or redirected read')
          assert.ok(response.status() >= 200 && response.status() < 300, 'Allowed local read must succeed without redirect')
          await route.fulfill({response})
        } finally { await response.dispose() }
        return
      }
      const url = new URL(request.url())
      // Speculative page/media reads are safely blocked, not evidence of a form
      // write failure. An API call or any unexpected mutation always fails CI.
      if (request.method() !== 'GET' || url.pathname.startsWith('/api/')) failures.push('Unexpected write/API blocked')
      else blockedReads.push({path:url.pathname,type:request.resourceType(),queryKind:!url.search?'none':/^\?v=[1-9][0-9]{12}$/.test(url.search)?'next-dev-version':'other'})
      await route.abort()
    } catch (error) {
      failures.push(error.message)
      await route.abort()
    }
  }
}

export function syntheticAlchemyReceipt(locale) {
  let firstBody, count = 0, pending = null, closed = false
  return {
    get count(){ return count },
    get pending(){ return Boolean(pending) },
    async accept(route) {
      assert.equal(closed, false, 'No request accepted after fixture closes')
      const raw = route.request().postData()
      assertAlchemyBody(raw, locale)
      if (firstBody !== undefined) assert.equal(raw, firstBody, 'Retry body and UUID must be byte-identical')
      else firstBody = raw
      assert.ok(count < 2, 'At most initial failure and explicit retry')
      count++
      if (count === 1) await route.fulfill({status:503,contentType:'application/json',body:'{"saved":false}'})
      else pending = route
    },
    async confirm() {
      assert.equal(closed, false, 'Stale fixture outcome is rejected')
      assert.ok(pending, 'A real intercepted retry is required')
      const route = pending
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({saved:true,referenceCode:ALCHEMY_REFERENCE})})
      pending = null
    },
    async close() {
      closed = true
      const route = pending; pending = null
      if (route) await route.abort()
    },
  }
}

export async function withAlchemyIsolation(page, handler, receipt, denyStorage, run) {
  let primary, result
  const errors = [], active = new Set()
  const tracked = route => {
    const pending = Promise.resolve().then(() => handler(route))
    active.add(pending)
    pending.then(() => active.delete(pending), error => { errors.push(error); active.delete(pending) })
    return pending
  }
  try {
    await page.context().route('**/*', tracked)
    await page.evaluate(({key,deny}) => {
      sessionStorage.removeItem(key)
      window.__alchemyFixture = {open:window.open,setItem:Storage.prototype.setItem,opens:[]}
      window.open = (...args) => { window.__alchemyFixture.opens.push(args[0]); return null }
      if (deny) Storage.prototype.setItem = function(k,v) {
        if (this === sessionStorage && k === key) throw new DOMException('Synthetic receipt-only storage denial','SecurityError')
        return window.__alchemyFixture.setItem.call(this,k,v)
      }
    }, {key:ALCHEMY_RECEIPT_KEY,deny:denyStorage})
    result = await run()
  } catch (error) { primary = error }
  finally {
    for (const cleanup of [() => receipt.close(), () => page.evaluate(key => {
      const fixture = window.__alchemyFixture
      if (fixture) { window.open = fixture.open; Storage.prototype.setItem = fixture.setItem; delete window.__alchemyFixture }
      sessionStorage.removeItem(key)
    }, ALCHEMY_RECEIPT_KEY), () => page.context().close(), async () => {
      // The guard stays installed until the disposable context is closed.
      // Drain even callbacks which began while close was settling.
      while (active.size) await Promise.allSettled([...active])
    }]) {
      try { await cleanup() } catch (error) { errors.push(error) }
    }
  }
  if (primary) throw primary
  if (errors.length) throw new AggregateError(errors, 'Alchemy fixture cleanup failed')
  return result
}

export async function verifyAlchemyEnquiryJourney(sourcePage, expect, locale, options={}) {
  const origin = alchemyOrigin(sourcePage.url(),locale)
  const context = await sourcePage.context().browser().newContext({serviceWorkers:'block',viewport:sourcePage.viewportSize()})
  let page, primary, result
  const pageErrors = []
  try {
    page = await context.newPage()
    page.on('pageerror',error=>pageErrors.push(error.message))
    await page.goto(origin+`/${locale}/services/alchemy-of-soul`,{waitUntil:'networkidle'})
    result = await verifyAlchemyInPage(page,expect,locale,options)
    assert.deepEqual(pageErrors,[])
  } catch (error) { primary = error }
  // Also closes partial setup failures before the interaction guard was ready.
  try { await context.close() } catch (error) { if (!primary) primary = error }
  if (primary) throw primary
  return result
}

async function verifyAlchemyInPage(page, expect, locale, {denyReceiptStorage=false}={}) {
  const origin = alchemyOrigin(page.url(), locale)
  const pricing = page.locator('[data-alchemy-booking-formats]')
  const chooser = pricing.locator('[data-contact-channel-chooser]')
  const receipt = syntheticAlchemyReceipt(locale), failures = [], blockedReads = []
  const handler = alchemyRequestGate(origin,locale,route=>receipt.accept(route),failures,blockedReads)
  let completed = false
  try {
  const result = await withAlchemyIsolation(page,handler,receipt,denyReceiptStorage,async () => {
  await pricing.locator('[data-alchemy-format="30"]').click()
  await expect(pricing.locator('[data-alchemy-format="30"]')).toHaveAttribute('aria-pressed','true')
    await chooser.locator('[data-contact-order]').click()
    const contact = chooser.locator('input[type="email"]')
    const consent = chooser.locator('input[type="checkbox"]')
    const submit = chooser.locator('button[type="submit"]')
    await expect(consent).not.toBeChecked()
    await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
    await expect(submit).toBeDisabled()
    await contact.fill(ALCHEMY_CONTACT)
    await expect(submit).toBeDisabled()
    assert.equal(receipt.count,0)
    await consent.check()
    await submit.click()
    await expect.poll(()=>receipt.count).toBe(1)
    await expect(chooser.locator('[role="alert"]')).toBeVisible()
    await expect(submit).toBeEnabled()
    await expect(contact).toBeDisabled()
    await expect(consent).toBeDisabled()
    for (const format of ['30','60','month']) await expect(pricing.locator(`[data-alchemy-format="${format}"]`)).toBeDisabled()
    await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
    assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),ALCHEMY_RECEIPT_KEY),null)
    await expect(page).toHaveURL(origin+`/${locale}/services/alchemy-of-soul`)
    await submit.click()
    await expect.poll(()=>receipt.pending).toBe(true)
    await expect(submit).toBeDisabled()
    await expect(chooser.locator('a[data-contact-channel]')).toHaveCount(0)
    assert.deepEqual(failures,[])
    await receipt.confirm()
    if (denyReceiptStorage) {
      await expect(chooser.locator('[role="status"]')).toContainText(ALCHEMY_REFERENCE)
      await expect(page).toHaveURL(origin+`/${locale}/services/alchemy-of-soul`)
      await expect(chooser.locator('form')).toHaveCount(0)
      for (const [channel,host] of [['whatsapp','wa.me'],['telegram','t.me']]) {
        const link = chooser.locator(`a[data-contact-channel="${channel}"]`)
        await expect(link).toBeVisible()
        const href = await link.getAttribute('href'), url = new URL(href)
        assert.equal(url.protocol,'https:'); assert.equal(url.hostname,host)
        const message = url.searchParams.get('text') || ''
        assert.ok(message.includes(ALCHEMY_REFERENCE) && message.includes('€50') && message.includes(locale==='ru'?'30 минут':'30 min'))
        assert.ok(!decodeURIComponent(href).includes(ALCHEMY_CONTACT))
      }
      assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),ALCHEMY_RECEIPT_KEY),null)
    } else {
      await expect(page).toHaveURL(origin+`/${locale}/thank-you`)
      await expect(page.locator('[data-service-thank-you]')).toContainText(ALCHEMY_REFERENCE)
      const stored = await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),ALCHEMY_RECEIPT_KEY)
      assert.deepEqual(Object.keys(stored).sort(),['createdAt','referenceCode'])
      assert.equal(stored.referenceCode,ALCHEMY_REFERENCE)
      assert.ok(Number.isSafeInteger(stored.createdAt))
      await expect(page.locator('a[data-contact-channel]')).toHaveCount(0)
    }
    assert.deepEqual(await page.evaluate(()=>window.__alchemyFixture.opens),[],'No automatic messenger handoff')
    assert.equal(receipt.count,2)
    assert.deepEqual(failures,[])
    // Blocked ancillary reads are diagnostics, not visual/media acceptance.
    return {blockedReads}
  })
  // These are terminal assertions after context close and handler settlement,
  // not a snapshot while a late request could still escape or change evidence.
  assert.equal(receipt.count,2)
  assert.deepEqual(failures,[])
  completed = true
  return result
  } finally {
    console.log('SYNTHETIC_ALCHEMY_BOUNDARY',JSON.stringify({locale,denyReceiptStorage,
      ...alchemyBoundarySummary(blockedReads,failures,receipt.count,completed)}))
  }
}
