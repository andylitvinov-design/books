import assert from 'node:assert/strict'

const REFERENCE = 'HH-ABCD1234EF56'
const CONTACT = 'dao-qa@example.test'
const SERVICE = 'Free symbolic Wu Xing Resource Profile'
const copy = {
  en: { title: 'Get your free Wu Xing profile', contact: 'Where can Andrey reply?',
    consent: 'I agree to save my contact for one personal reply about this request. No marketing.',
    required: 'Please agree to a personal reply before continuing.' },
  ru: { title: 'Получите бесплатный профиль У-Син', contact: 'Как с вами связаться?',
    consent: 'Согласен(-на) сохранить контакт для личного ответа по этой заявке. Без рассылок.',
    required: 'Подтвердите согласие на личный ответ по заявке.' },
}

// This helper may operate only in the existing isolated auth-double/DB CI.
// Validate before installing handlers, mutating the page, or filling a field.
export function assertDaoVerifierBoundary(origin, env = process.env) {
  assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/,
    'Dao verifier requires an exact loopback origin')
  const url = new URL(origin)
  assert.equal(url.origin, origin)
  const db = new URL(env.HH_TEST_ADMIN_DATABASE_URL || 'http://invalid')
  assert.ok(env.CI === 'true' && env.HH_APP_TEST_RUNTIME === 'isolated' && !env.VERCEL &&
    ['127.0.0.1', 'localhost'].includes(db.hostname) && db.pathname === '/hh_app_test',
  'Dao verifier requires the isolated hh_app_test runtime')
}

// Context routing also covers the first request of a popup. Fail closed on all
// external traffic and unexpected writes; fulfill the sole synthetic POST in
// memory, never pass it through to local Next, Supabase, or a messenger provider.
export function createDaoCaptureRouteGuard(origin, env = process.env) {
  assertDaoVerifierBoundary(origin, env)
  const submissions = [], blocked = []
  const route = async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method()
    if (url.origin === origin && url.pathname === '/api/service-enquiries' &&
        url.search === '' && method === 'POST') {
      submissions.push(request.postDataJSON())
      return route.fulfill({ status: 201, contentType: 'application/json',
        body: JSON.stringify({ saved: true, referenceCode: REFERENCE }) })
    }
    if (url.origin === origin && ['GET', 'HEAD'].includes(method)) return route.continue()
    blocked.push({ origin: url.origin, path: url.pathname, method })
    return route.abort('blockedbyclient')
  }
  return { submissions, blocked, route }
}

export async function assertDaoFreeEntryCapture(page, expect, { origin, locale }) {
  assertDaoVerifierBoundary(origin)
  assert.ok(Object.hasOwn(copy, locale), 'Only explicitly covered Dao locales are allowed')
  const path = '/' + locale + '/services/dao-health-profile'
  assert.equal(page.url(), origin + path)
  const t = copy[locale], context = page.context()
  const guard = createDaoCaptureRouteGuard(origin)
  await context.route('**/*', guard.route)
  try {
    // Record the real synchronous popup reservation and subsequent redirect,
    // but never open a provider. The context route remains a second boundary.
    await page.evaluate(() => {
      window.__hhDaoCaptureProbe = { opens: [], destinations: [] }
      window.__hhDaoOriginalOpen = window.open
      window.open = (url, target) => {
        window.__hhDaoCaptureProbe.opens.push({ url, target })
        return { opener: null, closed: false,
          location: { replace: destination => window.__hhDaoCaptureProbe.destinations.push(destination) },
          close() { this.closed = true },
        }
      }
    })
    const capture = page.locator('main[data-free-entry-landing="dao"] #request-free-wu-xing[data-service-lead-capture]')
    await expect(capture).toHaveCount(1)
    await expect(capture).toBeVisible()
    await expect(capture).toHaveAttribute('lang', locale)
    await expect(capture.getByRole('heading', { name: t.title, exact: true })).toBeVisible()
    await expect(page.locator('[data-sitewide-capture="core-service"][data-core-service-capture="dao"]')).toHaveCount(0)
    // The current page exposes the free-review alternative directly in public
    // navigation, not inside the removed generic footer disclosure.
    await expect(page.locator('a[href="/' + locale + '/services/free-situation-review"]').first()).toBeVisible()
    const form = capture.locator('form[data-compact-lead-form]')
    await expect(form).toHaveCount(1)
    const contact = form.getByLabel(t.contact, { exact: true })
    const consent = form.getByRole('checkbox', { name: t.consent, exact: true })
    const whatsapp = form.getByRole('button', { name: 'WhatsApp', exact: true })
    await expect(contact).toHaveValue('')
    await expect(consent).not.toBeChecked()
    await expect(capture.locator('a[data-compact-channel]')).toHaveCount(0)
    await expect(capture.locator('[data-lead-saved]')).toHaveCount(0)
    await contact.fill(CONTACT)
    await whatsapp.click()
    await expect(form.getByRole('alert')).toHaveText(t.required)
    assert.deepEqual(guard.submissions, [], 'No request without explicit consent')
    assert.deepEqual(await page.evaluate(() => window.__hhDaoCaptureProbe),
      { opens: [], destinations: [] }, 'No popup or messenger destination before consent')
    await consent.check()
    await whatsapp.click()
    await expect(capture.locator('[data-lead-saved]')).toContainText(REFERENCE)
    await expect(capture.locator('a[data-compact-channel]')).toHaveCount(2)
    assert.equal(guard.submissions.length, 1, 'Exactly one in-memory synthetic registration')
    const payload = guard.submissions[0]
    assert.equal(payload.locale, locale)
    assert.equal(payload.sourcePath, path)
    assert.equal(payload.serviceTitle, SERVICE)
    assert.deepEqual(payload.contact, { displayName: '', email: CONTACT, phone: '' })
    assert.equal(payload.contactConsent, true)
    assert.equal(payload.description, 'Preferred reply channel: WhatsApp')
    assert.equal(payload.website, '')
    assert.match(payload.operationId, /^[a-f0-9-]{36}$/i)
    const urls = []
    for (const [channel, host, pathname] of [
      ['whatsapp', 'https://wa.me', '/14376066502'],
      ['telegram', 'https://t.me', '/AndyTherapist'],
    ]) {
      const link = capture.locator('a[data-compact-channel="' + channel + '"]')
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noopener/)
      await expect(link).toHaveAttribute('rel', /noreferrer/)
      const url = new URL(await link.getAttribute('href'))
      assert.equal(url.origin, host)
      assert.equal(url.pathname, pathname)
      assert.equal(url.username + url.password + url.hash, '')
      assert.deepEqual([...url.searchParams.keys()], ['text'])
      const message = url.searchParams.get('text') || ''
      assert.ok(message.includes(SERVICE) && message.includes(REFERENCE))
      assert.ok(message.includes(path), 'Receipt preserves the localized public source')
      assert.ok(!message.includes(CONTACT), 'Contact never enters the messenger draft')
      urls.push(url)
    }
    assert.equal(urls[0].searchParams.get('text'), urls[1].searchParams.get('text'))
    const probe = await page.evaluate(() => window.__hhDaoCaptureProbe)
    assert.deepEqual(probe.opens, [{ url: 'about:blank', target: '_blank' }])
    assert.deepEqual(probe.destinations, [urls[0].href])
    assert.deepEqual(guard.blocked, [], 'No unexpected external or write request was attempted')
  } finally {
    // Remove the test-only popup double before reusing the document.
    try {
      await page.evaluate(() => {
        if (window.__hhDaoOriginalOpen) window.open = window.__hhDaoOriginalOpen
        delete window.__hhDaoOriginalOpen
        delete window.__hhDaoCaptureProbe
      })
    } finally { await context.unroute('**/*', guard.route) }
  }
}
