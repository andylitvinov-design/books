import { randomUUID } from 'node:crypto'

// Synthetic first-click evidence only. Layout reads and streaming perturb timing;
// none of these observations implements Playwright's actionability algorithm.
export function installOporaNativeProbe({ owner, expiresAt }) {
  const key = '__hhOporaNativeProbe', prefix = 'HH_OPORA_NATIVE_ROW '
  if (typeof owner !== 'string' || !/^[a-f0-9-]{36}$/.test(owner)
    || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return false
  let active = false, stopped = false, recording = false, initializing = true
  let root, original, observer, nextId = 0, rows = 0, callbacks = 0, dropped = 0, cleanupFailures = 0
  const identities = new WeakMap(), listeners = [], timers = new Set(), frames = new Set()
  const began = performance.now()
  const bounded = value => Number.isFinite(value) && Math.abs(value) <= 65536 ? Math.round(value) : null
  const bump = value => Math.min(255, value + 1)
  const read = fn => { if (stopped) throw null; const value = fn(); if (stopped) throw null; return value }
  const id = node => {
    if (!node) return 0
    if (!identities.has(node)) { if (nextId >= 16) return 0; identities.set(node, ++nextId) }
    return identities.get(node)
  }
  const emit = value => { try { console.debug(prefix + JSON.stringify({ owner, ...value })) } catch { dropped = bump(dropped) } }
  const cleanup = () => {
    for (const [target, type, listener, capture] of listeners.splice(0)) {
      try { target.removeEventListener(type, listener, capture) } catch { cleanupFailures = bump(cleanupFailures) }
    }
    const current = observer; observer = null
    try { current?.disconnect() } catch { cleanupFailures = bump(cleanupFailures) }
    for (const timer of timers) { try { clearTimeout(timer) } catch { cleanupFailures = bump(cleanupFailures) } }
    timers.clear()
    for (const frame of frames) { try { cancelAnimationFrame(frame) } catch { cleanupFailures = bump(cleanupFailures) } }
    frames.clear()
    try { if (Object.getOwnPropertyDescriptor(window, key)?.value === owner) delete window[key] }
    catch { cleanupFailures = bump(cleanupFailures) }
  }
  const stop = reason => {
    if (stopped) return
    stopped = true; active = false
    cleanup()
    emit({ kind: 'stop', reason, order: ++rows, ms: bounded(performance.now() - began), dropped, cleanupFailures, setupPending: initializing })
  }
  const scope = () => read(() => window.top === window && location.origin === 'http://127.0.0.1:3100'
    && location.pathname === '/__hh-test__/opora-as56/ru' && !location.search && !location.hash
    && root.isConnected && root.ownerDocument === document && document.documentElement.lang === 'ru')
  const currentButton = () => {
    const buttons = read(() => root.querySelectorAll('footer button'))
    return { count: Math.min(3, buttons.length), node: buttons.length === 2 ? buttons[1] : null }
  }
  const category = (node, button) => {
    if (!node) return 'none'
    if (node === button || read(() => button?.contains(node))) return 'target'
    if (read(() => button?.parentElement?.contains(node))) return 'footer-other'
    return read(() => root.contains(node)) ? 'player-other' : 'outside'
  }
  const record = (kind, event, geometry = false) => {
    if (!active || stopped) return
    if (recording) { dropped = bump(dropped); return }
    if (++callbacks > 96 || rows >= 47) { stop('cap'); return }
    recording = true
    try {
      if (!scope()) { stop('scope'); return }
      const { count, node } = currentButton()
      const panel = read(() => root.querySelector('[data-opora-current-screen]'))
      const scene = read(() => panel?.getAttribute('data-opora-current-screen'))
      const state = { count, root: id(root), original: id(original), current: id(node),
        originalConnected: read(() => original.isConnected) === true, currentConnected: read(() => node?.isConnected) === true,
        disabled: node ? read(() => node.matches(':disabled')) === true : null,
        ariaDisabled: node ? read(() => node.getAttribute('aria-disabled')) === 'true' : null,
        inert: node ? Boolean(read(() => node.closest('[inert]'))) : null,
        scene: scene === 'arrive' ? 'initial' : scene == null ? 'missing' : 'changed' }
      let layout = null
      if (geometry && node) {
        const rect = read(() => node.getBoundingClientRect()), style = read(() => getComputedStyle(node))
        const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2
        const hit = read(() => document.elementFromPoint(x, y))
        layout = { rect: ['x','y','width','height'].map(k => bounded(rect[k])),
          viewport: [bounded(innerWidth), bounded(innerHeight)], scroll: [bounded(scrollX), bounded(scrollY)],
          displayNone: style.display === 'none', visibilityHidden: ['hidden','collapse'].includes(style.visibility),
          pointerNone: style.pointerEvents === 'none', hit: category(hit, node) }
      }
      const row = { kind, order: ++rows, ms: bounded(performance.now() - began), state, layout,
        target: event ? category(read(() => event.target), node) : 'none',
        trusted: event ? read(() => event.isTrusted) === true : null,
        prevented: event ? read(() => event.defaultPrevented) === true : null }
      if (!stopped) emit(row)
      if (state.scene === 'changed') stop('transition')
    } catch { stop('read-failed') } finally { recording = false }
  }
  const on = (target, type, listener, capture) => {
    if (stopped) return
    listeners.push([target, type, listener, capture])
    try { target.addEventListener(type, listener, { capture, passive: true }) }
    finally { if (stopped) { try { target.removeEventListener(type, listener, capture) } catch { cleanupFailures = bump(cleanupFailures) } } }
  }
  const frame = callback => {
    if (stopped) return
    let handle
    try { handle = requestAnimationFrame(() => { frames.delete(handle); if (!stopped) { try { callback() } catch { stop('read-failed') } } }) }
    catch { stop('read-failed'); return }
    if (stopped) cancelAnimationFrame(handle); else frames.add(handle)
  }
  const timer = (callback, delay) => {
    if (stopped) return
    let handle
    try { handle = setTimeout(() => { timers.delete(handle); if (!stopped) { try { callback() } catch { stop('read-failed') } } }, delay) }
    catch { stop('read-failed'); return }
    if (stopped) clearTimeout(handle); else timers.add(handle)
  }
  try {
    if (Object.getOwnPropertyDescriptor(window, key)) return false
    const roots = document.querySelectorAll('#opora-browser-root [data-opora-experience-first="as-5.6"]')
    if (roots.length !== 1) return false
    root = roots[0]
    if (!scope() || Date.now() > expiresAt) return false
    original = currentButton().node
    if (!original || original.textContent.trim() !== 'Продолжить'
      || root.querySelector('[data-opora-current-screen]')?.getAttribute('data-opora-current-screen') !== 'arrive') return false
    Object.defineProperty(window, key, { value: owner, configurable: true })
    for (const type of ['pointerdown','pointerup','pointercancel','mousedown','mouseup','click']) {
      for (const capture of [true, false]) on(document, type, event => record(type + (capture ? '-capture' : '-bubble'), event), capture)
    }
    on(window, 'pagehide', () => stop('pagehide'), false)
    const installed = new MutationObserver(() => record('mutation'))
    observer = installed
    try { if (!stopped) installed.observe(root, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['disabled','aria-disabled','inert','style','class','data-opora-current-screen'] }) }
    finally { if (stopped) installed.disconnect() }
    if (stopped || Date.now() > expiresAt) { stop('expired'); cleanup(); return false }
    initializing = false; active = true; record('start', null, true)
    // Ten finite frame samples, not continuous polling or an acceptance wait.
    for (const delay of [0, 1000, 3000, 7000, 12000]) timer(() => frame(() => {
      record('frame', null, true); frame(() => record('frame', null, true))
    }), delay)
    timer(() => stop('window'), 16000)
    return !stopped
  } catch { stop('install-failed'); return false }
}

const kinds = ['start','frame','mutation', ...['pointerdown','pointerup','pointercancel','mousedown','mouseup','click'].flatMap(k => [k+'-capture',k+'-bubble'])]
const choice = (v, values) => values.includes(v) ? v : 'unknown'
const integer = (v, limit = 65536) => Number.isInteger(v) && Math.abs(v) <= limit ? v : null
const bool = v => typeof v === 'boolean' ? v : null
const tuple = (v, n) => Array.isArray(v) && v.length === n ? v.map(x => integer(x)) : null
export function redactOporaNativeRow(v) {
  if (!v || typeof v !== 'object') return null
  const common = { order: integer(v.order,48), ms: integer(v.ms) }
  if (v.kind === 'stop') return { ...common, kind: 'stop', reason: choice(v.reason, ['cap','scope','transition','read-failed','pagehide','expired','window','install-failed']),
    dropped: integer(v.dropped,255), cleanupFailures: integer(v.cleanupFailures,255), setupPending: bool(v.setupPending) }
  if (!kinds.includes(v.kind)) return null
  const s = v.state || {}, l = v.layout
  return { ...common, kind: v.kind, target: choice(v.target,['none','target','footer-other','player-other','outside']), trusted: bool(v.trusted), prevented: bool(v.prevented),
    state: { count: integer(s.count,3), root: integer(s.root,16), original: integer(s.original,16), current: integer(s.current,16),
      originalConnected: bool(s.originalConnected), currentConnected: bool(s.currentConnected), disabled: bool(s.disabled), ariaDisabled: bool(s.ariaDisabled), inert: bool(s.inert),
      scene: choice(s.scene,['initial','missing','changed']) },
    layout: l && typeof l === 'object' ? { rect: tuple(l.rect,4), viewport: tuple(l.viewport,2), scroll: tuple(l.scroll,2), displayNone: bool(l.displayNone),
      visibilityHidden: bool(l.visibilityHidden), pointerNone: bool(l.pointerNone), hit: choice(l.hit,['none','target','footer-other','player-other','outside']) } : null }
}

export async function withOporaNativeClickDiagnostics(page, meta, run, emit = row => console.log('SYNTHETIC_OPORA_NATIVE_CLICK', JSON.stringify(row))) {
  if (meta.engine !== 'webkit' || meta.locale !== 'ru' || meta.width !== 320 || meta.priorHelp !== false) return await run()
  const owner = randomUUID(), rows = [], owned = [], lifecycle = []
  let active = true, callbacks = 0, omitted = 0, cleanupFailures = 0, setup = 'pending', accepted = false, timer
  const began = performance.now()
  const publish = phase => { try { emit({ schemaVersion: 1, phase, setup, accepted, rows: rows.slice(), lifecycle: lifecycle.slice(), omitted, cleanupFailures,
    elapsedMs: Math.min(65536, Math.round(performance.now() - began)), browserCleanupObserved: rows.some(r => r.kind === 'stop' && r.cleanupFailures === 0 && r.setupPending === false) }) } catch { /* Diagnostic output must not replace the native action result. */ } }
  const listen = (type, fn) => {
    owned.push([type, fn])
    try { page.on(type, fn) } catch { cleanupFailures = Math.min(255,cleanupFailures+1) }
    finally { if (!active) { try { page.off(type,fn) } catch { /* Best-effort removal after reentrant disposal; preserve the primary result. */ } } }
  }
  listen('console', message => {
    if (!active || callbacks++ >= 96 || rows.length >= 48) { omitted = Math.min(255,omitted+1); return }
    try {
      if (message.type() !== 'debug') return
      const text = message.text(), prefix = 'HH_OPORA_NATIVE_ROW '
      if (typeof text !== 'string' || text.length > 2048 || !text.startsWith(prefix)) return
      const value = JSON.parse(text.slice(prefix.length))
      if (value.owner !== owner) return
      const row = redactOporaNativeRow(value)
      if (active && row) rows.push(row)
    } catch { omitted = Math.min(255,omitted+1) }
  })
  for (const event of ['close','crash']) listen(event, () => { if (active && lifecycle.length < 4) lifecycle.push(event) })
  try {
    // Best effort only. A timed-out evaluation is not cancelled: the page-side
    // expiry/scene guards and self-expiry own late installation cleanup.
    setup = await Promise.race([
      Promise.resolve().then(() => page.evaluate(installOporaNativeProbe, { owner, expiresAt: Date.now() + 1000 }))
        .then(value => { if (setup === 'pending') accepted = value === true; return 'completed' }, () => 'rejected'),
      new Promise(resolve => { timer = setTimeout(() => resolve('timed_out'), 1000) }),
    ])
    clearTimeout(timer)
    publish('click-start')
    try { const result = await run(); publish('click-complete'); return result }
    catch (error) { publish('click-rejected'); throw error }
  } finally {
    clearTimeout(timer); active = false
    for (const [event, fn] of owned.splice(0)) { try { page.off(event,fn) } catch { cleanupFailures = Math.min(255,cleanupFailures+1) } }
    // Never query a failed page. Browser cleanup may remain unconfirmed until
    // its finite window/pagehide or the verifier's existing context closure.
    publish('host-detached')
  }
}
