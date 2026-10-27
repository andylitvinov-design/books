import { randomUUID } from 'node:crypto'
import { boundedBestEffort } from './browser-failure-evidence.mjs'

let nextToken = 0
const registryOwner = randomUUID()

// Passive verifier-only observer. No values, text, application handlers/fibers,
// URLs or private attributes are exported; own React prop descriptors establish
// binding presence only, never proof that React actually handled an event.
export function installReviewConsentProbe(originalForm, { token, owner, registryOwner, locale, expiresAt }) {
  const doc = originalForm.ownerDocument, win = doc.defaultView
  const key = '__hhReviewConsentRegistry', listeners = []
  let registry, probes, probe, lease = null, disposed = false
  const own = (value, name) => { try { return value && Object.getOwnPropertyDescriptor(value, name)?.value } catch { return undefined } }
  const dispose = () => {
    if (disposed) return
    disposed = true
    try { if (lease !== null) win.clearTimeout(lease) } catch { /* Owned observer cleanup. */ }
    for (const [type, listener, capture] of listeners) {
      try { doc.removeEventListener(type, listener, capture) } catch { /* Continue cleanup. */ }
    }
    try {
      if (registry && probes && probe) {
        registry.closedThrough = Math.max(own(registry, 'closedThrough'), token)
        if (Map.prototype.get.call(probes, token) === probe) Map.prototype.delete.call(probes, token)
      }
    } catch { /* Unknown registry must not touch application state. */ }
  }
  try {
    if (!Number.isSafeInteger(token) || token <= 0 || !['en', 'ru'].includes(locale) || typeof owner !== 'string' || !/^[a-f0-9-]{36}$/.test(owner) || typeof registryOwner !== 'string' || !/^[a-f0-9-]{36}$/.test(registryOwner) || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return false
    const descriptor = Object.getOwnPropertyDescriptor(win, key)
    if (descriptor && !Object.hasOwn(descriptor, 'value')) return false
    registry = descriptor?.value
    if (!registry) { registry = { schema: 'hh-review-consent-observer-v1', registryOwner, closedThrough: 0, probes: new Map() }; Object.defineProperty(win, key, { value: registry, configurable: true }) }
    if ((own(registry, 'schema') !== 'hh-review-consent-observer-v1' || own(registry, 'registryOwner') !== registryOwner)) return false
    probes = own(registry, 'probes')
    const closed = own(registry, 'closedThrough')
    if (!Number.isSafeInteger(closed) || closed < 0 || token <= closed || Map.prototype.has.call(probes, token) || Object.getOwnPropertyDescriptor(Map.prototype, 'size').get.call(probes) >= 8) return false
    const types = ['input', 'change', 'pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'focusin', 'focusout', 'submit', 'invalid']
    const records = [], counts = types.map(() => [0, 0])
    let dropped = 0, observationErrors = 0
    const increment = value => Math.min(1000000, value + 1)
    const finite = value => typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(-1000000, Math.min(1000000, value)) * 10) / 10 : null
    const rect = node => { const box = node?.getBoundingClientRect(); return box ? { x: finite(box.x), y: finite(box.y), width: finite(box.width), height: finite(box.height) } : null }
    const contains = (parent, child) => Boolean(parent && child && parent.contains(child))
    const props = node => {
      if (!node) return null
      const name = Object.getOwnPropertyNames(node).find(value => value.startsWith('__reactProps$'))
      return name ? own(node, name) : null
    }
    const originalButton = originalForm.querySelector('button[data-contact-channel-submit="whatsapp"]')
    const started = Date.now()
    const snapshot = (event = null, phase = 'snapshot') => {
      const form = doc.querySelector('main[data-free-entry-landing="situation"] [data-personal-express-enquiry] [data-contact-channel-chooser][data-reiki-phone-enquiry] form')
      const button = form?.querySelector('button[data-contact-channel-submit="whatsapp"]')
      const phone = form?.querySelector('input[type="tel"]'), consent = form?.querySelector('input[type="checkbox"]')
      const nav = doc.querySelector('.mobile-bottom-navigation'), box = rect(button)
      const x = finite(event?.clientX), y = finite(event?.clientY)
      const hitX = x ?? (box ? box.x + box.width / 2 : null), hitY = y ?? (box ? box.y + box.height / 2 : null)
      const hit = hitX !== null && hitY !== null ? doc.elementFromPoint(hitX, hitY) : null
      const alias = node => !node ? 'none' : contains(button, node) ? 'button' : contains(originalButton, node) ? 'original-button' : node === phone ? 'phone' : node === consent ? 'consent' : contains(form, node) ? 'form' : contains(nav, node) ? 'navigation' : 'other'
      const buttonProps = props(button), phoneProps = props(phone), consentProps = props(consent)
      const navStyle = nav && win.getComputedStyle(nav)
      return {
        type: event ? types[types.indexOf(event.type)] || 'unknown' : 'snapshot', phase,
        elapsedMs: finite(Date.now() - started), trusted: event?.isTrusted === true, defaultPrevented: event?.defaultPrevented === true,
        target: alias(event?.target), focus: alias(doc.activeElement), hit: alias(hit),
        currentRoute: win.location.pathname === '/' + locale + '/services/free-situation-review',
        documentComplete: doc.readyState === 'complete', formConnected: form?.isConnected === true,
        originalFormConnected: originalForm.isConnected === true, buttonConnected: button?.isConnected === true,
        sameForm: form === originalForm, sameButton: button === originalButton,
        buttonDisabled: button?.disabled === true, phoneDisabled: phone?.disabled === true,
        consentChecked: consent?.checked === true, consentDisabled: consent?.disabled === true, consentRequired: consent?.required === true,
        phoneValueMissing: phone?.validity?.valueMissing === true,
        buttonPropsPresent: Boolean(buttonProps), buttonOnClickBound: typeof own(buttonProps, 'onClick') === 'function',
        phoneOnChangeBound: typeof own(phoneProps, 'onChange') === 'function', consentOnChangeBound: typeof own(consentProps, 'onChange') === 'function',
        alertCount: Math.min(100, form?.querySelectorAll('[role="alert"]').length || 0),
        navigationHidden: Boolean(navStyle && (navStyle.display === 'none' || navStyle.visibility === 'hidden')),
        navigationPointerEventsNone: navStyle?.pointerEvents === 'none',
        x, y, buttonRect: box, navigationRect: rect(nav), scrollY: finite(win.scrollY),
        viewportWidth: finite(win.innerWidth), viewportHeight: finite(win.innerHeight),
      }
    }
    const read = () => { try { return snapshot() } catch { observationErrors = increment(observationErrors); return null } }
    const initial = read()
    if (Date.now() > expiresAt) { dispose(); return false }
    probe = { owner, read: () => ({ initial, current: read(), records: records.slice(), counts: counts.map(pair => pair.slice()), dropped, observationErrors }), dispose }
    Map.prototype.set.call(probes, token, probe)
    for (const [index, type] of types.entries()) for (const capture of [true, false]) {
      const listener = event => {
        if (disposed) return
        counts[index][capture ? 0 : 1] = increment(counts[index][capture ? 0 : 1])
        try {
          if (records.length === 32) { records.shift(); dropped = increment(dropped) }
          records.push(snapshot(event, capture ? 'capture' : 'bubble'))
        } catch { observationErrors = increment(observationErrors) }
      }
      listeners.push([type, listener, capture])
      doc.addEventListener(type, listener, { capture, passive: true })
    }
    if (Date.now() > expiresAt) { dispose(); return false }
    lease = win.setTimeout(dispose, 45000)
    return true
  } catch { dispose(); return false }
}

export function closeReviewConsentProbe({ token, owner, registryOwner, capture = false }) {
  const key = '__hhReviewConsentRegistry', win = window
  const own = (value, name) => { try { return value && Object.getOwnPropertyDescriptor(value, name)?.value } catch { return undefined } }
  if (!Number.isSafeInteger(token) || token <= 0 || typeof owner !== 'string' || !/^[a-f0-9-]{36}$/.test(owner) || typeof registryOwner !== 'string' || !/^[a-f0-9-]{36}$/.test(registryOwner)) return null
  const descriptor = Object.getOwnPropertyDescriptor(win, key)
  if (descriptor && !Object.hasOwn(descriptor, 'value')) return null
  let registry = descriptor?.value
  if (!registry) {
    registry = { schema: 'hh-review-consent-observer-v1', registryOwner, closedThrough: token, probes: new Map() }
    Object.defineProperty(win, key, { value: registry, configurable: true })
    return null
  }
  if ((own(registry, 'schema') !== 'hh-review-consent-observer-v1' || own(registry, 'registryOwner') !== registryOwner)) return null
  const probes = own(registry, 'probes'), closed = own(registry, 'closedThrough')
  if (!Number.isSafeInteger(closed) || closed < 0) return null
  let probe
  try { probe = Map.prototype.get.call(probes, token) } catch { return null }
  // A rejected/duplicate setup does not authorize reading, disposing or evicting
  // a foreign entry. Only this invocation's own-data nonce and callbacks match.
  const read = own(probe, 'read'), dispose = own(probe, 'dispose')
  if (probe && (own(probe, 'owner') !== owner || typeof read !== 'function' || typeof dispose !== 'function')) return null
  registry.closedThrough = Math.max(closed, token)
  try { return capture && probe ? read() : null }
  finally {
    try { if (probe) dispose() }
    finally { if (Map.prototype.get.call(probes, token) === probe) Map.prototype.delete.call(probes, token) }
  }
}

// Only own-data primitives and finite bounded geometry may reach CI output.
export function sanitizeReviewConsentDiagnostic(raw, meta = {}) {
  const own = (value, key) => { try { return value && typeof value === 'object' ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined } catch { return undefined } }
  const count = (value, max = 1000000) => Number.isInteger(value) && value >= 0 ? Math.min(max, value) : null
  const finite = value => typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(-1000000, Math.min(1000000, value)) * 10) / 10 : null
  const pick = (value, values) => values.includes(value) ? value : 'unknown'
  const sequence = (value, max, transform) => { const length = count(own(value, 'length'), max); return length === null ? [] : Array.from({ length }, (_, i) => transform(own(value, String(i)))) }
  const rect = value => value && typeof value === 'object' ? Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, finite(own(value, key))])) : null
  const record = value => {
    if (!value || typeof value !== 'object') return null
    const out = { type: pick(own(value, 'type'), ['snapshot', 'input', 'change', 'pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'focusin', 'focusout', 'submit', 'invalid']),
      phase: pick(own(value, 'phase'), ['snapshot', 'capture', 'bubble']), alertCount: count(own(value, 'alertCount'), 100) }
    for (const key of ['target', 'focus', 'hit']) out[key] = pick(own(value, key), ['none', 'button', 'original-button', 'phone', 'consent', 'form', 'navigation', 'other'])
    for (const key of ['trusted', 'defaultPrevented', 'currentRoute', 'documentComplete', 'formConnected', 'originalFormConnected', 'buttonConnected', 'sameForm', 'sameButton', 'buttonDisabled', 'phoneDisabled', 'consentChecked', 'consentDisabled', 'consentRequired', 'phoneValueMissing', 'buttonPropsPresent', 'buttonOnClickBound', 'phoneOnChangeBound', 'consentOnChangeBound', 'navigationHidden', 'navigationPointerEventsNone']) out[key] = own(value, key) === true
    for (const key of ['elapsedMs', 'x', 'y', 'scrollY', 'viewportWidth', 'viewportHeight']) out[key] = finite(own(value, key))
    for (const key of ['buttonRect', 'navigationRect']) out[key] = rect(own(value, key))
    return out
  }
  return { locale: pick(own(meta, 'locale'), ['en', 'ru']), kind: pick(own(meta, 'kind'), ['retry', 'handoff-failure']),
    setup: pick(own(meta, 'setup'), ['completed', 'rejected', 'timed_out']), capture: pick(own(meta, 'capture'), ['completed', 'rejected', 'timed_out']),
    writes: count(own(meta, 'writes')), providerAttempts: count(own(meta, 'providerAttempts')), routeErrors: count(own(meta, 'routeErrors')), pageErrors: count(own(meta, 'pageErrors')),
    initial: record(own(raw, 'initial')), current: record(own(raw, 'current')), records: sequence(own(raw, 'records'), 32, record),
    counts: sequence(own(raw, 'counts'), 12, pair => sequence(pair, 2, value => count(value))), dropped: count(own(raw, 'dropped')), observationErrors: count(own(raw, 'observationErrors')) }
}

export async function withReviewConsentDiagnostics(page, form, { locale, kind, counters }, operation, { timeoutMs = 500, log = console.error } = {}) {
  const token = ++nextToken, owner = randomUUID(), expiresAt = Date.now() + timeoutMs
  const setup = await boundedBestEffort(() => form.evaluate(installReviewConsentProbe, { token, owner, registryOwner, locale, expiresAt }), timeoutMs)
  let captured = null
  try { return await operation() }
  catch (error) {
    const capture = await boundedBestEffort(async () => { captured = await page.evaluate(closeReviewConsentProbe, { token, owner, registryOwner, capture: true }) }, timeoutMs)
    let counts = {}
    try { counts = counters() } catch { /* A failed diagnostic must not change the assertion. */ }
    try {
      const meta = { locale, kind, setup, capture }
      for (const key of ['writes', 'providerAttempts', 'routeErrors', 'pageErrors']) meta[key] = counts && Object.getOwnPropertyDescriptor(counts, key)?.value
      log('CURRENT_REVIEW_CONSENT_FAILURE', JSON.stringify(sanitizeReviewConsentDiagnostic(captured, meta)))
    } catch { /* Preserve exact primary exception. */ }
    throw error
  } finally {
    // Failed reads also need a tombstone/cleanup attempt. No second user action.
    await boundedBestEffort(() => page.evaluate(closeReviewConsentProbe, { token, owner, registryOwner }), timeoutMs)
  }
}
