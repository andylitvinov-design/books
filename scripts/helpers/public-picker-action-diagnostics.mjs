import { boundedBestEffort } from './browser-failure-evidence.mjs'

let nextProbeToken = 0

// Passive observation only. Never scroll/focus/click, change a value, cancel an
// event, retry an action, or replace the tested assertion with diagnostic state.
export function installPublicPickerActionProbe(target, { action, token }) {
  const doc = target.ownerDocument, win = doc.defaultView
  const registry = win.__hhPublicPickerActionRegistry ||= { closedThrough: 0, probes: new Map() }
  // A timed-out earlier installation must never replace a newer observer.
  // Closed-through is one bounded tombstone, not a retained list of IDs.
  if (token <= registry.closedThrough || registry.probes.has(token) || registry.probes.size >= 8) return false
  const picker = target.closest('[data-prelogin-test-picker]')
  const types = ['pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'focusin', 'focusout', 'scroll', 'scrollend']
  const startedAt = win.performance?.now()
  const events = [], listeners = [], counts = types.map(() => 0)
  let dropped = 0, observationErrors = 0, disposed = false, lease = null, probe
  const finite = value => typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(-1000000, Math.min(1000000, value)) * 10) / 10 : null
  const currentPicker = () => doc.querySelector('[data-prelogin-test-picker]')
  const currentTarget = root => action === 'collection-sexuality'
    ? root?.querySelector('[data-test-collection="sexuality"]')
    : root?.querySelector('[data-test-priority-selector] button')
  const contains = (node, child) => Boolean(node && child && node.contains(child))
  const alias = (node, root, control) => {
    if (!node) return 'none'
    if (contains(control, node)) return 'target'
    if (contains(target, node)) return 'original-target'
    if (node === root?.querySelector('#hh-test-hero-search')) return 'search'
    if (contains(root?.querySelector('[data-test-priority-selector]'), node)) return 'priority'
    if (contains(root?.querySelector('[data-test-topic-collections]'), node)) return 'collections'
    if (contains(doc.querySelector('.ia222-bottom-navigation, .mobile-bottom-navigation'), node)) return 'navigation'
    return contains(root, node) ? 'picker' : 'other'
  }
  const rect = node => {
    const box = node?.getBoundingClientRect()
    return box ? { x: finite(box.x), y: finite(box.y), width: finite(box.width), height: finite(box.height) } : null
  }
  const snapshot = (event = null, phase = 'snapshot') => {
    const root = currentPicker(), control = currentTarget(root), box = rect(control)
    // Correlation only: scroll/scrollend and geometry do not identify the cause
    // of a scroll. Visibility here is containment in the layout viewport, not
    // proof that a keyboard, dock or other overlay leaves the focus unobscured.
    const dock = doc.querySelector('.ia222-bottom-navigation, .mobile-bottom-navigation')
    const dockBox = rect(dock)
    const rawClearance = doc.body ? win.getComputedStyle(doc.body).getPropertyValue('--ia222-bottom-height').trim() : ''
    const dockClearance = /^-?(?:\d+(?:\.\d+)?|\.\d+)px$/.test(rawClearance) ? finite(Number(rawClearance.slice(0, -2))) : null
    const vv = win.visualViewport
    const visualViewport = vv ? { offsetTop: finite(vv.offsetTop), offsetLeft: finite(vv.offsetLeft), width: finite(vv.width), height: finite(vv.height) } : null
    const activeBox = rect(doc.activeElement)
    const validFocusGeometry = activeBox && Object.values(activeBox).every(value => typeof value === 'number' && Number.isFinite(value))
      && activeBox.width > 0 && activeBox.height > 0
      && Number.isFinite(win.innerWidth) && win.innerWidth > 0 && Number.isFinite(win.innerHeight) && win.innerHeight > 0
    const focusFullyVisible = validFocusGeometry ? activeBox.x >= 0 && activeBox.y >= 0 && activeBox.x + activeBox.width <= win.innerWidth && activeBox.y + activeBox.height <= win.innerHeight : null
    const now = win.performance?.now()
    const elapsedMs = typeof startedAt === 'number' && typeof now === 'number' ? finite(Math.max(0, now - startedAt)) : null
    const input = root?.querySelector('#hh-test-hero-search')
    const selected = Array.from(root?.querySelectorAll('[data-test-collection][aria-pressed="true"]') || [])
    const collection = selected.length > 1 ? 'multiple' : !selected.length ? 'none'
      : selected[0].getAttribute('data-test-collection') === 'sleep' ? 'sleep'
        : selected[0].getAttribute('data-test-collection') === 'sexuality' ? 'sexuality' : 'other'
    const pressed = control?.getAttribute('aria-pressed')
    const x = finite(event?.clientX), y = finite(event?.clientY)
    const hitX = x ?? (box && box.x + box.width / 2), hitY = y ?? (box && box.y + box.height / 2)
    const hit = hitX !== null && hitY !== null ? doc.elementFromPoint(hitX, hitY) : null
    return {
      elapsedMs, dockClearance, dockBox, visualViewport, focusFullyVisible,
      type: event ? types[types.indexOf(event.type)] || 'unknown' : 'snapshot', phase,
      trusted: event?.isTrusted === true, defaultPrevented: event?.defaultPrevented === true,
      target: alias(event?.target, root, control), focus: alias(doc.activeElement, root, control), hit: alias(hit, root, control),
      x, y, button: finite(event?.button), box, scrollX: finite(win.scrollX), scrollY: finite(win.scrollY),
      viewportWidth: finite(win.innerWidth), viewportHeight: finite(win.innerHeight), documentHeight: finite(doc.documentElement.scrollHeight),
      originalConnected: target.isConnected === true, pickerConnected: picker?.isConnected === true,
      sameTarget: control === target, samePicker: root === picker,
      pressed: pressed === 'true' ? true : pressed === 'false' ? false : null,
      depth: Array.from(root?.querySelectorAll('[data-test-priority-selector] button') || []).slice(0, 3)
        .reduce((mask, node, index) => mask | (node.getAttribute('aria-pressed') === 'true' ? 1 << index : 0), 0),
      collection, queryLength: typeof input?.value === 'string' ? Math.min(120, input.value.length) : null,
    }
  }
  const read = () => { try { return snapshot() } catch { observationErrors = Math.min(1000000, observationErrors + 1); return null } }
  const initial = read()
  const dispose = () => {
    if (disposed) return
    disposed = true
    if (lease !== null) win.clearTimeout(lease)
    for (const [type, listener, capture] of listeners) doc.removeEventListener(type, listener, capture)
    registry.closedThrough = Math.max(registry.closedThrough, token)
    if (registry.probes.get(token) === probe) registry.probes.delete(token)
  }
  probe = {
    read() { return { initial, current: read(), events: [...events], counts: [...counts], dropped, observationErrors } },
    dispose,
  }
  registry.probes.set(token, probe)
  for (const type of types) for (const capture of [true, false]) {
    const listener = event => {
      if (disposed) return
      counts[types.indexOf(type)] = Math.min(1000000, counts[types.indexOf(type)] + 1)
      try {
        const entry = snapshot(event, capture ? 'capture' : 'bubble')
        if (events.length === 64) { events.shift(); dropped = Math.min(1000000, dropped + 1) }
        events.push(entry)
      } catch { observationErrors = Math.min(1000000, observationErrors + 1) }
    }
    doc.addEventListener(type, listener, { capture, passive: true })
    listeners.push([type, listener, capture])
  }
  // If the page stops answering protocol requests, do not observe later work
  // indefinitely. Normal collection disposes immediately; this is a last resort.
  lease = win.setTimeout(dispose, 45000)
  return true
}

// Revalidate every field on the Node side: no labels, values, DOM IDs, URLs,
// messages, arbitrary object keys or search strings can reach the log sink.
export function sanitizePublicPickerActionDiagnostic(raw, { action, locale, result, setup, capture, cleanup, installed }) {
  const pick = (value, allowed, fallback = 'unknown') => allowed.includes(value) ? value : fallback
  const finite = value => typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(-1000000, Math.min(1000000, value)) * 10) / 10 : null
  const count = (value, max = 1000000) => Number.isInteger(value) && value >= 0 ? Math.min(max, value) : null
  const alias = value => pick(value, ['none', 'target', 'original-target', 'search', 'priority', 'collections', 'navigation', 'picker', 'other'])
  const record = value => {
    if (!value || typeof value !== 'object') return null
    const out = {
      type: pick(value.type, ['snapshot', 'pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'focusin', 'focusout', 'scroll', 'scrollend']),
      phase: pick(value.phase, ['snapshot', 'capture', 'bubble']),
      target: alias(value.target), focus: alias(value.focus), hit: alias(value.hit),
      pressed: value.pressed === true ? true : value.pressed === false ? false : null,
      depth: count(value.depth, 7), collection: pick(value.collection, ['none', 'sleep', 'sexuality', 'other', 'multiple']),
      queryLength: count(value.queryLength, 120), box: value.box ? {} : null,
      elapsedMs: typeof value.elapsedMs === 'number' && value.elapsedMs >= 0 ? finite(value.elapsedMs) : null,
      dockClearance: finite(value.dockClearance), dockBox: value.dockBox ? {} : null,
      visualViewport: value.visualViewport ? {} : null,
      focusFullyVisible: typeof value.focusFullyVisible === 'boolean' ? value.focusFullyVisible : null,
    }
    for (const key of ['trusted', 'defaultPrevented', 'originalConnected', 'pickerConnected', 'sameTarget', 'samePicker']) out[key] = value[key] === true
    for (const key of ['x', 'y', 'button', 'scrollX', 'scrollY', 'viewportWidth', 'viewportHeight', 'documentHeight']) out[key] = finite(value[key])
    if (out.box) for (const key of ['x', 'y', 'width', 'height']) out.box[key] = finite(value.box[key])
    if (out.dockBox) for (const key of ['x', 'y', 'width', 'height']) out.dockBox[key] = finite(value.dockBox[key])
    if (out.visualViewport) for (const key of ['offsetTop', 'offsetLeft', 'width', 'height']) out.visualViewport[key] = finite(value.visualViewport[key])
    return out
  }
  return {
    schema: 1, installed: installed === true, action: pick(action, ['depth-shorter', 'collection-sexuality']), locale: pick(locale, ['en', 'ru', 'es']),
    result: pick(result, ['passed', 'failed']), setup: pick(setup, ['completed', 'rejected', 'timed_out']),
    capture: pick(capture, ['completed', 'rejected', 'timed_out']),
    cleanup: pick(cleanup, ['completed', 'rejected', 'timed_out']),
    initial: record(raw?.initial), current: record(raw?.current),
    events: Array.isArray(raw?.events) ? raw.events.slice(-64).map(record) : [],
    counts: Array.isArray(raw?.counts) ? raw.counts.slice(0, 10).map(value => count(value)) : [],
    dropped: count(raw?.dropped), observationErrors: count(raw?.observationErrors),
  }
}

export async function withPublicPickerActionDiagnostics(page, target, options, operation, {
  log = console.error, timeoutMs = 1000,
} = {}) {
  const token = ++nextProbeToken
  let installed = false
  const setup = await boundedBestEffort(async () => {
    installed = await target.evaluate(installPublicPickerActionProbe, { action: options.action, token }) === true
  }, timeoutMs)
  let result = 'failed'
  try {
    const value = await operation() // Never bounded/retried: preserve the exact native action and assertion.
    result = 'passed'
    return value
  } finally {
    let raw
    const capture = await boundedBestEffort(async () => {
      raw = await page.evaluate(ownedToken => {
        const registry = window.__hhPublicPickerActionRegistry ||= { closedThrough: 0, probes: new Map() }
        registry.closedThrough = Math.max(registry.closedThrough, ownedToken)
        const probe = registry.probes.get(ownedToken)
        try { return probe?.read() || null }
        finally { try { probe?.dispose() } finally { registry.probes.delete(ownedToken) } }
      }, token)
    }, timeoutMs)
    const cleanup = capture === 'completed' ? 'completed' : await boundedBestEffort(() => page.evaluate(ownedToken => {
      const registry = window.__hhPublicPickerActionRegistry ||= { closedThrough: 0, probes: new Map() }
      registry.closedThrough = Math.max(registry.closedThrough, ownedToken)
      try { registry.probes.get(ownedToken)?.dispose() }
      finally { registry.probes.delete(ownedToken) }
    }, token), timeoutMs)
    try { log('PUBLIC_PICKER_ACTION_DIAGNOSTIC', JSON.stringify(sanitizePublicPickerActionDiagnostic(raw, { ...options, result, setup, capture, cleanup, installed }))) }
    catch { /* Diagnostics must not replace the original result/error. */ }
  }
}
