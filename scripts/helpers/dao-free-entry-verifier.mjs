import assert from 'node:assert/strict'
import { boundedBestEffort } from './browser-failure-evidence.mjs'
import { persistDaoConsentEvidence } from './dao-consent-evidence.mjs'

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

// Read-only failure evidence: never serialize contact, DOM text, URLs or payloads.
// Self-contained so Playwright can evaluate it without application hooks.
export function daoConsentDiagnostics(form, expected) {
  const contact = form.querySelector('input[name="contact"]')
  const consent = form.querySelector('input[type="checkbox"]')
  const button = form.querySelector('button[data-compact-channel="whatsapp"]')
  const alerts = [...form.querySelectorAll('[role="alert"]')]
  return {
    formConnected: Boolean(form.isConnected),
    documentComplete: form.ownerDocument?.readyState === 'complete',
    contactMatches: contact?.value === expected.contact,
    contactDisabled: Boolean(contact?.disabled),
    consentChecked: Boolean(consent?.checked),
    consentRequired: Boolean(consent?.required),
    consentMissing: Boolean(consent?.validity?.valueMissing),
    buttonPresent: Boolean(button),
    buttonTypeIsButton: button?.type === 'button',
    buttonDisabled: Boolean(button?.disabled),
    alertCount: alerts.length,
    expectedConsentAlert: alerts.some(alert => alert.textContent?.trim() === expected.required),
  }
}

// Isolated verifier observer only. Native event delivery and host props are not
// proof that a React handler executed. Never invoke handlers or inspect fibers.
export function installDaoInteractionProbe(form, expected) {
  const doc = form.ownerDocument, win = doc.defaultView
  const contact = form.querySelector('input[name="contact"]')
  const button = form.querySelector('button[data-compact-channel="whatsapp"]')
  const props = node => {
    const key = node && Object.getOwnPropertyNames(node).find(name => name.startsWith('__reactProps$'))
    // Use only data descriptors; do not invoke arbitrary application getters.
    return key ? Object.getOwnPropertyDescriptor(node, key)?.value : undefined
  }
  const value = (object, key) => object && Object.getOwnPropertyDescriptor(object, key)?.value
  const snapshot = () => {
    const inputProps = props(contact), buttonProps = props(button)
    return { contactPropsPresent: Boolean(inputProps), buttonPropsPresent: Boolean(buttonProps),
      contactOnChangeBound: typeof value(inputProps, 'onChange') === 'function',
      buttonOnClickBound: typeof value(buttonProps, 'onClick') === 'function',
      contactPropMatches: value(inputProps, 'value') === expected.contact }
  }
  const counts = { inputCapture: 0, inputBubble: 0, clickCapture: 0, clickBubble: 0, trustedClicks: 0 }
  const initial = snapshot()
  let clickCapture = null, clickBubble = null, defaultPrevented = false
  const listeners = []
  for (const capture of [true, false]) {
    const listener = event => {
      if (event.type === 'input' && event.target === contact) {
        counts[capture ? 'inputCapture' : 'inputBubble']++
      } else if (event.type === 'click' && button?.contains(event.target)) {
        counts[capture ? 'clickCapture' : 'clickBubble']++
        if (capture) {
          if (event.isTrusted) counts.trustedClicks++
          clickCapture = snapshot()
        } else clickBubble = snapshot()
        defaultPrevented ||= Boolean(event.defaultPrevented)
      }
    }
    for (const type of ['input', 'click']) {
      doc.addEventListener(type, listener, { capture, passive: true })
      listeners.push([type, listener, capture])
    }
  }
  // A successful browser click can lose its activation target between press
  // and release (for example, when input blur restores fixed navigation).
  // Observe the real document event sequence; never blur, retry or dispatch.
  // kind: 1 pointerdown, 2 mousedown, 3 focusout, 4 focusin,
  //       5 pointerup, 6 mouseup, 7 click. No DOM text/attributes are serialized.
  const pointerEvents = ['pointerdown', 'mousedown', 'focusout', 'focusin', 'pointerup', 'mouseup', 'click']
  const pointerTimeline = []
  let pointerDropped = 0, pointerErrors = 0
  const finite = number => typeof number === 'number' && Number.isFinite(number)
    ? Math.round(Math.max(-10000000, Math.min(10000000, number)) * 10) / 10 : null
  const rect = node => {
    const box = node?.getBoundingClientRect?.()
    return box ? { left: finite(box.left), top: finite(box.top), right: finite(box.right),
      bottom: finite(box.bottom), width: finite(box.width), height: finite(box.height) } : null
  }
  const geometry = (event = null) => {
    const nav = doc.querySelector?.('.mobile-bottom-navigation')
    const navStyle = nav && win.getComputedStyle?.(nav)
    const navBox = rect(nav)
    const x = finite(event?.clientX), y = finite(event?.clientY)
    const point = x !== null && y !== null ? { x, y } : null
    const hit = point ? doc.elementFromPoint?.(point.x, point.y) : null
    return { button: rect(button), navigation: navBox,
      navVisible: Boolean(navBox && navBox.width > 0 && navBox.height > 0 && navStyle &&
        navStyle.display !== 'none' && navStyle.visibility !== 'hidden'),
      navPointerEventsNone: navStyle?.pointerEvents === 'none',
      bodyPaddingBottom: finite(Number.parseFloat(doc.body && win.getComputedStyle?.(doc.body)?.paddingBottom)),
      scrollY: finite(win.scrollY), viewportHeight: finite(win.innerHeight),
      documentHeight: finite(doc.documentElement?.scrollHeight),
      activeContact: doc.activeElement === contact, activeButton: doc.activeElement === button,
      targetContact: Boolean(event && event.target === contact),
      targetButton: Boolean(event?.target && button?.contains(event.target)),
      targetForm: Boolean(event?.target && form.contains?.(event.target)),
      targetNavigation: Boolean(event?.target && nav?.contains(event.target)),
      point, hitButton: Boolean(hit && button?.contains(hit)),
      hitNavigation: Boolean(hit && nav?.contains(hit)) }
  }
  const pointerListener = event => {
    if (pointerTimeline.length >= 24) { pointerDropped++; return }
    try {
      pointerTimeline.push({ kind: pointerEvents.indexOf(event.type) + 1,
        trusted: Boolean(event.isTrusted), defaultPrevented: Boolean(event.defaultPrevented), ...geometry(event) })
    } catch { pointerErrors++ } // Observing must never interrupt the real event.
  }
  for (const type of pointerEvents) {
    doc.addEventListener(type, pointerListener, { capture: true, passive: true })
    listeners.push([type, pointerListener, true])
  }
  win.__hhDaoInteractionProbe = {
    read(currentForm) {
      return { initial, clickCapture, clickBubble, current: snapshot(), counts: { ...counts },
        defaultPrevented, originalFormConnected: Boolean(form.isConnected), sameForm: currentForm === form,
        sameContact: currentForm.querySelector('input[name="contact"]') === contact,
        sameButton: currentForm.querySelector('button[data-compact-channel="whatsapp"]') === button,
        pointer: { events: pointerTimeline.map(event => ({ ...event })), dropped: pointerDropped, errors: pointerErrors } }
    },
    dispose() { for (const [type, listener, capture] of listeners) doc.removeEventListener(type, listener, capture) },
  }
}

export async function assertDaoFreeEntryCapture(page, expect, { origin, locale, failureScreenshotPath }) {
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
    await boundedBestEffort(() => form.evaluate(installDaoInteractionProbe, { contact: CONTACT }), 3000)
    await contact.fill(CONTACT)
    await whatsapp.click()
    try {
      await expect(form.getByRole('alert')).toHaveText(t.required)
    } catch (error) {
      let state = null, interaction = null
      // Bound evidence only, never the assertion or the user's original action.
      await boundedBestEffort(async () => {
        state = await form.evaluate(daoConsentDiagnostics, { contact: CONTACT, required: t.required })
        interaction = await form.evaluate(node => node.ownerDocument.defaultView.__hhDaoInteractionProbe?.read(node) || null)
      }, 3000)
      try {
        console.error('DAO_CONSENT_FAILURE', JSON.stringify({ locale, state, interaction,
          syntheticSubmissions: guard.submissions.length, blockedRequests: guard.blocked.length }))
      } catch { /* A diagnostic sink failure must not replace the original error. */ }
      try {
        persistDaoConsentEvidence({ locale, state, interaction,
          syntheticSubmissions: guard.submissions.length, blockedRequests: guard.blocked.length })
      } catch { /* Optional persistence never replaces the original assertion. */ }
      if (failureScreenshotPath) {
        const outcome = await boundedBestEffort(() => form.screenshot({ path: failureScreenshotPath,
          mask: [form.locator('input, textarea')], timeout: 2500 }), 3000)
        try { console.error('DAO_CONSENT_FORM_SCREENSHOT', JSON.stringify({ locale, outcome })) }
        catch { /* Keep the original consent error when screenshot logging fails. */ }
      }
      throw error
    }
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
        try { window.__hhDaoInteractionProbe?.dispose() } catch { /* Evidence cleanup is non-fatal. */ }
        delete window.__hhDaoInteractionProbe
        if (window.__hhDaoOriginalOpen) window.open = window.__hhDaoOriginalOpen
        delete window.__hhDaoOriginalOpen
        delete window.__hhDaoCaptureProbe
      })
    } finally { await context.unroute('**/*', guard.route) }
  }
}
