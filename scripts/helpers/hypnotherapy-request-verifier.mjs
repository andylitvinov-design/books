import assert from 'node:assert/strict'

export const HYPNOTHERAPY_CONTACT = 'hypnotherapy-qa@example.test'
export const HYPNOTHERAPY_REFERENCE = 'HH-B7A9C0D12345'
export const HYPNOTHERAPY_RECEIPT_KEY = 'hh-service-enquiry-receipt:v1'
export const hypnotherapyService = locale => ({en:'Guided Imagery Hypnotherapy',ru:'Курс гипнотерапии'})[locale]
const sourcePath = locale => '/' + locale + '/services/hypnotherapy-course'
const copy = {
  en: {invalid:'Enter a valid email or an international phone number starting with +.', consent:'Please agree to a personal reply before continuing.'},
  ru: {invalid:'Укажите email или номер телефона с международным кодом +.', consent:'Подтвердите согласие на личный ответ по заявке.'},
}

export function assertHypnotherapyBoundary(origin, locale, env = process.env) {
  assert.ok(Object.hasOwn(copy, locale), 'Only the reviewed EN/RU hypnotherapy routes')
  assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/)
  assert.equal(new URL(origin).origin, origin)
  const db = new URL(env.HH_TEST_ADMIN_DATABASE_URL || 'http://invalid')
  assert.ok(env.CI === 'true' && env.HH_APP_TEST_RUNTIME === 'isolated' && !env.VERCEL &&
    ['127.0.0.1','localhost'].includes(db.hostname) && db.pathname === '/hh_app_test',
  'Hypnotherapy verifier requires the existing isolated hh_app_test runtime')
}

export function assertHypnotherapyRequest(body, locale, channel) {
  assert.ok(Object.hasOwn(copy, locale))
  assert.ok(['whatsapp','telegram'].includes(channel))
  assert.deepEqual(Object.keys(body).sort(), ['operationId','serviceTitle','description','sourcePath','locale','contact','contactConsent','website'].sort())
  assert.match(body.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  assert.equal(body.serviceTitle, hypnotherapyService(locale))
  assert.equal(body.description, 'Preferred reply channel: ' + (channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'))
  assert.equal(body.sourcePath, sourcePath(locale))
  assert.equal(body.locale, locale)
  assert.deepEqual(body.contact, {displayName:'',email:HYPNOTHERAPY_CONTACT,phone:''})
  assert.equal(body.contactConsent, true)
  assert.equal(body.website, '')
}

// Add a temporary deny boundary to the caller's existing context, not a fresh
// visitor. Reads delegate to prior fences; this helper grants no new read route.
// The sole consented POST is held and fulfilled in memory, never forwarded.
export function createHypnotherapyRequestGuard(origin, locale, channel, env = process.env) {
  assertHypnotherapyBoundary(origin, locale, env)
  assert.ok(['whatsapp','telegram'].includes(channel))
  let armed = false, count = 0, pending = null, closed = false
  const blocked = [], active = new Set()
  async function handle(route) {
    const request = route.request(), url = new URL(request.url()), method = request.method()
    try {
      if (url.href === origin + '/api/service-enquiries' && method === 'POST') {
        assert.ok(armed && !closed && count === 0, 'Only one explicitly consented request')
        assert.equal(request.headers()['content-type'], 'application/json')
        assertHypnotherapyRequest(request.postDataJSON(), locale, channel)
        count++; pending = route
        return
      }
      if (url.origin === origin && !url.username && !url.password && ['GET','HEAD'].includes(method)) {
        return await route.fallback()
      }
      blocked.push('Unexpected write or external request')
      await route.abort('blockedbyclient')
    } catch {
      blocked.push('Request boundary assertion failed')
      await route.abort('blockedbyclient')
    }
  }
  const route = route => {
    const task = handle(route); active.add(task)
    task.then(() => active.delete(task), () => active.delete(task))
    return task
  }
  return {
    route, blocked, get count() { return count }, get pending() { return Boolean(pending) },
    arm() { assert.ok(!closed && !armed && count === 0); armed = true },
    async confirm() {
      assert.ok(!closed && pending, 'A real intercepted request must precede acknowledgement')
      const request = pending
      await request.fulfill({status:201,contentType:'application/json',body:JSON.stringify({saved:true,referenceCode:HYPNOTHERAPY_REFERENCE})})
      pending = null
    },
    async close() {
      closed = true
      const request = pending; pending = null
      if (request) await request.abort('blockedbyclient')
      while (active.size) await Promise.all([...active])
    },
  }
}

// Native clicks execute the real component. Only the provider window is inert.
// Recording its reservation and eventual URL preserves handoff ordering checks.
export function installHypnotherapyPopupProbe() {
  const probe = {original:window.open, opens:[], popups:[]}
  window.__hhHypnotherapyProbe = probe
  window.open = (url, target, features) => {
    probe.opens.push({url,target,features})
    const popup = {closed:false,opener:undefined,destinations:[],close() {this.closed = true},
      location:{replace(destination) {popup.destinations.push(destination)}}}
    probe.popups.push(popup)
    return popup
  }
}

export function assertHypnotherapyLink(href, locale, channel) {
  const url = new URL(href)
  const expected = channel === 'whatsapp' ? ['https://wa.me','/14376066502'] : ['https://t.me','/AndyTherapist']
  assert.ok(['whatsapp','telegram'].includes(channel))
  assert.equal(url.origin, expected[0]); assert.equal(url.pathname, expected[1])
  assert.ok(!url.username && !url.password && !url.hash)
  assert.deepEqual([...url.searchParams.keys()], ['text'])
  const message = url.searchParams.get('text') || ''
  assert.ok(message.includes(hypnotherapyService(locale)))
  assert.ok(message.includes(HYPNOTHERAPY_REFERENCE))
  assert.ok(message.includes('https://holistichouse.vercel.app' + sourcePath(locale)))
  assert.doesNotMatch(message, /hypnotherapy-qa|example\.test|operationId|contactConsent|\/api\/|\/app\/|\/auth\/|\/checkout\//)
  return message
}

export async function verifyHypnotherapyRequestInPage(page, expect, locale, channel, guard) {
  const capture = page.locator('[data-sitewide-capture="core-service"][data-core-service-capture="hypnotherapy"]')
  await expect(capture).toHaveCount(1)
  await expect(capture).toHaveAttribute('lang', locale)
  await capture.scrollIntoViewIfNeeded()
  await expect(capture).toBeVisible()
  const form = capture.locator('form[data-compact-lead-form]')
  await expect(form).toHaveCount(1)
  await expect(form).toBeVisible()
  const contact = form.locator('input[name="contact"]'), consent = form.locator('input[type="checkbox"]')
  const submit = form.locator('button[data-compact-channel="' + channel + '"]')
  const other = form.locator('button[data-compact-channel="' + (channel === 'whatsapp' ? 'telegram' : 'whatsapp') + '"]')
  const links = capture.locator('a[data-compact-channel]'), receipt = capture.locator('[data-lead-saved][role="status"]')
  const priorReceipt = await page.evaluate(key => sessionStorage.getItem(key), HYPNOTHERAPY_RECEIPT_KEY)
  const beforeSave = async () => {
    await expect(links).toHaveCount(0); await expect(receipt).toHaveCount(0)
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), HYPNOTHERAPY_RECEIPT_KEY), priorReceipt,
      'Unacknowledged request must not change an earlier same-tab receipt')
  }
  await expect(contact).toHaveValue('')
  await expect(contact).toHaveAttribute('required', '')
  await expect(consent).toHaveAttribute('required', '')
  await expect(consent).not.toBeChecked()
  await beforeSave()
  await contact.fill('not-a-contact')
  await submit.click()
  await expect(form.locator('[role="alert"]')).toHaveText(copy[locale].invalid)
  assert.equal(guard.count, 0)
  assert.deepEqual(await page.evaluate(() => window.__hhHypnotherapyProbe.opens), [])
  await contact.fill(HYPNOTHERAPY_CONTACT)
  await submit.click()
  await expect(form.locator('[role="alert"]')).toHaveText(copy[locale].consent)
  assert.equal(guard.count, 0)
  assert.deepEqual(await page.evaluate(() => window.__hhHypnotherapyProbe.opens), [])
  await beforeSave()
  await consent.check()
  await expect(consent).toBeChecked()
  guard.arm()
  await submit.click()
  await expect.poll(() => guard.pending).toBe(true)
  for (const input of [submit,other,contact,consent]) await expect(input).toBeDisabled()
  await beforeSave()
  const reserved = await page.evaluate(() => window.__hhHypnotherapyProbe.popups.map(p => ({closed:p.closed,opener:p.opener,destinations:p.destinations})))
  assert.deepEqual(reserved, [{closed:false,opener:null,destinations:[]}], 'No provider handoff before acknowledgement')
  assert.deepEqual(guard.blocked, [])
  await guard.confirm()
  await expect(receipt).toHaveCount(1)
  await expect(receipt).toContainText(HYPNOTHERAPY_REFERENCE)
  await expect(form).toHaveCount(0)
  await expect(links).toHaveCount(2)
  const messages = [], hrefs = {}
  for (const name of ['whatsapp','telegram']) {
    const link = capture.locator('a[data-compact-channel="' + name + '"]')
    await expect(link).toHaveCount(1); await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('target', '_blank')
    assert.deepEqual((await link.getAttribute('rel')).split(/\s+/).sort(), ['noopener','noreferrer'])
    hrefs[name] = await link.getAttribute('href')
    messages.push(assertHypnotherapyLink(hrefs[name], locale, name))
  }
  assert.equal(messages[0], messages[1], 'Both channels retain the same service, reference and public source')
  await expect.poll(async () => page.evaluate(() => window.__hhHypnotherapyProbe.popups[0].destinations)).toEqual([hrefs[channel]])
  assert.deepEqual(await page.evaluate(() => window.__hhHypnotherapyProbe.opens), [{url:'about:blank',target:'_blank',features:undefined}])
  const savedReceipt = JSON.parse(await page.evaluate(key => sessionStorage.getItem(key), HYPNOTHERAPY_RECEIPT_KEY))
  assert.deepEqual(Object.keys(savedReceipt).sort(), ['createdAt','referenceCode'])
  assert.equal(savedReceipt.referenceCode, HYPNOTHERAPY_REFERENCE)
  assert.ok(Number.isSafeInteger(savedReceipt.createdAt))
  assert.equal(guard.count, 1)
  assert.deepEqual(guard.blocked, [])
}

export async function verifyHypnotherapyRequest(page, expect, {origin,locale,channel='whatsapp'}, env = process.env) {
  assertHypnotherapyBoundary(origin, locale, env)
  const url = origin + sourcePath(locale)
  assert.equal(page.url(), url)
  const context = page.context(), guard = createHypnotherapyRequestGuard(origin, locale, channel, env)
  let primary, complete = false
  await context.route('**/*', guard.route)
  try {
    await page.evaluate(installHypnotherapyPopupProbe)
    await verifyHypnotherapyRequestInPage(page, expect, locale, channel, guard)
    await expect(page).toHaveURL(url)
    complete = true
  } catch (error) { primary = error }
  finally {
    try { await guard.close() } catch (error) { if (!primary) primary = error }
    // Never remove protection on a failed interaction. The caller closes its
    // existing context on failure; any late callback remains fenced/inert.
    if (complete && !primary) {
      try {
        assert.deepEqual(guard.blocked, [])
        await page.evaluate(() => {window.open = window.__hhHypnotherapyProbe.original; delete window.__hhHypnotherapyProbe})
        await context.unroute('**/*', guard.route)
      } catch (error) { primary = error }
    }
  }
  if (primary) throw primary
}
