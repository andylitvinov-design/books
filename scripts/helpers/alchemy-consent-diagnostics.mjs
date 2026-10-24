// Disposable synthetic Alchemy page only. This observer never changes the DOM,
// native actions, app state, request interception, receipt storage or timeouts.
// Keep every exported field categorical/numeric; never serialize DOM/text/URLs.
export function installAlchemyConsentProbe({ expectedContact, expectedPath }) {
  if (window.__alchemyConsentProbe) throw new Error('Duplicate synthetic probe')
  const root = document.querySelector('[data-alchemy-booking-formats]')
  if (!root) throw new Error('Synthetic pricing root missing')
  const entries = [], ids = new WeakMap(), listeners = []
  let nextId = 0, active = true, dropped = 0, scrollSamples = 0, droppedScroll = 0
  const began = performance.now()
  const token = node => {
    if (!node) return 0
    if (!ids.has(node)) ids.set(node, ++nextId)
    return ids.get(node)
  }
  const number = value => Number.isFinite(value) ? Math.round(value) : null
  const category = target => {
    const chooser = root.querySelector('[data-contact-channel-chooser]')
    if (!target || !root.contains(target)) return 'outside'
    if (target === chooser?.querySelector('input[type="checkbox"]')) return 'consent'
    if (target === chooser?.querySelector('input[type="email"]')) return 'email'
    if (target.closest?.('label')?.querySelector('input[type="checkbox"]')) return 'consent-label'
    if (target.closest?.('[data-alchemy-format]')) return 'format'
    if (target.closest?.('[data-contact-order]')) return 'open-button'
    return chooser?.contains(target) ? 'chooser-other' : 'pricing-other'
  }
  const state = () => {
    const chooser = root.querySelector('[data-contact-channel-chooser]')
    const consent = chooser?.querySelector('input[type="checkbox"]')
    const email = chooser?.querySelector('input[type="email"]')
    const submit = chooser?.querySelector('button[type="submit"]')
    const selected = ['30', '60', 'month'].filter(format =>
      root.querySelector(`[data-alchemy-format="${format}"]`)?.getAttribute('aria-pressed') === 'true')
    const rect = consent?.getBoundingClientRect()
    return {
      samePath: window.location.pathname === expectedPath,
      rootConnected: root.isConnected,
      chooser: token(chooser), checkbox: token(consent),
      open: chooser?.getAttribute('data-open') === 'true',
      selected: selected.length === 1 ? selected[0] : selected.length ? 'multiple' : 'none',
      checked: consent ? consent.checked === true : null,
      disabled: consent ? consent.disabled === true : null,
      submitDisabled: submit ? submit.disabled === true : null,
      emailState: !email ? 'missing' : email.value === '' ? 'empty' : email.value === expectedContact ? 'fixture' : 'other',
      activeTarget: category(document.activeElement),
      rect: rect ? [rect.x, rect.y, rect.width, rect.height].map(number) : null,
      scroll: [window.scrollX, window.scrollY].map(number),
    }
  }
  const record = (kind, phase, event) => {
    if (!active) return
    if (entries.length >= 120) { dropped++; return }
    entries.push({kind, phase, ms: number(performance.now() - began),
      ...(event ? {target: category(event.target), trusted: event.isTrusted === true,
        prevented: event.defaultPrevented === true,
        point: [event.clientX, event.clientY].map(number)} : {}),
      state: state()})
  }
  const observer = new MutationObserver(() => record('mutation', 'observer'))
  const stop = () => {
    active = false
    for (const [type, listener, capture] of listeners) document.removeEventListener(type, listener, capture)
    observer.disconnect()
    delete window.__alchemyConsentProbe
    return {schemaVersion: 1, outcome: 'captured', entries, final: state(), dropped, droppedScroll}
  }
  window.__alchemyConsentProbe = { stop }
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'input', 'change', 'focusin']) {
    for (const capture of [true, false]) {
      const listener = event => {
        record(type, capture ? 'capture' : 'bubble', event)
        if (capture && ['click', 'input', 'change'].includes(type)) {
          // Extra checkpoint even if propagation stops. Microtask ordering is
          // browser-defined; do not assume it follows all event handlers.
          // No timer, retry, synthetic event or preventDefault is introduced.
          queueMicrotask(() => record(type, 'microtask', event))
        }
      }
      listeners.push([type, listener, capture])
      document.addEventListener(type, listener, {capture, passive: true})
    }
  }
  const scroll = () => {
    if (scrollSamples++ < 8) record('scroll', 'capture')
    else droppedScroll++
  }
  listeners.push(['scroll', scroll, true])
  document.addEventListener('scroll', scroll, {capture: true, passive: true})
  observer.observe(root, {subtree: true, childList: true, attributes: true,
    attributeFilter: ['disabled', 'checked', 'data-open', 'aria-pressed', 'hidden']})
  record('start', 'snapshot')
}

export async function withAlchemyConsentDiagnostics(page, {locale, denyReceiptStorage, expectedContact}, run) {
  let diagnostic = {schemaVersion: 1, outcome: 'unavailable'}
  // Diagnostic failures must never replace or retry the original native action.
  try {
    await page.evaluate(installAlchemyConsentProbe, {
      expectedContact, expectedPath: `/${locale}/services/alchemy-of-soul`,
    })
  } catch { /* Report availability, never an error message containing page data. */ }
  try { return await run() }
  finally {
    try {
      const captured = await page.evaluate(() => window.__alchemyConsentProbe?.stop())
      if (captured) diagnostic = captured
    } catch { /* The guarded context can disappear; the action failure remains primary. */ }
    console.log('SYNTHETIC_ALCHEMY_CONSENT', JSON.stringify({locale, denyReceiptStorage, ...diagnostic}))
  }
}
