import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { sanitizePublicPickerActionDiagnostic, withPublicPickerActionDiagnostics } from '../scripts/helpers/public-picker-action-diagnostics.mjs'

function fixture(action = 'collection-sexuality') {
  const listeners = new Map(), trace = [], logs = [], leases = new Map()
  let nextLease = 0
  const node = (parent, attributes = {}) => ({ parent, attributes, isConnected: true,
    getAttribute(name) { return this.attributes[name] ?? null },
    contains(other) { for (let n = other; n; n = n.parent) if (n === this) return true; return false },
    closest(selector) { assert.equal(selector, '[data-prelogin-test-picker]'); return root },
    getBoundingClientRect() { return { x: 20, y: this.top ?? 200, width: 200, height: 40 } },
  })
  let root = node(null)
  const collections = node(root), priority = node(root), navigation = node(null), input = node(root)
  input.value = 'amor'
  const sleep = node(collections, { 'data-test-collection': 'sleep', 'aria-pressed': 'true' })
  let sexuality = node(collections, { 'data-test-collection': 'sexuality', 'aria-pressed': 'false' })
  let quick = node(priority, { 'aria-pressed': 'false' })
  const balanced = node(priority, { 'aria-pressed': 'true' }), deep = node(priority, { 'aria-pressed': 'false' })
  const configure = current => {
    current.querySelector = selector => {
      if (selector === '#hh-test-hero-search') return input
      if (selector === '[data-test-collection="sexuality"]') return sexuality
      if (selector === '[data-test-priority-selector] button') return quick
      if (selector === '[data-test-priority-selector]') return priority
      if (selector === '[data-test-topic-collections]') return collections
      throw new Error('Unexpected fixed selector')
    }
    current.querySelectorAll = selector => {
      if (selector === '[data-test-collection][aria-pressed="true"]') return [sleep, sexuality].filter(n => n.getAttribute('aria-pressed') === 'true')
      if (selector === '[data-test-priority-selector] button') return [quick, balanced, deep]
      throw new Error('Unexpected fixed selector')
    }
  }
  configure(root)
  const win = { scrollX: 0, scrollY: 0, innerWidth: 390, innerHeight: 844,
    setTimeout(callback, ms) { assert.equal(ms, 45000); const id = ++nextLease; leases.set(id, callback); return id },
    clearTimeout(id) { leases.delete(id) },
  }
  const doc = { defaultView: win, activeElement: input, documentElement: { scrollHeight: 2400 },
    querySelector(selector) {
      if (selector === '[data-prelogin-test-picker]') return root
      if (selector === '.ia222-bottom-navigation, .mobile-bottom-navigation') return navigation
      throw new Error('Unexpected document selector')
    },
    elementFromPoint() { return doc.hit },
    addEventListener(type, listener, options) {
      assert.deepEqual(options, { capture: options.capture, passive: true })
      const row = listeners.get(type) || []; row.push({ listener, capture: options.capture }); listeners.set(type, row)
    },
    removeEventListener(type, listener, capture) { listeners.set(type, (listeners.get(type) || []).filter(row => row.listener !== listener || row.capture !== capture)) },
  }
  const original = action === 'collection-sexuality' ? sexuality : quick
  original.ownerDocument = doc; sexuality.ownerDocument = doc; quick.ownerDocument = doc; doc.hit = original
  const target = { async evaluate(fn, options) { return fn(original, options) } }
  const page = { async evaluate(fn, argument) { return runInNewContext('(' + fn.toString() + ')(argument)', { window: win, argument }) } }
  const log = (label, data) => { assert.equal(label, 'PUBLIC_PICKER_ACTION_DIAGNOSTIC'); logs.push(JSON.parse(data)) }
  const emit = (type, eventTarget = original, update = () => {}) => {
    const event = { type, target: eventTarget, clientX: 30, clientY: 220, button: 0, isTrusted: true, defaultPrevented: false,
      preventDefault() { throw new Error('Observer must not cancel events') }, stopPropagation() { throw new Error('Observer must not stop propagation') } }
    for (const capture of [true, false]) {
      for (const row of listeners.get(type) || []) if (row.capture === capture) row.listener(event)
      if (capture) update()
    }
    trace.push(type)
  }
  const state = () => ({ input: input.value, quick: quick.getAttribute('aria-pressed'), balanced: balanced.getAttribute('aria-pressed'), sleep: sleep.getAttribute('aria-pressed'), sexuality: sexuality.getAttribute('aria-pressed'), scrollY: win.scrollY })
  const operation = async () => {
    trace.push('native-click')
    emit('pointerdown'); emit('pointerup')
    emit('click', original, () => {
      if (action === 'collection-sexuality') { input.value = ''; sleep.attributes['aria-pressed'] = 'false'; sexuality.attributes['aria-pressed'] = 'true' }
      else { quick.attributes['aria-pressed'] = 'true'; balanced.attributes['aria-pressed'] = 'false' }
    })
    trace.push('original-assertion')
    if (action === 'collection-sexuality') assert.equal(input.value, '')
    else assert.equal(quick.getAttribute('aria-pressed'), 'true')
    return 'original-result'
  }
  const remount = () => {
    root.isConnected = false; original.isConnected = false
    root = node(null); configure(root)
    if (action === 'collection-sexuality') sexuality = node(collections, { 'data-test-collection': 'sexuality', 'aria-pressed': 'false' })
    else quick = node(priority, { 'aria-pressed': 'false' })
  }
  return { page, target, options: { action, locale: action === 'collection-sexuality' ? 'es' : 'en' }, log, logs, emit, operation, state, trace, listeners, leases, win, doc, original, input, navigation, remount, quick, balanced,
    targetFor(nextAction) { return { async evaluate(fn, options) { return fn(nextAction === 'depth-shorter' ? quick : sexuality, options) } } },
  }
}
const probe = h => [...(h.win.__hhPublicPickerActionRegistry?.probes.values() || [])].at(-1)
const probeCount = h => h.win.__hhPublicPickerActionRegistry?.probes.size || 0
const activeListeners = h => [...h.listeners.values()].reduce((sum, rows) => sum + rows.length, 0)

for (const action of ['collection-sexuality', 'depth-shorter']) test(action + ' observer preserves baseline native action, assertion order, returned value and final state', async () => {
  const baseline = fixture(action), observed = fixture(action)
  const expected = await baseline.operation()
  const actual = await withPublicPickerActionDiagnostics(observed.page, observed.target, observed.options, observed.operation, { log: observed.log })
  assert.equal(actual, expected)
  assert.deepEqual(observed.trace, baseline.trace)
  assert.deepEqual(observed.state(), baseline.state())
  assert.equal(activeListeners(observed), 0)
  assert.equal(probeCount(observed), 0)
  assert.equal(observed.leases.size, 0)
  assert.equal(observed.logs.length, 1)
  const evidence = observed.logs[0]
  assert.equal(evidence.installed, true); assert.equal(evidence.result, 'passed'); assert.equal(evidence.setup, 'completed'); assert.equal(evidence.capture, 'completed')
  assert.equal(evidence.initial.pressed, false); assert.equal(evidence.current.pressed, true)
  assert.ok(evidence.events.some(event => event.type === 'click' && event.phase === 'capture' && event.pressed === false && event.trusted))
  assert.ok(evidence.events.some(event => event.type === 'click' && event.phase === 'bubble' && event.pressed === true && event.trusted))
  if (action === 'collection-sexuality') { assert.equal(evidence.initial.queryLength, 4); assert.equal(evidence.current.queryLength, 0); assert.equal(evidence.current.collection, 'sexuality') }
  else { assert.equal(evidence.initial.depth, 2); assert.equal(evidence.current.depth, 1) }
})

test('failed native collection delivery retains strict original assertion error and records the unchanged state, without retry', async () => {
  const h = fixture(), failure = new Error('synthetic private error must not be logged')
  let calls = 0
  await assert.rejects(withPublicPickerActionDiagnostics(h.page, h.target, h.options, async () => {
    calls++; h.emit('pointerdown'); h.emit('pointerup'); h.emit('click')
    assert.equal(h.input.value, 'amor'); throw failure
  }, { log: h.log }), error => error === failure)
  assert.equal(calls, 1); assert.equal(activeListeners(h), 0)
  const evidence = h.logs[0]
  assert.equal(evidence.result, 'failed'); assert.equal(evidence.current.queryLength, 4)
  assert.equal(evidence.current.pressed, false); assert.equal(evidence.current.collection, 'sleep')
  assert.equal(evidence.events.filter(event => event.type === 'click').length, 2)
  assert.ok(!JSON.stringify(evidence).includes('private error'))
})

test('passive evidence distinguishes wrong hit target, scroll movement, focus, reset and remount', async () => {
  const h = fixture()
  await withPublicPickerActionDiagnostics(h.page, h.target, h.options, async () => {
    h.win.scrollY = 410; h.original.top = 35; h.doc.hit = h.navigation; h.doc.activeElement = h.navigation
    h.emit('scroll', h.doc); h.emit('pointerdown', h.navigation)
    await h.operation()
    h.input.value = 'amor'; h.original.attributes['aria-pressed'] = 'false'
    h.emit('focusout'); h.remount()
  }, { log: h.log })
  const evidence = h.logs[0]
  assert.ok(evidence.events.some(event => event.type === 'pointerdown' && event.target === 'navigation' && event.hit === 'navigation' && event.focus === 'navigation' && event.scrollY === 410 && event.box.y === 35))
  assert.ok(evidence.events.some(event => event.type === 'click' && event.pressed === true))
  assert.equal(evidence.current.queryLength, 4); assert.equal(evidence.current.pressed, false)
  assert.equal(evidence.current.originalConnected, false); assert.equal(evidence.current.sameTarget, false)
  assert.equal(evidence.current.samePicker, false); assert.equal(activeListeners(h), 0)
})

test('event and scalar limits stay bounded during a scroll flood and leave no observer behind', async () => {
  const h = fixture()
  await withPublicPickerActionDiagnostics(h.page, h.target, h.options, async () => {
    for (let index = 0; index < 200; index++) h.emit('scroll')
    await h.operation()
  }, { log: h.log })
  assert.equal(h.logs[0].events.length, 64)
  assert.equal(h.logs[0].dropped, 342)
  assert.equal(h.logs[0].counts[8], 400)
  assert.equal(h.logs[0].events.at(-1).type, 'click')
  assert.equal(activeListeners(h), 0)
})

test('observer geometry errors remain visible without changing native outcomes', async () => {
  const h = fixture()
  h.original.getBoundingClientRect = () => { throw new Error('private DOM details') }
  assert.equal(await withPublicPickerActionDiagnostics(h.page, h.target, h.options, h.operation, { log: h.log }), 'original-result')
  assert.ok(h.logs[0].observationErrors > 0)
  assert.equal(h.logs[0].initial, null); assert.equal(h.logs[0].current, null)
  assert.equal(activeListeners(h), 0)
})

test('collection/read and log failures cannot mask the original tested exception or skip cleanup', async () => {
  for (const mode of ['read', 'log']) {
    const h = fixture(), failure = new Error('original operation failure')
    await assert.rejects(withPublicPickerActionDiagnostics(h.page, h.target, h.options, async () => {
      if (mode === 'read') probe(h).read = () => { throw new Error('raw private collection error') }
      throw failure
    }, { log: mode === 'log' ? () => { throw new Error('log failure') } : h.log }), error => error === failure)
    assert.equal(activeListeners(h), 0); assert.equal(probeCount(h), 0)
    if (mode === 'read') { assert.equal(h.logs[0].capture, 'rejected'); assert.equal(h.logs[0].result, 'failed'); assert.equal(h.logs[0].current, null) }
  }
})

test('a failed evidence read reports rejection but preserves a successful original operation', async () => {
  const h = fixture()
  assert.equal(await withPublicPickerActionDiagnostics(h.page, h.target, h.options, async () => {
    const result = await h.operation()
    probe(h).read = () => { throw new Error('private collector detail') }
    return result
  }, { log: h.log }), 'original-result')
  assert.equal(h.logs[0].result, 'passed'); assert.equal(h.logs[0].capture, 'rejected'); assert.equal(h.logs[0].cleanup, 'completed')
  assert.equal(activeListeners(h), 0); assert.equal(h.leases.size, 0)
})

test('bounded setup/capture failure does not retry, truncate or change original action', async () => {
  for (const phase of ['setup-reject', 'setup-timeout', 'capture-reject', 'capture-timeout']) {
    const h = fixture(), target = phase.startsWith('setup') ? { evaluate: () => phase.endsWith('reject') ? Promise.reject(new Error('private setup')) : new Promise(() => {}) } : h.target
    const page = phase.startsWith('capture') ? { evaluate: () => phase.endsWith('reject') ? Promise.reject(new Error('private capture')) : new Promise(() => {}) } : h.page
    let calls = 0
    assert.equal(await withPublicPickerActionDiagnostics(page, target, h.options, async () => { calls++; return 'unchanged' }, { log: h.log, timeoutMs: 5 }), 'unchanged')
    assert.equal(calls, 1)
    assert.equal(h.logs[0][phase.startsWith('setup') ? 'setup' : 'capture'], phase.endsWith('reject') ? 'rejected' : 'timed_out')
    if (phase.startsWith('capture')) {
      assert.equal(h.logs[0].cleanup, phase.endsWith('reject') ? 'rejected' : 'timed_out')
      assert.ok(activeListeners(h) > 0, 'Unreachable page cannot synchronously acknowledge disposal')
      for (const expire of [...h.leases.values()]) expire()
    }
    assert.equal(activeListeners(h), 0); assert.equal(h.leases.size, 0); assert.equal(probeCount(h), 0)
  }
})

test('late timed-out installation cannot replace a later action observer or mislabel its evidence', async () => {
  const h = fixture()
  let release
  const delayedTarget = { evaluate: (fn, options) => new Promise(resolve => { release = () => resolve(fn(h.original, options)) }) }
  assert.equal(await withPublicPickerActionDiagnostics(h.page, delayedTarget, h.options, async () => 'first', { log: h.log, timeoutMs: 5 }), 'first')
  assert.equal(h.logs[0].setup, 'timed_out'); assert.equal(h.logs[0].installed, false)
  assert.equal(h.logs[0].cleanup, 'completed'); assert.equal(probeCount(h), 0)
  const closed = h.win.__hhPublicPickerActionRegistry.closedThrough
  await withPublicPickerActionDiagnostics(h.page, h.targetFor('depth-shorter'), { action: 'depth-shorter', locale: 'en' }, async () => {
    const newer = probe(h)
    release(); await new Promise(resolve => setImmediate(resolve))
    assert.equal(probe(h), newer, 'A late install must not dispose or replace the newer probe')
    assert.equal(probeCount(h), 1); assert.equal(h.leases.size, 1)
    h.quick.attributes['aria-pressed'] = 'true'; h.balanced.attributes['aria-pressed'] = 'false'
  }, { log: h.log, timeoutMs: 5 })
  assert.equal(h.logs.length, 2); assert.equal(h.logs[1].action, 'depth-shorter')
  assert.equal(h.logs[1].initial.depth, 2); assert.equal(h.logs[1].current.depth, 1)
  assert.equal(h.logs[1].current.pressed, true); assert.equal(h.logs[1].current.sameTarget, true)
  assert.equal(probeCount(h), 0); assert.equal(h.leases.size, 0); assert.equal(activeListeners(h), 0)
  assert.ok(h.win.__hhPublicPickerActionRegistry.closedThrough > closed)
  assert.deepEqual(Object.keys(h.win.__hhPublicPickerActionRegistry).sort(), ['closedThrough', 'probes'])
  assert.ok(!JSON.stringify(h.logs).includes('token'))
})

test('delayed old capture and cleanup only dispose their own token, including same-action reinstallation', async () => {
  for (const nextAction of ['collection-sexuality', 'depth-shorter']) {
    const h = fixture(), pending = []
    const delayedPage = { evaluate: (fn, argument) => new Promise(resolve => { pending.push(() => h.page.evaluate(fn, argument).then(resolve)) }) }
    assert.equal(await withPublicPickerActionDiagnostics(delayedPage, h.target, h.options, async () => 'first', { log: h.log, timeoutMs: 5 }), 'first')
    assert.equal(h.logs[0].capture, 'timed_out'); assert.equal(h.logs[0].cleanup, 'timed_out')
    assert.equal(pending.length, 2); assert.equal(probeCount(h), 1)
    await withPublicPickerActionDiagnostics(h.page, h.targetFor(nextAction), { action: nextAction, locale: 'en' }, async () => {
      const newer = probe(h)
      assert.equal(probeCount(h), 2)
      await pending[0](); await pending[1]()
      assert.equal(probe(h), newer, 'Old capture/cleanup cannot read or dispose the newer probe')
      assert.equal(probeCount(h), 1); assert.equal(h.leases.size, 1)
      if (nextAction === 'depth-shorter') { h.quick.attributes['aria-pressed'] = 'true'; h.balanced.attributes['aria-pressed'] = 'false' }
      else await h.operation()
    }, { log: h.log, timeoutMs: 5 })
    assert.equal(h.logs[1].action, nextAction); assert.equal(h.logs[1].current.pressed, true)
    assert.equal(probeCount(h), 0); assert.equal(h.leases.size, 0); assert.equal(activeListeners(h), 0)
  }
})

test('redaction accepts only fixed aliases and numeric/boolean schema, never raw queries, DOM IDs, URLs or errors', () => {
  const privateText = 'SECRET amor https://private.invalid/person/real-client DOM-ID error-stack'
  const raw = { initial: { type: privateText, phase: privateText, target: privateText, focus: privateText, hit: privateText, collection: privateText, queryLength: privateText, depth: privateText,
    pressed: privateText, box: { x: Infinity, y: privateText, width: -1e12, height: 1e12 }, secret: privateText },
    current: { type: 'click', queryLength: 500, depth: 4, pressed: true, trusted: true, collection: 'sleep', x: 1e12 },
    events: Array(100).fill({ target: privateText, raw: privateText }), counts: Array(20).fill(1e12), dropped: 1e12, observationErrors: -1, raw: privateText }
  const safe = sanitizePublicPickerActionDiagnostic(raw, { action: privateText, locale: privateText, result: privateText, setup: privateText, capture: privateText, cleanup: privateText })
  assert.ok(!JSON.stringify(safe).includes('SECRET')); assert.ok(!JSON.stringify(safe).includes('https:')); assert.ok(!JSON.stringify(safe).includes('amor'))
  assert.equal(safe.action, 'unknown'); assert.equal(safe.initial.queryLength, null); assert.equal(safe.current.queryLength, 120)
  assert.equal(safe.events.length, 64); assert.equal(safe.counts.length, 10)
  assert.equal(safe.initial.box.x, null); assert.equal(safe.initial.box.width, -1000000); assert.equal(safe.current.x, 1000000)
})

test('collection caller wraps the unchanged native click, empty-search and pressed assertions in their original order', () => {
  const source = readFileSync(new URL('../scripts/helpers/public-discovery-verifier.mjs', import.meta.url), 'utf8')
  const operation = `      await root.locator('[data-test-collection="sexuality"]').click()\n      await expect(search).toHaveValue('')\n      await expect(root.locator('[data-test-collection="sexuality"]')).toHaveAttribute('aria-pressed', 'true')`
  assert.ok(source.includes(`await withPublicPickerActionDiagnostics(page, root.locator('[data-test-collection="sexuality"]'), { action: 'collection-sexuality', locale }, async () => {\n${operation}\n    })`))
  for (const contract of ['toEqual(expectedSearch)', 'readSelection(picker), preserved', 'assert.deepEqual(writes, []', 'toHaveURL(currentUrl)']) assert.ok(source.includes(contract))
  assert.doesNotMatch(source, /force:\s*true|dispatchEvent|\.fill\(''\)/)
})


test('relative time, scrollend, dock and viewport scalars observe movement without attributing its cause', async () => {
  const h = fixture()
  let time = 9000, clearance = '0px'
  h.win.performance = { now: () => time }
  h.doc.body = {}
  h.win.getComputedStyle = node => { assert.equal(node, h.doc.body); return { getPropertyValue: name => { assert.equal(name, '--ia222-bottom-height'); return clearance } } }
  h.win.visualViewport = { offsetTop: 0, offsetLeft: 0, width: 390, height: 844, secret: 'PRIVATE' }
  await withPublicPickerActionDiagnostics(h.page, h.target, h.options, async () => {
    time += 12.5; h.original.top = -19; h.doc.activeElement = h.original
    h.emit('pointerdown')
    time += 2; clearance = '69px'; h.win.scrollY = 350; h.original.top = 331
    h.emit('focusin'); h.emit('scroll')
    time += 8; h.emit('scrollend')
    await h.operation()
  }, { log: h.log })
  const d = h.logs[0], down = d.events.find(e => e.type === 'pointerdown'), end = d.events.find(e => e.type === 'scrollend')
  assert.equal(d.initial.elapsedMs, 0); assert.equal(d.initial.dockClearance, 0)
  assert.equal(down.elapsedMs, 12.5); assert.equal(down.focusFullyVisible, false)
  assert.equal(end.elapsedMs, 22.5); assert.equal(end.dockClearance, 69); assert.equal(end.focusFullyVisible, true)
  assert.deepEqual(end.dockBox, { x: 20, y: 200, width: 200, height: 40 })
  assert.deepEqual(end.visualViewport, { offsetTop: 0, offsetLeft: 0, width: 390, height: 844 })
  assert.equal(d.counts[9], 2); assert.equal(activeListeners(h), 0); assert.equal(h.leases.size, 0)
  assert.ok(!JSON.stringify(d).includes('PRIVATE'))
})

test('new observation fields reject hostile strings, nonfinite values and arbitrary nested keys', () => {
  const secret = 'SECRET https://private.invalid/client?token=private'
  const row = { elapsedMs: -2, dockClearance: secret, focusFullyVisible: secret,
    dockBox: { x: secret, y: NaN, width: Infinity, height: -Infinity, secret },
    visualViewport: { offsetTop: secret, offsetLeft: NaN, width: Infinity, height: secret, secret }, secret }
  const d = sanitizePublicPickerActionDiagnostic({ initial: row, current: { elapsedMs: Infinity }, events: [row] }, {})
  assert.equal(d.initial.elapsedMs, null); assert.equal(d.current.elapsedMs, null)
  assert.equal(d.initial.dockClearance, null); assert.equal(d.initial.focusFullyVisible, null)
  assert.deepEqual(d.initial.dockBox, { x: null, y: null, width: null, height: null })
  assert.deepEqual(d.initial.visualViewport, { offsetTop: null, offsetLeft: null, width: null, height: null })
  assert.ok(!JSON.stringify(d).includes('SECRET')); assert.ok(!JSON.stringify(d).includes('private'))
})

test('missing optional platform geometry yields unknown, not invented evidence', async () => {
  const h = fixture()
  await withPublicPickerActionDiagnostics(h.page, h.target, h.options, h.operation, { log: h.log })
  assert.equal(h.logs[0].initial.elapsedMs, null)
  assert.equal(h.logs[0].initial.visualViewport, null)
  assert.equal(h.logs[0].initial.dockClearance, null)
})


test('invalid or empty active-element geometry is unknown rather than falsely visible', async () => {
  for (const overrides of [{ x: NaN }, { y: Infinity }, { width: 0 }, { height: -1 }, { width: undefined }, { viewportWidth: 0 }, { viewportHeight: NaN }]) {
    const h = fixture()
    h.input.getBoundingClientRect = () => ({ x: 0, y: 0, width: 100, height: 20, ...overrides })
    if ('viewportWidth' in overrides) h.win.innerWidth = overrides.viewportWidth
    if ('viewportHeight' in overrides) h.win.innerHeight = overrides.viewportHeight
    await withPublicPickerActionDiagnostics(h.page, h.target, h.options, h.operation, { log: h.log })
    assert.equal(h.logs[0].initial.focusFullyVisible, null)
    assert.equal(h.logs[0].current.focusFullyVisible, null)
    assert.equal(activeListeners(h), 0)
  }
})
