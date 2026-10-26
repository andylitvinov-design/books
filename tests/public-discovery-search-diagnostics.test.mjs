import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { installPublicDiscoverySearchProbe, redactPublicDiscoverySearchRow,
  createPublicDiscoverySearchCollector, beginPublicDiscoverySearchDiagnostics } from '../scripts/helpers/public-discovery-search-diagnostics.mjs'

const owner = '01234567-89ab-cdef-0123-456789abcdef'
const slot = '__hhPublicDiscoverySearchOwner', prefix = 'HH_PUBLIC_DISCOVERY_SEARCH_ROW '
const source = readFileSync(new URL('../scripts/helpers/public-discovery-search-diagnostics.mjs', import.meta.url), 'utf8')
const helper = readFileSync(new URL('../scripts/helpers/public-discovery-verifier.mjs', import.meta.url), 'utf8')
const plain = value => JSON.parse(JSON.stringify(value))
function browserFixture(options = {}) {
  const listeners = new Map(), packets = [], microtasks = [], observers = []
  let reads = 0, actionCalls = 0, now = 0, adds = 0, removes = 0, consoleHook
  const countRead = fn => { reads++; return fn() }
  const eventTarget = name => ({ name,
    addEventListener(type, listener, flags) {
      adds++; assert.deepEqual(plain(flags), { capture: flags.capture, passive: true })
      if (options.onAdd) options.onAdd({ target: this, type, listener, flags, adds })
      const list = listeners.get(this) || []; list.push({ type, listener, capture: flags.capture }); listeners.set(this, list)
      if (options.failAdd === adds) throw new Error('synthetic partial add')
    },
    removeEventListener(type, listener, capture) {
      removes++
      if (options.onRemove) options.onRemove({ target: this, type, listener, capture })
      listeners.set(this, (listeners.get(this) || []).filter(row => row.type !== type || row.listener !== listener || row.capture !== capture))
    },
  })
  const document = eventTarget('document'), window = eventTarget('window')
  const node = (name, attributes = {}) => ({ name, attributes, isConnected: true, ownerDocument: document,
    getAttribute(key) { return countRead(() => Object.hasOwn(this.attributes, key) ? this.attributes[key] : null) },
    contains(target) { return countRead(() => this === target || target?.parent === this || this === root && [input, prior, requested, form, results, summary, selected, child].includes(target)) },
    closest(selector) { return countRead(() => selector === '[data-test-collection]' ? this === child ? requested : [prior,requested].includes(this) ? this : null : selector === 'form' ? this === input ? form : null : null) },
    getBoundingClientRect() { return countRead(() => ({ x: 24, y: 200, width: 160, height: 58 })) },
    click() { actionCalls++; throw Error('observer action forbidden') },
    focus() { actionCalls++; throw Error('observer focus forbidden') },
    scrollIntoView() { actionCalls++; throw Error('observer scroll forbidden') },
    setAttribute() { actionCalls++; throw Error('observer DOM write forbidden') },
  })
  const root = node('root', { 'data-public-test-picker': 'true' }), collections = node('collections', { 'data-expanded': 'true' })
  let input = node('input'), prior = node('prior', { 'aria-pressed': 'true' }), requested = node('requested', { 'aria-pressed': 'false' })
  const form = node('form'), results = node('results'), summary = node('summary'), child = node('requested-child')
  let selected = node('selected', { 'data-selected-test-key': 'synthetic-selection' }), queryValue = '', summaryVisible = false
  Object.defineProperty(input, 'value', { configurable: true, get: () => countRead(() => queryValue), set: () => { actionCalls++; throw Error('observer input write forbidden') } })
  const selectors = () => ({ '#hh-test-hero-search': input, '[data-test-collection="sleep"]': prior,
    '[data-test-collection="sexuality"]': requested, '#hh-simple-recommendations': results,
    '#hh-simple-recommendations > p[role="status"]': summaryVisible ? summary : null,
    '[data-test-topic-collections]': collections })
  root.querySelector = selector => countRead(() => selectors()[selector] || null)
  root.querySelectorAll = selector => countRead(() => {
    assert.equal(selector, '[data-public-selected-tests] [data-selected-test-key]')
    return options.selectionOverflow ? Array(17).fill(selected) : [selected]
  })
  const rootSelector = '[data-prelogin-test-picker][data-public-test-picker="true"]'
  document.querySelector = selector => countRead(() => { assert.equal(selector, rootSelector); return options.replacedRoot ? null : root })
  document.querySelectorAll = selector => countRead(() => { assert.equal(selector, rootSelector); return options.rootCount === 0 ? [] : options.rootCount === 2 ? [root,root] : [root] })
  window.top = options.frame ? {} : window
  window.location = { protocol: 'http:', hostname: '127.0.0.1', port: '3100', pathname: '/en/client', ...options.location }
  window.scrollX = 0; window.scrollY = 150; window.innerWidth = 390; window.innerHeight = 844
  Object.defineProperties(window, {
    localStorage: { get() { throw Error('storage read forbidden') } },
    sessionStorage: { get() { throw Error('storage read forbidden') } },
  })
  if (options.account) root.attributes['data-account-test-picker'] = 'true'
  if (options.query) queryValue = options.query
  if (options.priorInactive) prior.attributes['aria-pressed'] = 'false'
  if (options.requestedActive) requested.attributes['aria-pressed'] = 'true'
  if (options.collapsed) collections.attributes['data-expanded'] = 'false'
  if (options.summary) summaryVisible = true
  if (options.foreign) Object.defineProperty(window, slot, options.foreign)
  const context = { window, document, console: { debug(text) {
    assert.equal(typeof text, 'string'); assert.ok(text.startsWith(prefix))
    packets.push(JSON.parse(text.slice(prefix.length))); consoleHook?.()
  } }, performance: { now: () => ++now }, queueMicrotask: fn => microtasks.push(fn),
  MutationObserver: class {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); options.onConstruct?.() }
    observe(target, config) { assert.equal(target, root); this.config = plain(config); options.onObserve?.(); if (options.lateObserve) this.disconnected = false; if (options.failObserve) throw Error('synthetic partial observe') }
    disconnect() { this.disconnected = true; options.onDisconnect?.() }
  } }
  const install = vm.runInNewContext('(' + installPublicDiscoverySearchProbe.toString() + ')', context)
  const emit = (type, target = requested, extra = {}, phase = null) => {
    const event = { target, isTrusted: true, defaultPrevented: false, ...extra }
    for (const capture of [true, false]) {
      if (phase && phase !== (capture ? 'capture' : 'bubble')) continue
      for (const row of [...(listeners.get(document) || [])]) if (row.type === type && row.capture === capture) row.listener(event)
    }
  }
  const pagehide = () => { for (const row of [...(listeners.get(window) || [])]) if (row.type === 'pagehide') row.listener({}) }
  const mutate = () => { for (const observer of observers) if (!observer.disconnected) observer.callback([{ type: 'attributes' }]) }
  const flush = () => { for (let i = 0; microtasks.length && i < 100; i++) microtasks.shift()(); assert.equal(microtasks.length, 0) }
  return { window, document, root, collections, packets, install: (meta = { owner, locale: 'en' }) => install(meta), emit, pagehide, mutate, flush,
    requested: () => requested, prior: () => prior, input: () => input, child,
    query(value) { queryValue = value }, summary(value) { summaryVisible = value },
    select(value) { selected.attributes['data-selected-test-key'] = value },
    replaceInput() { const old = input; old.isConnected = false; input = node('replacement-input'); Object.defineProperty(input, 'value', { get: () => queryValue }); return old },
    consoleHook(fn) { consoleHook = fn }, reads: () => reads, actions: () => actionCalls,
    listenerCount: () => [...listeners.values()].reduce((sum, rows) => sum + rows.length, 0),
    disconnected: () => observers.every(observer => observer.disconnected), adds: () => adds, removes: () => removes }
}
const queryRows = fixture => fixture.packets.filter(row => row.state).map(row => row.state.query)
const clean = fixture => { assert.equal(fixture.listenerCount(), 0); assert.equal(fixture.disconnected(), true); assert.equal(Object.hasOwn(fixture.window, slot), false); assert.equal(fixture.actions(), 0) }

for (const locale of ['en','ru','es']) test(locale + ' passive sequence keeps first reset and late overwrite observable until existing second clear', () => {
  const f = browserFixture({ location: { pathname: locale === 'es' ? '/es/client/tests' : `/${locale}/client` } })
  assert.equal(f.install({ owner, locale }), true)
  const descriptor = Object.getOwnPropertyDescriptor(f.window, slot)
  assert.equal(typeof descriptor.value, 'string'); assert.equal(descriptor.writable, false)
  const expected = locale === 'ru' ? 'Любовь' : locale === 'es' ? 'amor' : 'Love'
  f.query(expected); f.summary(true); f.emit('input', f.input()); f.flush(); f.emit('submit', f.input()); f.flush()
  f.emit('pointerdown', f.child); f.emit('pointerup', f.child)
  f.emit('click', f.child, {}, 'capture')
  f.requested().attributes['aria-pressed'] = 'true'; f.prior().attributes['aria-pressed'] = 'false'; f.query(''); f.summary(false)
  f.emit('click', f.child, {}, 'bubble'); f.mutate(); f.flush()
  assert.ok(f.listenerCount() > 0, 'A transient first reset cannot end observation')
  f.query(expected); f.summary(true); f.emit('change', f.input()); f.flush()
  assert.equal(queryRows(f).at(-1), 'expected', 'Late input overwrite remains visible')
  f.query(''); f.summary(false); f.emit('input', f.input()); f.flush()
  f.emit('click', f.requested(), {}, 'capture'); f.requested().attributes['aria-pressed'] = 'false'; f.emit('click', f.requested(), {}, 'bubble'); f.flush()
  assert.equal(f.packets.at(-1).reason, 'second-clear'); clean(f)
  assert.ok(f.packets.some(row => row.kind === 'click' && row.target === 'requested' && row.trusted === true))
  assert.ok(f.packets.every(row => !row.state || row.state.selectionUnchanged === true))
  assert.ok(f.packets.filter(row => row.geometry).length <= 8)
  const output = JSON.stringify(f.packets)
  for (const secret of [expected, 'synthetic-selection', owner, '/en/client', '/ru/client', '/es/client/tests']) assert.ok(!output.includes(secret))
})

test('wrong native target does not manufacture requested click or reset evidence', () => {
  const f = browserFixture(); f.install(); f.query('Love'); f.emit('input', f.input()); f.flush()
  f.emit('click', f.input(), { isTrusted: true, defaultPrevented: true }); f.flush()
  assert.equal(f.packets.at(-1).target, 'search'); assert.equal(f.packets.at(-1).prevented, true)
  assert.equal(f.packets.at(-1).requestedClicks, 0); assert.equal(f.packets.at(-1).state.query, 'expected')
  f.pagehide(); clean(f)
})

test('replaced input gets a new bounded identity without exporting values or selected keys', () => {
  const f = browserFixture(); f.install(); const initial = f.packets[0].state.input
  f.query('PRIVATE_RAW_QUERY'); f.select('PRIVATE_SELECTED_KEY'); f.replaceInput(); f.mutate()
  const row = f.packets.at(-1)
  assert.notEqual(row.state.input, initial); assert.equal(row.state.inputConnected, true)
  assert.equal(row.state.query, 'other'); assert.equal(row.state.selectionUnchanged, false)
  assert.ok(!JSON.stringify(f.packets).includes('PRIVATE')); f.pagehide(); clean(f)
})

for (const options of [
  { frame: true }, { location: { protocol: 'https:' } }, { location: { hostname: 'example.com' } }, { location: { port: '' } },
  { location: { pathname: '/en/app' } }, { rootCount: 0 }, { rootCount: 2 }, { account: true }, { priorInactive: true },
  { requestedActive: true }, { query: 'Love' }, { collapsed: true }, { summary: true },
]) test('installer rejects wrong or already-advanced phase ' + JSON.stringify(options), () => {
  const f = browserFixture(options); assert.equal(f.install(), false); clean(f)
  assert.ok(!JSON.stringify(f.packets).includes('Love'))
})

test('foreign ownership accessor is neither invoked nor removed', () => {
  let reads = 0, calls = 0
  const get = () => { reads++; return { stop() { calls++ } } }
  const f = browserFixture({ foreign: { get, configurable: true } }); assert.equal(f.install(), false)
  assert.equal(reads, 0); assert.equal(calls, 0); assert.equal(Object.getOwnPropertyDescriptor(f.window, slot).get, get)
  assert.equal(f.listenerCount(), 0)
})
test('repeat installation cannot orphan prior listeners; cleanup leaves a foreign replacement untouched', () => {
  const f = browserFixture(); assert.equal(f.install(), true); const count = f.listenerCount()
  assert.equal(f.install(), false); assert.equal(f.listenerCount(), count)
  Object.defineProperty(f.window, slot, { value: 'foreign', configurable: true })
  f.pagehide(); assert.equal(f.listenerCount(), 0); assert.equal(f.window[slot], 'foreign')
})
for (const options of [{ failAdd: 1 }, { failAdd: 12 }, { failObserve: true }]) test('partial page registration cleans precisely owned observers ' + JSON.stringify(options), () => {
  const f = browserFixture(options); assert.equal(f.install(), false); clean(f)
})

for (const failObserve of [false, true]) test('late observer registration after reentrant pagehide is disconnected on return: ' + failObserve, () => {
  let f
  f = browserFixture({ lateObserve: true, failObserve, onObserve: () => f.pagehide() })
  assert.equal(f.install(), false); clean(f)
  const before = f.reads(); f.mutate(); f.flush(); assert.equal(f.reads(), before)
})
test('stop row marks setup still unwinding rather than claiming complete late cleanup', () => {
  let f, disconnects = 0
  f = browserFixture({ lateObserve: true, onObserve: () => f.pagehide(), onDisconnect: () => { if (++disconnects > 1) throw Error('late cleanup unavailable') } })
  assert.equal(f.install(), false); assert.ok(disconnects > 1)
  assert.equal(f.packets.at(-1).setupPending, true)
  assert.equal(f.packets.at(-1).cleanupFailures, 0, 'Only failures known at emission, not a complete later cleanup verdict')
  const row = redactPublicDiscoverySearchRow(f.packets.at(-1)); assert.equal(row.setupPending, true)
  const normal = browserFixture(); normal.install(); normal.pagehide(); assert.equal(normal.packets.at(-1).setupPending, false); clean(normal)
})

test('closure during observer construction cannot attach observation afterward', () => {
  let f, observed = 0
  f = browserFixture({ onConstruct: () => f.pagehide(), onObserve: () => { observed++ } })
  assert.equal(f.install(), false); assert.equal(observed, 0); clean(f)
})

test('row cap includes stop and prevents later event/DOM getters, queued work and navigation reads', () => {
  const f = browserFixture(); f.install()
  for (let i = 0; i < 100; i++) f.emit('pointerdown', f.requested())
  assert.equal(f.packets.length, 64); assert.equal(f.packets.at(-1).reason, 'cap'); clean(f)
  const before = f.reads(); f.emit('click', f.requested()); f.mutate(); f.flush(); f.pagehide()
  assert.equal(f.reads(), before); assert.equal(f.packets.length, 64)
})
test('scroll and geometry samples are independently finite', () => {
  const f = browserFixture(); f.install(); for (let i = 0; i < 40; i++) f.emit('scroll', f.document)
  assert.equal(f.packets.filter(row => row.kind === 'scroll').length, 4)
  for (let i = 0; i < 10; i++) f.emit('pointerup', f.requested())
  assert.equal(f.packets.filter(row => row.geometry).length, 8); f.pagehide(); clean(f)
})
test('scope loss and pagehide stop without reading the replacement page or queued event values', () => {
  const f = browserFixture(); f.install(); f.query('Love'); f.emit('input', f.input())
  f.root.isConnected = false; f.mutate(); assert.equal(f.packets.at(-1).reason, 'scope')
  const before = f.reads(); f.flush(); f.pagehide(); assert.equal(f.reads(), before); clean(f)
})
for (const transition of ['account','origin','port','frame','path','public-marker']) test('scope transition stops before query getter: ' + transition, () => {
  const f = browserFixture(); assert.equal(f.install(), true)
  let reads = 0
  Object.defineProperty(f.input(), 'value', { get() { reads++; throw Error('private replacement field') }, configurable: true })
  if (transition === 'account') f.root.attributes['data-account-test-picker'] = 'true'
  if (transition === 'origin') f.window.location.hostname = 'external.invalid'
  if (transition === 'port') f.window.location.port = '4000'
  if (transition === 'frame') f.window.top = {}
  if (transition === 'path') f.window.location.pathname = '/en/app'
  if (transition === 'public-marker') f.root.attributes['data-public-test-picker'] = 'false'
  f.mutate(); assert.equal(reads, 0); assert.equal(f.packets.at(-1).reason, 'scope'); clean(f)
})
test('second requested click capture cannot establish post-handler deactivation', () => {
  const f = browserFixture(); f.install(); f.query('Love'); f.emit('input', f.input()); f.flush()
  f.emit('click', f.requested(), {}, 'capture'); f.requested().attributes['aria-pressed'] = 'true'; f.query('')
  f.emit('click', f.requested(), {}, 'bubble'); f.flush()
  f.requested().attributes['aria-pressed'] = 'false'
  f.emit('click', f.requested(), {}, 'capture')
  assert.ok(f.listenerCount() > 0, 'pre-handler inactive state alone is not second-clear evidence')
  f.requested().attributes['aria-pressed'] = 'true'; f.emit('click', f.requested(), {}, 'bubble'); f.flush()
  assert.ok(f.listenerCount() > 0); f.pagehide(); clean(f)
})

test('reentrant console delivery and teardown cannot add observations or orphan ownership', () => {
  const f = browserFixture(); f.install()
  f.consoleHook(() => { f.emit('click', f.requested()); f.pagehide() })
  f.emit('pointerdown', f.requested()); f.flush(); clean(f)
  assert.ok(f.packets.length <= 3)
})
test('reentrant removal callbacks see the observer inactive before cleanup starts', () => {
  let f
  f = browserFixture({ onRemove: () => f.emit('click', f.requested()) }); f.install(); f.pagehide(); clean(f)
  assert.equal(f.packets.length, 2)
})
test('selection overflow is unavailable, never a false unchanged verdict', () => {
  const f = browserFixture({ selectionOverflow: true }); f.install()
  assert.equal(f.packets[0].state.selectionUnchanged, null); assert.equal(f.packets[0].state.selectedCount, null); f.pagehide(); clean(f)
})

class Page extends EventEmitter {
  constructor() { super(); this.evaluations = 0 }
  evaluate() { this.evaluations++; throw Error('unexpected browser RPC') }
}
const message = row => ({ type: () => 'debug', text: () => prefix + JSON.stringify(row) })
const goodRow = () => ({ kind: 'click', phase: 'capture', order: 1, target: 'requested', trusted: true, prevented: false, requestedClicks: 1,
  state: { query: 'other', priorActive: true, requestedActive: false, selectionUnchanged: true, input: 2, root: 1, prior: 3, requested: 4 } })
const listenerCount = page => ['console','pageerror','close'].reduce((sum, name) => sum + page.listenerCount(name), 0)

test('host re-redacts every field, bounds pageerrors and never inspects their argument', () => {
  const page = new Page(), output = [], collector = createPublicDiscoverySearchCollector(page, 'en', value => output.push(value))
  page.emit('console', message({ ...goodRow(), secret: 'PRIVATE', state: { ...goodRow().state, query: 'PRIVATE', secret: 'PRIVATE' }, geometry: { requested: ['PRIVATE',1,2,3], raw: 'PRIVATE' } }))
  collector.installation('completed', true)
  const error = new Proxy({}, { get() { assert.fail('pageerror argument must not be read') } })
  for (let i = 0; i < 40; i++) page.emit('pageerror', error)
  collector.dispose(); collector.dispose()
  assert.equal(output.length, 1); assert.equal(output[0].pageErrors, 8); assert.ok(!JSON.stringify(output).includes('PRIVATE'))
  assert.equal(output[0].rows[0].state.query, 'other'); assert.equal(listenerCount(page), 0); assert.equal(page.evaluations, 0)
})
test('host caps stop message getters and parsing before hostile excess events', () => {
  const page = new Page(), output = [], collector = createPublicDiscoverySearchCollector(page, 'en', value => output.push(value))
  collector.installation('completed', true)
  for (let i = 0; i < 64; i++) page.emit('console', message(goodRow()))
  page.emit('console', new Proxy({}, { get() { assert.fail('getter after row cap') } }))
  collector.dispose(); assert.equal(output[0].rows.length, 64); assert.equal(output[0].omitted, 1)
})
test('unrelated console callbacks have a separate pre-getter cap', () => {
  const page = new Page(), output = [], collector = createPublicDiscoverySearchCollector(page, 'en', value => output.push(value))
  collector.installation('completed', true)
  for (let i = 0; i < 128; i++) page.emit('console', { type: () => 'log', text() { assert.fail('irrelevant text') } })
  page.emit('console', new Proxy({}, { get() { assert.fail('getter after callback cap') } }))
  collector.dispose(); assert.equal(output[0].rows.length, 0); assert.equal(output[0].omitted, 1)
})
for (const outcome of ['rejected','timed_out','completed']) test('unconfirmed installation discards queued rows and never retries: ' + outcome, () => {
  const page = new Page(), output = [], collector = createPublicDiscoverySearchCollector(page, 'en', value => output.push(value))
  page.emit('console', message(goodRow())); collector.installation(outcome, false)
  page.emit('console', new Proxy({}, { get() { assert.fail('read after unavailable install') } }))
  collector.dispose(); assert.equal(output[0].rows.length, 0); assert.equal(output[0].installed, false); assert.equal(page.evaluations, 0)
})
test('host rejection, overlong and malformed messages stay bounded and do not escape', () => {
  const page = new Page(), output = [], collector = createPublicDiscoverySearchCollector(page, 'en', value => output.push(value))
  collector.installation('completed', true)
  for (const text of [prefix + 'x'.repeat(4097), prefix + '{', 'PRIVATE_UNRELATED']) page.emit('console', { type: () => 'debug', text: () => text })
  page.emit('console', { type() { throw Error('PRIVATE') } }); collector.dispose()
  assert.equal(output[0].rows.length, 0); assert.equal(output[0].readFailures, 2); assert.ok(!JSON.stringify(output).includes('PRIVATE'))
})
test('reentrant getter disposal prevents reading text or adding post-disposal rows', () => {
  const page = new Page(), output = []; let collector
  collector = createPublicDiscoverySearchCollector(page, 'en', value => output.push(value)); collector.installation('completed', true)
  page.emit('console', { type() { collector.dispose(); return 'debug' }, text() { assert.fail('post-disposal text') } })
  assert.equal(output.length, 1); assert.equal(output[0].rows.length, 0); assert.equal(listenerCount(page), 0)
})
test('partial host attachment and reentrant close undo a callback installed after disposal', () => {
  const page = new Page(), output = []
  page.on = function (name, listener) {
    if (name === 'close') { listener(); EventEmitter.prototype.on.call(this, name, listener); return this }
    EventEmitter.prototype.on.call(this, name, listener); if (name === 'console') throw Error('partial registration'); return this
  }
  const collector = createPublicDiscoverySearchCollector(page, 'en', value => output.push(value)); collector.dispose()
  assert.equal(listenerCount(page), 0); assert.equal(output.length, 1); assert.equal(output[0].pageClosed, true); assert.equal(output[0].attachFailures, 1); assert.equal(output[0].hostListenersComplete, false)
})
test('host listener attachment failure makes observed zero errors explicitly incomplete', () => {
  const page = new Page(), output = []
  page.on = function (name, listener) {
    if (name === 'pageerror') throw Error('synthetic attachment unavailable')
    return EventEmitter.prototype.on.call(this, name, listener)
  }
  const collector = createPublicDiscoverySearchCollector(page, 'en', value => output.push(value))
  collector.installation('completed', true); collector.dispose()
  assert.equal(output[0].installed, true); assert.equal(output[0].pageErrors, 0)
  assert.equal(output[0].attachFailures, 1); assert.equal(output[0].hostListenersComplete, false); assert.equal(listenerCount(page), 0)
})

test('logging failure cannot replace a primary assertion or initiate a failure RPC', () => {
  const page = new Page(), error = Error('primary'), collector = createPublicDiscoverySearchCollector(page, 'en', () => { throw Error('emit') })
  let thrown
  try { try { throw error } finally { collector.dispose() } } catch (value) { thrown = value }
  assert.equal(thrown, error); assert.equal(listenerCount(page), 0); assert.equal(page.evaluations, 0)
})
test('actual begin wrapper installs once before actions and disposes without a page RPC', async () => {
  const page = new Page(); page.evaluate = async (fn, argument) => { page.evaluations++; assert.equal(fn, installPublicDiscoverySearchProbe); assert.equal(argument.locale, 'en'); return true }
  const collector = await beginPublicDiscoverySearchDiagnostics(page, 'en')
  assert.equal(page.evaluations, 1); collector.dispose(); assert.equal(page.evaluations, 1); assert.equal(listenerCount(page), 0)
})
test('actual begin wrapper rejects unavailable page without retry or disposal RPC', async () => {
  const page = new Page(), collector = await beginPublicDiscoverySearchDiagnostics(page, 'en')
  assert.equal(page.evaluations, 1); collector.dispose(); assert.equal(page.evaluations, 1); assert.equal(listenerCount(page), 0)
})
test('close during actual begin attachment prevents all browser setup RPCs', async () => {
  const page = new Page()
  page.on = function (name, listener) {
    if (name === 'close') listener()
    EventEmitter.prototype.on.call(this, name, listener); return this
  }
  const collector = await beginPublicDiscoverySearchDiagnostics(page, 'en')
  assert.equal(page.evaluations, 0); collector.dispose(); assert.equal(listenerCount(page), 0)
})
test('bounded setup timeout cannot rearm host collection or attach to advanced search later', async t => {
  const page = new Page(), f = browserFixture(), outputs = []
  t.mock.method(console, 'log', (...args) => outputs.push(args))
  let finish
  page.evaluate = (fn, argument) => { page.evaluations++; return new Promise(resolve => { finish = () => resolve(f.install(argument)) }) }
  const collector = await beginPublicDiscoverySearchDiagnostics(page, 'en')
  assert.equal(page.evaluations, 1)
  f.query('Love'); finish(); await Promise.resolve(); await Promise.resolve()
  page.emit('console', new Proxy({}, { get() { assert.fail('late installation cannot rearm host parsing') } }))
  collector.dispose(); clean(f)
  const output = JSON.parse(outputs[0][1])
  assert.equal(output.installOutcome, 'timed_out'); assert.equal(output.installed, false); assert.deepEqual(output.rows, [])
  assert.equal(listenerCount(page), 0)
})
test('host redactor rejects negative counters while retaining bounded signed geometry', () => {
  const result = redactPublicDiscoverySearchRow({ ...goodRow(), order: -1, requestedClicks: -1, dropped: -1,
    state: { ...goodRow().state, selectedCount: -1, input: -1 }, geometry: { scroll: [-1,0], requested: [-1,0,30,40] } })
  assert.equal(result.order, null); assert.equal(result.requestedClicks, null); assert.equal(result.dropped, null)
  assert.equal(result.state.selectedCount, null); assert.equal(result.state.input, null); assert.deepEqual(result.geometry.scroll, [-1,0])
})

test('host redactor cannot return arbitrary strings, vectors, fields or numeric overflow', () => {
  assert.equal(redactPublicDiscoverySearchRow({ kind: 'PRIVATE', phase: 'capture' }), null)
  const result = redactPublicDiscoverySearchRow({ ...goodRow(), ms: Infinity, target: 'PRIVATE', raw: 'PRIVATE', geometry: { requested: [1,2,3,1e20], scroll: ['PRIVATE',0], viewport: [390,844] } })
  assert.equal(result.ms, null); assert.equal(result.target, 'other'); assert.equal(result.geometry.requested[3], null)
  assert.ok(!JSON.stringify(result).includes('PRIVATE'))
})

test('caller retains original native actions and gates with observation before submit, Node-only finally', () => {
  const start = helper.indexOf('searchDiagnostics = await beginPublicDiscoverySearchDiagnostics(page, locale)')
  assert.ok(start > helper.indexOf("await expect(sleep).toHaveAttribute('aria-pressed', 'true')"))
  assert.ok(start < helper.indexOf('await search.fill(query)'))
  const sequence = helper.slice(helper.indexOf('await search.fill(query)'), helper.indexOf('assert.deepEqual(writes, []'))
  assert.ok(sequence.includes("await search.press('Enter')"))
  assert.ok(sequence.includes("await root.locator('[data-test-collection=\"sexuality\"]').click()\n    await expect(search).toHaveValue('')"))
  assert.ok(sequence.includes("toEqual(expectedSearch)")); assert.ok(sequence.includes("await expect(page).toHaveURL(currentUrl)"))
  assert.equal((sequence.match(/sexuality.*?\.click\(\)/g) || []).length, 2)
  assert.ok(helper.includes("searchDiagnostics?.dispose()\n    page.off('request', observe)"))
  assert.doesNotMatch(sequence, /beginPublicDiscovery|waitForTimeout|force\s*:|dispatchEvent|\.focus\(|\.fill\(''\)/)
  assert.doesNotMatch(source, /window\[[^\]]+\]\.stop|sessionStorage|localStorage|\.focus\(|scrollIntoView|dispatchEvent|\.click\(/)
})
