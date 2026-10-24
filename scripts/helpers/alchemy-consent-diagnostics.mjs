// Disposable synthetic Alchemy page only. This observer never changes the DOM,
// native actions, app state, request interception, receipt storage or timeouts.
// Keep every exported field categorical/numeric; never serialize DOM/text/URLs.
export function installAlchemyConsentProbe({ expectedContact, expectedPath }) {
  if (window.__alchemyConsentProbe) throw new Error('Duplicate synthetic probe')
  const root = document.querySelector('[data-alchemy-booking-formats]')
  if (!root) throw new Error('Synthetic pricing root missing')
  const entries = [], layouts = [], ids = new WeakMap(), listeners = []
  let nextId = 0, active = true, dropped = 0, scrollSamples = 0, droppedScroll = 0
  let droppedLayouts = 0, scrollEnds = 0
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
  const geometry = () => {
    try {
      const consent = root.querySelector('[data-contact-channel-chooser]')?.querySelector('input[type="checkbox"]')
      const nav = document.querySelector('.ia222-bottom-navigation')
      const pixels = value => /^-?(?:\d+\.?\d*|\.\d+)px$/.test(value || '') ? number(Number.parseFloat(value)) : null
      const choice = (value, allowed) => allowed.includes(value) ? value : 'other'
      const rect = node => {
        const box = node?.getBoundingClientRect()
        return box ? [box.x, box.y, box.width, box.height].map(number) : null
      }
      const clearance = style => ['scrollMarginTop','scrollMarginRight','scrollMarginBottom','scrollMarginLeft'].map(key => pixels(style[key]))
      const box = node => {
        const style = getComputedStyle(node)
        return {rect: rect(node), scroll: [node.scrollLeft, node.scrollTop].map(number),
          client: [node.clientWidth, node.clientHeight].map(number),
          extent: [node.scrollWidth, node.scrollHeight].map(number),
          overflow: [style.overflowX, style.overflowY].map(value => choice(value, ['visible','hidden','clip','auto','scroll','overlay'])),
          position: choice(style.position, ['static','relative','absolute','fixed','sticky']),
          behavior: choice(style.scrollBehavior, ['auto','smooth']),
          snap: choice(style.scrollSnapType, ['none','x proximity','y proximity','both proximity','x mandatory','y mandatory','both mandatory']),
          padding: [pixels(style.scrollPaddingTop), pixels(style.scrollPaddingBottom)],
          clearance: clearance(style)}
      }
      const ancestors = []
      let ancestor = consent?.parentElement
      for (let depth = 0; ancestor && depth < 12; depth++, ancestor = ancestor.parentElement) {
        ancestors.push({depth, tag: choice(ancestor.tagName, ['LABEL','FORM','DIV','SECTION','MAIN','BODY','HTML']), ...box(ancestor)})
      }
      const body = getComputedStyle(document.body), navStyle = nav ? getComputedStyle(nav) : null
      const viewport = window.visualViewport
      return {available: true, clearance: consent ? clearance(getComputedStyle(consent)) : null,
        viewport: [window.innerWidth, window.innerHeight, viewport?.width, viewport?.height,
          viewport?.offsetLeft, viewport?.offsetTop].map(number),
        viewportScale: Number.isFinite(viewport?.scale) ? Math.round(viewport.scale * 100) / 100 : null,
        bodyPadding: [pixels(body.paddingTop), pixels(body.paddingBottom)],
        navHeightVariable: pixels(body.getPropertyValue('--ia222-bottom-height').trim()),
        nav: navStyle ? {rect: rect(nav), display: choice(navStyle.display, ['none','grid','flex','block']),
          visibility: choice(navStyle.visibility, ['visible','hidden','collapse'])} : null,
        root: box(document.documentElement), ancestors, ancestorLimitReached: Boolean(ancestor)}
    } catch { return {available: false} } // No raw style, DOM or error text.
  }
  const captureLayout = (kind, phase, event, snapshot) => {
    const target = event ? category(event.target) : null
    const selected = (kind === 'pointerdown' && phase === 'capture' && target === 'consent')
      || (kind === 'focusin' && target === 'consent')
      || (kind === 'pointerup' && phase === 'capture' && snapshot.activeTarget === 'consent')
      || (kind === 'scroll' && snapshot.activeTarget === 'consent')
      || (kind === 'scrollend' && snapshot.open)
    if (!selected) return
    if (layouts.length >= 8) { droppedLayouts++; return }
    layouts.push({row: entries.length - 1, kind, phase, scrollEnds, geometry: geometry()})
  }
  const record = (kind, phase, event) => {
    if (!active) return
    if (entries.length >= 120) { dropped++; return }
    const snapshot = state()
    entries.push({kind, phase, ms: number(performance.now() - began),
      ...(event ? {target: category(event.target), trusted: event.isTrusted === true,
        prevented: event.defaultPrevented === true,
        point: [event.clientX, event.clientY].map(number)} : {}),
      state: snapshot})
    captureLayout(kind, phase, event, snapshot)
  }
  const observer = new MutationObserver(() => record('mutation', 'observer'))
  const stop = () => {
    active = false
    for (const [type, listener, capture] of listeners) document.removeEventListener(type, listener, capture)
    observer.disconnect()
    delete window.__alchemyConsentProbe
    return {schemaVersion: 2, outcome: 'captured', entries, final: state(), dropped, droppedScroll,
      layouts, finalGeometry: geometry(), droppedLayouts, scrollEnds, scrollEndSupported: 'onscrollend' in document}
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
  const scrollend = event => {
    if (![document, document.documentElement, document.body].includes(event.target)) return
    scrollEnds++; record('scrollend', 'capture')
  }
  listeners.push(['scrollend', scrollend, true])
  document.addEventListener('scrollend', scrollend, {capture: true, passive: true})
  observer.observe(root, {subtree: true, childList: true, attributes: true,
    attributeFilter: ['disabled', 'checked', 'data-open', 'aria-pressed', 'hidden']})
  record('start', 'snapshot')
}

export async function withAlchemyConsentDiagnostics(page, {locale, denyReceiptStorage, expectedContact}, run) {
  let diagnostic = {schemaVersion: 2, outcome: 'unavailable'}
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
