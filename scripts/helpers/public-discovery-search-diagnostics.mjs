import { randomUUID } from 'node:crypto'
import { boundedBestEffort } from './browser-failure-evidence.mjs'

// Owned synthetic guest picker only. Passive observations perturb timing and do
// not establish click/scroll causality. Microtasks need not follow every handler.
// No acceptance wait, action retry, field/style/storage write or failure-page RPC.
export function installPublicDiscoverySearchProbe({ owner, locale }) {
  const key = '__hhPublicDiscoverySearchOwner', prefix = 'HH_PUBLIC_DISCOVERY_SEARCH_ROW '
  if (typeof owner !== 'string' || !/^[a-f0-9-]{36}$/.test(owner) || !['en','ru','es'].includes(locale)) return false
  const listeners = [], identities = new WeakMap()
  let root, observer, initialSelection, initialHost, initialPort, active = false, initializing = true, stopped = false, finishing = false
  let recording = false, emitting = false, nextIdentity = 0, count = 0, dropped = 0, cleanupFailures = 0
  let geometryCount = 0, scrollCount = 0, requestedClicks = 0, expectedSeen = false, requestedActivationSeen = false, lastState = null
  const expectedQuery = locale === 'ru' ? 'Любовь' : locale === 'es' ? 'amor' : 'Love'
  const expectedPath = locale === 'es' ? '/es/client/tests' : `/${locale}/client`
  const began = performance.now(), limit = 64
  const bump = value => Math.min(255, value + 1)
  const read = fn => {
    if (stopped || (!active && !initializing)) throw null
    const value = fn()
    if (stopped || (!active && !initializing)) throw null
    return value
  }
  const number = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 65536 ? Math.round(value) : null
  const identity = node => {
    if (!node) return 0
    if (identities.has(node)) return identities.get(node)
    if (nextIdentity >= 32) return 0
    identities.set(node, ++nextIdentity); return nextIdentity
  }
  const query = selector => read(() => root.querySelector(selector))
  const nodes = () => ({ input: query('#hh-test-hero-search'), prior: query('[data-test-collection="sleep"]'),
    requested: query('[data-test-collection="sexuality"]'), results: query('#hh-simple-recommendations') })
  const attr = (node, name) => node ? read(() => node.getAttribute(name)) : null
  const connected = node => node ? read(() => node.isConnected) === true : false
  const pressed = node => { const value = attr(node, 'aria-pressed'); return value === 'true' ? true : value === 'false' ? false : null }
  const selection = () => {
    const selected = read(() => root.querySelectorAll('[data-public-selected-tests] [data-selected-test-key]'))
    const length = read(() => selected.length)
    if (length > 16) return null
    const keys = []
    for (let i = 0; i < length; i++) {
      const value = attr(read(() => selected[i]), 'data-selected-test-key')
      if (typeof value !== 'string' || value.length > 96) return null
      keys.push(value)
    }
    return keys // Ephemeral equality only: no keys cross the page boundary.
  }
  const category = (target, current) => {
    if (!target) return 'none'
    if (target === document || target === window) return 'document'
    if (!read(() => root.contains(target))) return 'outside'
    if (target === current.input) return 'search'
    const card = read(() => target.closest?.('[data-test-collection]'))
    if (current.requested && card === current.requested) return 'requested'
    if (current.prior && card === current.prior) return 'prior'
    if (card) return 'other-collection'
    if (read(() => current.input?.closest('form')?.contains(target))) return 'search-form'
    return read(() => current.results?.contains(target)) ? 'results' : 'picker-other'
  }
  const scope = () => connected(root) && read(() => root.ownerDocument) === document
    && attr(root, 'data-public-test-picker') === 'true' && attr(root, 'data-account-test-picker') === null
    && read(() => window.top) === window && read(() => window.location.protocol) === 'http:'
    && read(() => window.location.hostname) === initialHost && read(() => window.location.port) === initialPort
    && read(() => window.location.pathname) === expectedPath
    && read(() => document.querySelector('[data-prelogin-test-picker][data-public-test-picker="true"]')) === root
  const snapshot = current => {
    const value = current.input ? read(() => current.input.value) : null, selected = selection()
    return { query: typeof value !== 'string' ? 'missing' : value === '' ? 'empty' : value === expectedQuery ? 'expected' : 'other',
      priorActive: pressed(current.prior), requestedActive: pressed(current.requested),
      selectionUnchanged: initialSelection && selected ? initialSelection.length === selected.length && initialSelection.every((key, i) => key === selected[i]) : null,
      selectedCount: selected ? selected.length : null,
      summaryPresent: Boolean(query('#hh-simple-recommendations > p[role="status"]')),
      root: identity(root), input: identity(current.input), prior: identity(current.prior), requested: identity(current.requested),
      rootConnected: connected(root), inputConnected: connected(current.input), priorConnected: connected(current.prior), requestedConnected: connected(current.requested) }
  }
  const geometry = current => {
    const rect = node => {
      if (!node) return null
      const value = read(() => node.getBoundingClientRect())
      return ['x','y','width','height'].map(name => number(read(() => value[name])))
    }
    return { requested: rect(current.requested), input: rect(current.input),
      scroll: [number(read(() => window.scrollX)), number(read(() => window.scrollY))],
      viewport: [number(read(() => window.innerWidth)), number(read(() => window.innerHeight))] }
  }
  const stream = row => {
    if (emitting) { dropped = bump(dropped); return }
    emitting = true
    try { console.debug(prefix + JSON.stringify(row)) } catch { dropped = bump(dropped) }
    finally { emitting = false }
  }
  const cleanup = () => {
    const owned = listeners.splice(0)
    for (const [target, type, listener, capture] of owned) {
      try { target.removeEventListener(type, listener, capture) } catch { cleanupFailures = bump(cleanupFailures) }
    }
    const installed = observer; observer = null
    try { installed?.disconnect() } catch { cleanupFailures = bump(cleanupFailures) }
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window, key)
      if (descriptor?.value === owner) delete window[key]
    } catch { cleanupFailures = bump(cleanupFailures) }
  }
  const finish = reason => {
    if (stopped || finishing) return
    const setupPending = initializing // Later registration cleanup is not yet confirmed.
    finishing = true; stopped = true; active = false; initializing = false
    cleanup() // Lock before callbacks; no DOM read or arbitrary global callback.
    if (count < limit) stream({ kind: 'stop', phase: 'lifecycle', order: ++count, reason,
      state: lastState, dropped, cleanupFailures, setupPending, requestedClicks })
  }
  const record = (kind, phase, event) => {
    if (!active || stopped) return
    if (recording || emitting) { dropped = bump(dropped); return }
    if (count >= limit - 1) { finish('cap'); return } // Includes final row, before any getters.
    recording = true
    try {
      if (!scope()) { finish('scope'); return }
      const current = nodes(), state = snapshot(current)
      if (!active || stopped) return
      const target = event ? category(read(() => event.target), current) : 'none'
      const trusted = event ? read(() => event.isTrusted) === true : null
      const prevented = event ? read(() => event.defaultPrevented) === true : null
      if (kind === 'click' && phase === 'capture' && target === 'requested') requestedClicks = Math.min(2, requestedClicks + 1)
      if (state.query === 'expected') expectedSeen = true
      if (requestedClicks > 0 && phase !== 'capture' && state.requestedActive === true) requestedActivationSeen = true
      let layout = null
      if (geometryCount < 8 && ['start','pointerdown','pointerup','click','submit','scroll'].includes(kind) && phase !== 'bubble') {
        geometryCount++; layout = geometry(current)
      }
      if (!active || stopped) return
      lastState = state
      stream({ kind, phase, order: ++count, ms: number(performance.now() - began), target, trusted, prevented,
        state, geometry: layout, requestedClicks })
      // The first reset can be transient. Keep recording through the unchanged
      // acceptance assertions until the existing second card click clears it.
      if (active && expectedSeen && requestedActivationSeen && phase !== 'capture' && requestedClicks === 2 && state.requestedActive === false && state.query === 'empty') finish('second-clear')
    } catch { if (!stopped) finish('observation') } finally { recording = false }
  }
  const on = (target, type, listener, capture = true) => {
    if (stopped) return
    listeners.push([target, type, listener, capture])
    try { target.addEventListener(type, listener, { capture, passive: true }) }
    finally { if (stopped) { try { target.removeEventListener(type, listener, capture) } catch { cleanupFailures = bump(cleanupFailures) } } }
  }
  try {
    if (Object.getOwnPropertyDescriptor(window, key)) return false
    Object.defineProperty(window, key, { value: owner, writable: false, enumerable: false, configurable: true })
    if (window.top !== window || window.location.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(window.location.hostname)
      || !window.location.port || window.location.pathname !== expectedPath) { finish('install-rejected'); return false }
    const roots = document.querySelectorAll('[data-prelogin-test-picker][data-public-test-picker="true"]')
    if (roots.length !== 1) { finish('install-rejected'); return false }
    root = roots[0]
    initialHost = window.location.hostname; initialPort = window.location.port
    const current = nodes()
    // Also guards a late installation after its host timeout: never attach to
    // an already-submitted search or a later/different collection phase.
    if (!scope() || attr(root, 'data-account-test-picker') !== null || !current.input
      || read(() => current.input.value) !== '' || pressed(current.prior) !== true || pressed(current.requested) !== false
      || attr(query('[data-test-topic-collections]'), 'data-expanded') !== 'true'
      || query('#hh-simple-recommendations > p[role="status"]')) { finish('install-rejected'); return false }
    initialSelection = selection()
    for (const type of ['pointerdown','pointerup','pointercancel','mousedown','mouseup','click','submit','input','change','focusin','focusout']) {
      for (const capture of [true, false]) on(document, type, event => {
        record(type, capture ? 'capture' : 'bubble', event)
        if (active && !stopped && capture && ['click','submit','input','change'].includes(type) && count < limit - 1)
          queueMicrotask(() => record(type, 'microtask', event))
      }, capture)
    }
    on(document, 'scroll', () => {
      if (!active || stopped) return
      if (scrollCount >= 4) { dropped = bump(dropped); return }
      scrollCount++; record('scroll', 'capture')
    })
    on(window, 'pagehide', () => finish('pagehide'))
    if (stopped) return false
    const installingObserver = new MutationObserver(() => record('mutation', 'observer'))
    observer = installingObserver
    try {
      if (!stopped) installingObserver.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed','value'] })
    } finally {
      // Like event registration, observe may complete after reentrant teardown.
      // Keep the local owner even if cleanup already cleared the shared slot.
      if (stopped) { try { installingObserver.disconnect() } catch { cleanupFailures = bump(cleanupFailures) } }
    }
    initializing = false
    if (stopped) { cleanup(); return false }
    active = true; record('start', 'snapshot')
    return !stopped
  } catch { finish('install-failed'); return false }
}

const kinds = ['start','stop','pointerdown','pointerup','pointercancel','mousedown','mouseup','click','submit','input','change','focusin','focusout','scroll','mutation']
const phases = ['snapshot','capture','bubble','microtask','observer','lifecycle']
const targets = ['none','document','outside','search','requested','prior','other-collection','search-form','results','picker-other']
const choice = (value, allowed) => allowed.includes(value) ? value : 'other'
const boolean = value => typeof value === 'boolean' ? value : null
const integer = (value, max = 65536) => Number.isInteger(value) && Math.abs(value) <= max ? value : null
const natural = (value, max) => integer(value, max) !== null && value >= 0 ? value : null
const vector = (value, count) => Array.isArray(value) && value.length === count ? value.map(item => integer(item)) : null
export function redactPublicDiscoverySearchRow(value) {
  try {
    if (!value || !kinds.includes(value.kind) || !phases.includes(value.phase)) return null
    const state = value.state
    return { kind: value.kind, phase: value.phase, order: natural(value.order, 64), ms: integer(value.ms),
      target: choice(value.target, targets), trusted: boolean(value.trusted), prevented: boolean(value.prevented),
      requestedClicks: natural(value.requestedClicks, 2), reason: choice(value.reason, ['second-clear','pagehide','scope','cap','observation','install-rejected','install-failed']),
      dropped: natural(value.dropped, 255), cleanupFailures: natural(value.cleanupFailures, 255), setupPending: boolean(value.setupPending),
      state: state ? { query: choice(state.query, ['missing','empty','expected','other']), priorActive: boolean(state.priorActive), requestedActive: boolean(state.requestedActive),
        selectionUnchanged: boolean(state.selectionUnchanged), selectedCount: natural(state.selectedCount, 16), summaryPresent: boolean(state.summaryPresent),
        root: natural(state.root, 32), input: natural(state.input, 32), prior: natural(state.prior, 32), requested: natural(state.requested, 32),
        rootConnected: boolean(state.rootConnected), inputConnected: boolean(state.inputConnected), priorConnected: boolean(state.priorConnected), requestedConnected: boolean(state.requestedConnected) } : null,
      geometry: value.geometry ? { requested: vector(value.geometry.requested, 4), input: vector(value.geometry.input, 4),
        scroll: vector(value.geometry.scroll, 2), viewport: vector(value.geometry.viewport, 2) } : null }
  } catch { return null }
}

export function createPublicDiscoverySearchCollector(page, locale, emit = record => console.log('SYNTHETIC_PUBLIC_DISCOVERY_SEARCH', JSON.stringify(record))) {
  const rows = [], owned = [], prefix = 'HH_PUBLIC_DISCOVERY_SEARCH_ROW '
  let active = true, observing = false, emitting = false, installed = false, pending = true, attaching = true
  let installOutcome = 'unavailable', callbacks = 0, omitted = 0, readFailures = 0, pageErrors = 0, cleanupFailures = 0, pageClosed = false, attachFailures = 0
  const bump = value => Math.min(255, value + 1)
  const publish = () => {
    if (emitting) return
    emitting = true
    try { emit({ schemaVersion: 1, locale: choice(locale, ['en','ru','es']), installOutcome, installed,
      rows: installed ? rows.map(row => redactPublicDiscoverySearchRow(row)) : [], pageErrors,
      browserStopObserved: installed && rows.some(row => row.kind === 'stop'), pageClosed, omitted, readFailures, cleanupFailures,
      attachFailures, hostListenersComplete: attachFailures === 0 }) }
    catch { /* Output cannot replace the original result. */ }
  }
  const dispose = () => {
    if (!active) return
    active = false
    for (const [event, listener] of owned.splice(0)) { try { page.off(event, listener) } catch { cleanupFailures = bump(cleanupFailures) } }
    if (!attaching) publish()
  }
  const consoleListener = message => {
    if (!active || (!installed && !pending)) return
    if (observing || callbacks >= 128 || rows.length >= 64) { omitted = bump(omitted); return }
    callbacks++; observing = true
    try {
      const type = message.type()
      if (!active || type !== 'debug') return
      const text = message.text()
      if (!active || typeof text !== 'string' || text.length > 4096 || !text.startsWith(prefix)) return
      const row = redactPublicDiscoverySearchRow(JSON.parse(text.slice(prefix.length)))
      if (active && row && rows.length < 64) rows.push(row)
    } catch { if (active) readFailures = bump(readFailures) } finally { observing = false }
  }
  const pageErrorListener = () => { if (active) pageErrors = Math.min(8, pageErrors + 1) } // Never inspect the error argument.
  const closeListener = () => { if (active) { pageClosed = true; dispose() } }
  for (const [event, listener] of [['console', consoleListener], ['pageerror', pageErrorListener], ['close', closeListener]]) {
    if (!active) break
    owned.push([event, listener])
    try { page.on(event, listener) } catch { attachFailures = bump(attachFailures) /* A partial registration remains owned. */ }
    finally { if (!active) { try { page.off(event, listener) } catch { cleanupFailures = bump(cleanupFailures) } } }
  }
  attaching = false
  if (!active) publish()
  return { dispose, isActive: () => active, installation(outcome, accepted) {
    if (!active || !pending) return
    pending = false; installOutcome = choice(outcome, ['completed','rejected','timed_out'])
    installed = outcome === 'completed' && accepted === true
    if (!installed) rows.length = 0
  } }
}

export async function beginPublicDiscoverySearchDiagnostics(page, locale) {
  const collector = createPublicDiscoverySearchCollector(page, locale)
  let installed = false
  if (!collector.isActive()) return collector
  const outcome = await boundedBestEffort(async () => {
    if (!collector.isActive()) return
    installed = await page.evaluate(installPublicDiscoverySearchProbe, { owner: randomUUID(), locale })
  }, 1000)
  collector.installation(outcome, installed)
  // On failure dispose is Node-only. Success later navigates/closes the owned
  // guest context; failure already propagates to the caller's browser.close.
  return collector
}
