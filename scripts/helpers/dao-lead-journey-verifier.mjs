import assert from 'node:assert/strict'

export const DAO_SERVICE = 'Free symbolic Wu Xing Resource Profile'
export const DAO_CONTACT = 'dao-browser-fixture@example.invalid'
export const DAO_REFERENCE = 'HH-CA5016DE79E4'

export function assertDaoLoopback(raw, locale) {
  assert.ok(['en', 'ru'].includes(locale), 'Only verified DAO locales')
  const url = new URL(raw)
  assert.equal(url.protocol, 'http:')
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'DAO fixture is loopback only')
  assert.ok(url.port && !url.username && !url.password && !url.search, 'Explicit isolated port, no credentials or query')
  assert.equal(url.pathname, '/' + locale + '/services/dao-health-profile')
  return url.origin
}

export function assertDaoRequest(body, locale) {
  assert.deepEqual(Object.keys(body).sort(), ['operationId','serviceTitle','description','sourcePath','locale','contact','contactConsent','website'].sort())
  assert.match(body.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.equal(body.serviceTitle, DAO_SERVICE)
  assert.equal(body.description, 'Preferred reply channel: WhatsApp')
  assert.equal(body.sourcePath, '/' + locale + '/services/dao-health-profile')
  assert.equal(body.locale, locale)
  assert.deepEqual(body.contact, {displayName:'', email:DAO_CONTACT, phone:''})
  assert.equal(body.contactConsent, true)
  assert.equal(body.website, '')
}

/** Broad interception: no unexpected request can reach a server during input. */
export function daoRequestGate(origin, accept, errors) {
  const endpoint = origin + '/api/service-enquiries'
  return async route => {
    const request = route.request()
    if (request.url() === endpoint && request.method() === 'POST') return accept(route)
    // No continue/fallback: even a changed endpoint or GET query fails closed.
    errors.push('Unexpected request blocked: ' + request.method())
    await route.abort()
  }
}

export async function withDaoIsolation(page, handler, run, abortPending) {
  let primary, result
  const cleanupErrors = []
  try {
    await page.route('**/*', handler)
    await page.evaluate(() => {
      window.__daoOriginalOpen = window.open
      window.__daoHandoffs = []
      window.open = url => {
        const entry = {url, closed:false, destinations:[]}
        window.__daoHandoffs.push(entry)
        return {opener:null, get closed(){return entry.closed}, close(){entry.closed=true},
          location:{replace(destination){entry.destinations.push(destination)}}}
      }
    })
    result = await run()
  } catch (error) { primary = error }
  finally {
    // Attempt every cleanup, including after partial/uncertain setup failure.
    for (const cleanup of [abortPending,
      () => page.evaluate(() => {
        if (typeof window.__daoOriginalOpen === 'function') window.open = window.__daoOriginalOpen
        delete window.__daoOriginalOpen; delete window.__daoHandoffs
      }),
      () => page.unroute('**/*', handler)]) {
      try { await cleanup() } catch (error) { cleanupErrors.push(error) }
    }
  }
  if (primary) throw primary
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'DAO fixture cleanup failed')
  return result
}

/** Synthetic loopback only: never opens a real messenger or writes a CRM row. */
export async function verifyDaoLeadJourney(page, expect, locale) {
  const origin = assertDaoLoopback(page.url(), locale)
  const endpoint = origin + '/api/service-enquiries'
  const capture = page.locator('#request-free-wu-xing[data-service-lead-capture]')
  await expect(capture).toHaveCount(1)
  await expect(capture).toBeVisible()
  const contact = capture.locator('input[name="contact"]')
  const consent = capture.locator('input[type="checkbox"]')
  const submit = capture.locator('button[data-compact-channel="whatsapp"]')
  await expect(consent).not.toBeChecked()
  let requests = 0, fail = true, pending = null
  const requestErrors = []
  let firstOperationId
  const accept = async route => {
    requests++
    try {
      assert.equal(route.request().url(), endpoint)
      assert.equal(route.request().method(), 'POST')
      const body = route.request().postDataJSON()
      assertDaoRequest(body, locale)
      if (firstOperationId) assert.equal(body.operationId, firstOperationId, '503 retry preserves idempotency key')
      else firstOperationId = body.operationId
      if (fail) await route.fulfill({status:503, contentType:'application/json', body:JSON.stringify({saved:false})})
      else pending = route
    } catch (error) { requestErrors.push(error.message); await route.abort() }
  }
  const handler = daoRequestGate(origin, accept, requestErrors)
  const handoffs = () => page.evaluate(() => window.__daoHandoffs)
  return withDaoIsolation(page, handler, async () => {
    // Exercise both guards, rather than assuming the buttons are disabled.
    await consent.check()
    await contact.fill('invalid-contact')
    await submit.click()
    await expect(capture.locator('[role="alert"]')).toBeVisible()
    assert.equal(requests, 0)
    assert.deepEqual(await handoffs(), [])
    await consent.uncheck()
    await contact.fill(DAO_CONTACT)
    await submit.click()
    await expect(capture.locator('[role="alert"]')).toBeVisible()
    assert.equal(requests, 0)
    assert.deepEqual(await handoffs(), [])

    await consent.check()
    await submit.click()
    await expect.poll(() => requests).toBe(1)
    await expect(submit).toBeEnabled()
    await expect(capture.locator('[role="alert"]')).toBeVisible()
    await expect(capture.locator('[data-lead-saved]')).toHaveCount(0)
    assert.deepEqual(requestErrors, [])
    assert.deepEqual(await handoffs(), [{url:'about:blank', closed:true, destinations:[]}])

    fail = false
    await submit.click()
    await expect.poll(() => requests).toBe(2)
    assert.deepEqual(requestErrors, [])
    assert.ok(pending, 'Success response remains held until pre-commit assertions')
    await expect(submit).toBeDisabled()
    await expect(capture.locator('[data-lead-saved]')).toHaveCount(0)
    assert.deepEqual((await handoffs())[1], {url:'about:blank', closed:false, destinations:[]})
    await pending.fulfill({status:200, contentType:'application/json', body:JSON.stringify({saved:true, referenceCode:DAO_REFERENCE})})
    pending = null
    await expect(capture.locator('[data-lead-saved]')).toContainText(DAO_REFERENCE)
    await expect(capture.locator('form')).toHaveCount(0)
    await expect.poll(async () => (await handoffs())[1].destinations.length).toBe(1)
    const destination = (await handoffs())[1].destinations[0]
    const whatsapp = capture.locator('a[data-compact-channel="whatsapp"]')
    const telegram = capture.locator('a[data-compact-channel="telegram"]')
    for (const [link, host] of [[whatsapp, 'wa.me'], [telegram, 't.me']]) {
      await expect(link).toBeVisible()
      const href = await link.getAttribute('href')
      const url = new URL(href)
      assert.equal(url.protocol, 'https:')
      assert.equal(url.hostname, host)
      const message = url.searchParams.get('text') || ''
      assert.ok(message.includes(DAO_REFERENCE) && message.includes(DAO_SERVICE))
      assert.ok(!decodeURIComponent(href).includes(DAO_CONTACT), 'Contact never enters handoff URL')
    }
    assert.equal(destination, await whatsapp.getAttribute('href'))
    assert.equal(requests, 2, 'Retry only, no duplicate save after receipt')
    assert.deepEqual(requestErrors, [])
  }, async () => { if (pending) await pending.abort() })
}
