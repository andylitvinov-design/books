import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { installHolisticDaoActionProbe, closeHolisticDaoActionProbe, sanitizeHolisticDaoActionDiagnostic, withHolisticDaoActionDiagnostics } from '../scripts/helpers/holistic-dao-action-diagnostics.mjs'

const KEY = '__hhHolisticDaoActionRegistry'
const pending = () => new Promise(() => {})
function fixture() {
  const listeners = [], timers = new Map(), trace = []
  let timerId = 0, currentRoot, lastHit, result = null
  const doc = { activeElement: null, documentElement: { scrollHeight: 4000 },
    querySelector(selector) { return selector === '.mobile-bottom-navigation' ? nav : currentRoot },
    elementFromPoint() { return lastHit },
    addEventListener(type, listener, options) { listeners.push({ type, listener, ...options }); trace.push('add:' + type) },
    removeEventListener(type, listener, capture) { const index = listeners.findIndex(item => item.type === type && item.listener === listener && item.capture === capture); if (index >= 0) listeners.splice(index, 1) },
  }
  const win = { innerWidth: 320, innerHeight: 844, scrollX: 0, scrollY: 1300,
    getComputedStyle(node) { return node.style },
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id },
    clearTimeout(id) { timers.delete(id) },
  }
  doc.defaultView = win
  function node(kind) {
    const children = new Set()
    return { kind, ownerDocument: doc, isConnected: true, children,
      style: { display: 'block', visibility: 'visible', pointerEvents: 'auto' },
      box: { x: 10, y: kind === 'navigation' ? 780 : 600, width: 300, height: 60 },
      contains(child) { return child === this || [...children].some(node => node.contains(child)) },
      getBoundingClientRect() { return { ...this.box } },
      getAttribute() { return null }, querySelector() { return null }, querySelectorAll() { return [] },
      focus() { throw Error('Observer must not focus') }, click() { throw Error('Observer must not click') },
      checkValidity() { throw Error('Observer must not trigger validation') },
    }
  }
  const root = node('root'), form = node('form'), input = node('question'), button = node('target'), nav = node('navigation')
  const value = 'SYNTHETIC_PRIVATE_MARKER_DO_NOT_SERIALIZE'
  input.value = value; input.validity = { valid: true, valueMissing: false, tooLong: false, customError: false }
  input.form = form; button.form = form; button.disabled = false; input.disabled = false
  form.children.add(input); root.children.add(form); root.children.add(button)
  root.querySelector = selector => ({ '[data-ideas-tao]': button, 'form#ideas-question-form': form, 'textarea#ideas-question': input }[selector] || null)
  root.querySelectorAll = selector => selector === '[data-ideas-result]' && result ? [result] : []
  currentRoot = root; lastHit = button; doc.activeElement = input
  const runInPage = (fn, args) => { const previous = globalThis.window; globalThis.window = win; try { return fn(args) } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous } }
  const page = { evaluate: async (fn, args) => runInPage(fn, args) }
  const locator = { evaluate: async (fn, args) => fn(root, args) }
  function dispatch(type, target = button, extra = {}) {
    const event = { type, target, isTrusted: true, defaultPrevented: false, clientX: 150, clientY: 630, ...extra }
    for (const item of [...listeners].filter(item => item.type === type)) item.listener(event)
    return event
  }
  return { doc, win, root, form, input, button, nav, listeners, timers, trace, page, locator, node, dispatch, runInPage,
    install(token = 1, expiresAt = Date.now() + 10000) { return installHolisticDaoActionProbe(root, { token, expiresAt }) },
    read(token = 1) { return win[KEY].probes.get(token).read() },
    close(token = 1, capture = true) { return runInPage(closeHolisticDaoActionProbe, { token, capture }) },
    setHit(node) { lastHit = node }, setRoot(node) { currentRoot = node },
    addResult(mode = 'dao') { result = node('result'); result.getAttribute = () => mode; root.children.add(result); return result },
  }
}
const safe = (raw, meta = {}) => sanitizeHolisticDaoActionDiagnostic(raw, { locale: 'ru', actionResult: 'failed', setup: 'completed', setupClose: 'not-needed', capture: 'completed', cleanup: 'completed', pageErrorRead: 'completed', pageErrorCount: 0, ...meta })

test('passive native sequence records only fixed aliases, lengths, form states and geometry', () => {
  const f = fixture(); assert.equal(f.install(), true); assert.equal(f.listeners.length, 24)
  assert.ok(f.listeners.every(listener => listener.passive === true))
  assert.ok(f.listeners.some(listener => listener.capture) && f.listeners.some(listener => !listener.capture))
  f.dispatch('input', f.input); f.dispatch('pointerdown'); f.dispatch('pointerup'); f.dispatch('click')
  f.dispatch('submit', f.form, { submitter: f.button, defaultPrevented: true }); f.addResult()
  const data = safe(f.close()); assert.deepEqual(data.trustedTargetCounts, [1, 1, 1, 1])
  assert.equal(data.current.inputLength, f.input.value.length); assert.equal(data.current.mode, 'dao')
  assert.equal(data.current.resultCount, 1); assert.equal(data.current.formAssociated, true)
  assert.equal(data.current.inputFormAssociated, true); assert.equal(data.current.resultVisible, true)
  assert.equal(data.records.find(record => record.type === 'submit').submitter, 'target')
  assert.ok(data.records.filter(record => record.type === 'submit').every(record => record.defaultPrevented))
  assert.equal(f.listeners.length, 0); assert.equal(f.timers.size, 0); assert.equal(f.win[KEY].probes.size, 0)
  assert.ok(!JSON.stringify(data).includes(f.input.value)); assert.equal(data.actionResult, 'failed')
})

test('counterfactual navigation release does not invent a delivered target click or submit', () => {
  const f = fixture(); f.install(); f.dispatch('pointerdown'); f.setHit(f.nav)
  f.dispatch('pointerup', f.nav); f.dispatch('click', f.nav)
  const data = safe(f.close()); assert.deepEqual(data.trustedTargetCounts, [1, 0, 0, 0])
  assert.equal(data.current.resultCount, 0); assert.equal(data.current.mode, 'none')
  assert.ok(data.records.some(record => record.target === 'navigation' && record.hit === 'navigation'))
})

test('native validation and disconnected/remounted controls are distinct from delivered submit', () => {
  const f = fixture(); f.install(); f.input.validity = { valid: false, valueMissing: true, tooLong: false, customError: true }
  f.dispatch('invalid', f.input); f.button.form = null; f.input.form = null
  f.button.isConnected = false; f.root.isConnected = false
  const replacement = f.node('root'); f.setRoot(replacement)
  const data = safe(f.close()); assert.equal(data.current.sameRoot, false); assert.equal(data.current.sameTarget, false)
  assert.equal(data.current.originalRootConnected, false); assert.equal(data.current.originalTargetConnected, false)
  assert.equal(data.current.formAssociated, false); assert.deepEqual(data.trustedTargetCounts, [0, 0, 0, 0])
  const invalid = data.records.find(record => record.type === 'invalid')
  assert.equal(invalid.inputValid, false); assert.equal(invalid.valueMissing, true); assert.equal(invalid.customError, true)
})

test('untrusted synthetic events never become trusted native-delivery evidence', () => {
  const f = fixture(); f.install()
  for (const type of ['pointerdown', 'pointerup', 'click']) f.dispatch(type, f.button, { isTrusted: false })
  f.dispatch('submit', f.form, { isTrusted: false, submitter: f.button })
  assert.deepEqual(safe(f.close()).trustedTargetCounts, [0, 0, 0, 0])
})

test('records, numeric fields, input length and modes are bounded', () => {
  const f = fixture(); f.install(); f.input.value = 'x'.repeat(700); f.win.scrollY = Infinity
  f.button.box.x = -1e10; f.addResult('PRIVATE_UNKNOWN_MODE')
  for (let index = 0; index < 100; index++) f.dispatch('click')
  const data = safe(f.close()); assert.equal(data.records.length, 32); assert.equal(data.dropped, 168)
  assert.equal(data.current.inputLength, 500); assert.equal(data.current.scrollY, null)
  assert.equal(data.current.targetRect.x, -1000000); assert.equal(data.current.mode, 'other')
  assert.ok(!JSON.stringify(data).includes('PRIVATE_UNKNOWN_MODE'))
})

test('snapshot errors remain counters and do not affect native event dispatch', () => {
  const f = fixture(); f.install(); f.button.getBoundingClientRect = () => { throw Error('SECRET_EXCEPTION') }
  assert.doesNotThrow(() => f.dispatch('click')); const data = safe(f.close())
  assert.ok(data.observationErrors >= 3); assert.equal(data.current, null)
  assert.ok(!JSON.stringify(data).includes('SECRET_EXCEPTION')); assert.equal(f.listeners.length, 0)
})

test('expired install has no listeners or registry and no arbitrary global getter read', () => {
  const f = fixture(); assert.equal(f.install(1, Date.now() - 1), false); assert.equal(f.listeners.length, 0)
  assert.equal(f.win[KEY], undefined)
  let calls = 0; Object.defineProperty(f.win, KEY, { get() { calls++; throw Error('PRIVATE') } })
  assert.equal(f.install(), false); assert.equal(f.close(), null); assert.equal(calls, 0)
})

test('installation deadline is rechecked after initial snapshot before any listener', () => {
  const f = fixture(); let reads = 0
  const install = vm.runInNewContext('(' + installHolisticDaoActionProbe.toString() + ')', { Date: { now: () => ++reads === 1 ? 10 : 30 } })
  assert.equal(install(f.root, { token: 1, expiresAt: 20 }), false); assert.equal(f.listeners.length, 0)
  assert.equal(f.win[KEY].probes.size, 0); assert.equal(f.win[KEY].closedThrough, 1)
})

test('closed token prevents a late install but cannot remove a newer observer', () => {
  const f = fixture(); f.close(2, false); assert.equal(f.install(1), false); assert.equal(f.install(2), false)
  assert.equal(f.install(3), true); f.close(1, false); assert.equal(f.win[KEY].probes.has(3), true)
  assert.equal(f.listeners.length, 24); assert.equal(f.install(3), false); f.close(3)
  assert.equal(f.listeners.length, 0); assert.equal(f.win[KEY].closedThrough, 3)
})

test('registry has an eight-observer bound and bounded closed-through tombstone', () => {
  const f = fixture(); for (let token = 1; token <= 8; token++) assert.equal(f.install(token), true)
  assert.equal(f.install(9), false); assert.equal(f.win[KEY].probes.size, 8)
  for (let token = 1; token <= 8; token++) f.close(token, false)
  assert.equal(f.listeners.length, 0); assert.equal(f.timers.size, 0); assert.equal(f.win[KEY].probes.size, 0)
  assert.equal(f.win[KEY].closedThrough, 8); assert.deepEqual(Object.keys(f.win[KEY]).sort(), ['closedThrough', 'probes'])
})

test('lease disposes only its token after a stalled protocol and ignores later callback use', () => {
  const f = fixture(); f.install(1); const lease = [...f.timers.values()][0]; assert.equal(lease.ms, 45000)
  f.install(2); lease.fn(); assert.equal(f.win[KEY].probes.has(1), false); assert.equal(f.win[KEY].probes.has(2), true)
  assert.equal(f.listeners.length, 24); lease.fn(); assert.equal(f.listeners.length, 24); f.close(2)
})

for (const failAt of [1, 2, 13, 24]) test('partial listener registration at ' + failAt + ' cleans every owned registration', () => {
  const f = fixture(), add = f.doc.addEventListener.bind(f.doc); let calls = 0
  f.doc.addEventListener = (...args) => { add(...args); if (++calls === failAt) throw Error('registration failure') }
  assert.equal(f.install(), false); assert.equal(f.listeners.length, 0); assert.equal(f.win[KEY].probes.size, 0)
  assert.equal(f.win[KEY].closedThrough, 1); assert.equal(f.timers.size, 0)
})

test('lease setup failure removes all registered listeners; failed removals leave inert callbacks', () => {
  const f = fixture(); f.win.setTimeout = () => { throw Error('timer') }
  assert.equal(f.install(), false); assert.equal(f.listeners.length, 0)
  const g = fixture(); g.install(); const before = g.read().counts
  g.doc.removeEventListener = () => { throw Error('host removal') }; const probe = g.win[KEY].probes.get(1)
  assert.doesNotThrow(() => g.close()); g.dispatch('click')
  assert.deepEqual(probe.read().counts, before); assert.equal(g.win[KEY].probes.size, 0)
})

test('capture read failure still disposes the token and listeners', () => {
  const f = fixture(); f.install(); f.win[KEY].probes.get(1).read = () => { throw Error('read') }
  assert.throws(() => f.close(), /read/); assert.equal(f.listeners.length, 0); assert.equal(f.timers.size, 0)
  assert.equal(f.win[KEY].probes.size, 0)
})

test('host sanitizer never invokes getters, methods, prototypes or arbitrary toJSON', () => {
  let called = 0
  const poison = new Proxy({}, { get() { called++; throw Error('get') }, getOwnPropertyDescriptor() { throw Error('descriptor') } })
  const inherited = Object.create({ initial: { mode: 'dao' } })
  Object.defineProperty(inherited, 'current', { get() { called++; throw Error('PRIVATE') } })
  inherited.records = [{ mode: 'PRIVATE_MODE', target: 'https://private.test/', inputLength: 999999, question: 'PRIVATE_VALUE', toJSON() { called++; throw Error('serialize') } }, poison]
  inherited.counts = new Proxy([], { get() { called++; throw Error('array get') }, getOwnPropertyDescriptor() { throw Error('array descriptor') } })
  const output = safe(inherited); assert.doesNotThrow(() => JSON.stringify(output)); assert.equal(called, 0)
  assert.equal(output.initial, null); assert.equal(output.current, null); assert.equal(output.records[0].inputLength, 500)
  assert.equal(output.records[0].target, 'unknown'); assert.equal(output.records[0].mode, 'unknown')
  assert.ok(!JSON.stringify(output).includes('PRIVATE')); assert.deepEqual(output.counts, [])
})

test('host sanitizer handles revoked proxies and fixed-index huge sparse arrays', () => {
  const pair = Proxy.revocable({}, {}); pair.revoke()
  assert.doesNotThrow(() => JSON.stringify(safe(pair.proxy)))
  const raw = { records: { length: 2 ** 40, 0: { type: 'click' } }, counts: { length: 1000, 0: { length: 1000, 0: 1 } }, trustedTargetCounts: { length: 100, 0: Infinity } }
  const output = safe(raw); assert.equal(output.records.length, 32); assert.equal(output.counts.length, 12)
  assert.equal(output.counts[0].length, 2); assert.equal(output.trustedTargetCounts.length, 4)
  assert.equal(output.trustedTargetCounts[0], null)
})

test('frozen valid raw records and metadata are not mutated', () => {
  const raw = Object.freeze({ current: Object.freeze({ mode: 'dao', inputLength: 42, targetRect: Object.freeze({ x: 1, y: 2, width: 3, height: 4 }) }), records: Object.freeze([]) })
  assert.equal(safe(raw).current.mode, 'dao'); assert.equal(safe(raw).current.inputLength, 42)
  assert.equal(safe(raw).current.targetRect.width, 3)
})

test('wrapper preserves operation sequence and successful return identity, and bounded pageerror count', async () => {
  const f = fixture(), order = [], returned = {}, logs = []
  const evaluate = f.locator.evaluate; f.locator.evaluate = (...args) => { order.push('install'); return evaluate(...args) }
  const value = await withHolisticDaoActionDiagnostics(f.page, f.locator, { locale: 'ru', readPageErrorCount: () => 7 }, async () => {
    order.push('fill'); f.dispatch('input', f.input); order.push('tap'); f.dispatch('click'); order.push('wait20000'); return returned
  }, { log: (...args) => logs.push(args), timeoutMs: 10 })
  assert.equal(value, returned); assert.deepEqual(order, ['install', 'fill', 'tap', 'wait20000'])
  const data = JSON.parse(logs[0][1]); assert.equal(data.actionResult, 'passed'); assert.equal(data.pageErrorCount, 7)
  assert.equal(data.stage, 'support-dao-native-submit'); assert.equal(f.listeners.length, 0)
})

for (const error of [Error('ORIGINAL_PRIVATE_ERROR'), undefined, null, false, 0, '', { marker: 'PRIVATE_REJECTION' }]) test('original thrown identity is preserved: ' + (error instanceof Error ? 'Error' : typeof error + ':' + String(error)), async () => {
  const f = fixture(), logs = []; let caught = Symbol('not-thrown')
  try { await withHolisticDaoActionDiagnostics(f.page, f.locator, { locale: 'ru', readPageErrorCount: () => { throw Error('PRIVATE_COUNTER') } }, () => { throw error }, { log: (...args) => logs.push(args), timeoutMs: 5 }) }
  catch (value) { caught = value }
  assert.equal(caught, error); assert.equal(JSON.parse(logs[0][1]).actionResult, 'failed')
  assert.ok(!logs[0][1].includes('PRIVATE')); assert.equal(f.listeners.length, 0)
})

test('failed setup closes its token before operation and does not block action', async () => {
  const f = fixture(), order = []; f.locator.evaluate = async () => { order.push('setup'); throw Error('setup') }
  const evaluate = f.page.evaluate; f.page.evaluate = (fn, args) => { order.push(args.capture ? 'capture' : 'close'); return evaluate(fn, args) }
  await withHolisticDaoActionDiagnostics(f.page, f.locator, { locale: 'ru' }, () => { order.push('operation') }, { log() {}, timeoutMs: 5 })
  assert.deepEqual(order.slice(0, 3), ['setup', 'close', 'operation']); assert.equal(f.listeners.length, 0)
})

test('timed-out delayed setup cannot install during or after action', async () => {
  const f = fixture(); let late, token, logged
  f.locator.evaluate = (fn, args) => { token = args.token; return new Promise(resolve => { late = () => resolve(fn(f.root, args)) }) }
  await withHolisticDaoActionDiagnostics(f.page, f.locator, { locale: 'ru' }, () => {
    assert.ok(f.win[KEY].closedThrough >= token); late(); assert.equal(f.listeners.length, 0)
  }, { log: (_, data) => { logged = JSON.parse(data) }, timeoutMs: 2 })
  assert.equal(logged.setup, 'timed_out'); assert.equal(f.win[KEY].probes.size, 0)
})

test('late old capture and cleanup cannot dispose a newer installation', async () => {
  const f = fixture(); let late, originalToken
  const evaluate = f.page.evaluate
  f.page.evaluate = (fn, args) => {
    if (args.capture && !late) { originalToken = args.token; return new Promise(resolve => { late = () => resolve(evaluate(fn, args)) }) }
    return evaluate(fn, args)
  }
  await withHolisticDaoActionDiagnostics(f.page, f.locator, { locale: 'ru' }, () => 'done', { log() {}, timeoutMs: 2 })
  assert.equal(f.listeners.length, 0); assert.equal(f.install(originalToken + 1), true)
  late(); await Promise.resolve(); await Promise.resolve()
  assert.equal(f.win[KEY].probes.has(originalToken + 1), true); assert.equal(f.listeners.length, 24); f.close(originalToken + 1)
})

for (const fault of ['capture-reject', 'capture-hang', 'cleanup-reject', 'cleanup-hang', 'pageerror-reject', 'pageerror-hang', 'logger-throw', 'logger-reject', 'logger-hang']) test('bounded telemetry fault preserves original error: ' + fault, async () => {
  const f = fixture(), original = {}; const evaluate = f.page.evaluate
  f.page.evaluate = (fn, args) => {
    if (args.capture && fault.startsWith('capture-')) return fault.endsWith('hang') ? pending() : Promise.reject('PRIVATE_CAPTURE')
    if (fault.startsWith('cleanup-')) return args.capture ? Promise.reject('PRIVATE_CAPTURE') : fault.endsWith('hang') ? pending() : Promise.reject('PRIVATE_CLEANUP')
    return evaluate(fn, args)
  }
  const readPageErrorCount = () => fault === 'pageerror-hang' ? pending() : fault === 'pageerror-reject' ? Promise.reject('PRIVATE_COUNTER') : 0
  const log = () => { if (fault === 'logger-throw') throw 'PRIVATE_LOG'; if (fault === 'logger-reject') return Promise.reject('PRIVATE_LOG'); if (fault === 'logger-hang') return pending() }
  let caught; const start = Date.now()
  try { await withHolisticDaoActionDiagnostics(f.page, f.locator, { locale: 'ru', readPageErrorCount }, () => { throw original }, { log, timeoutMs: 2 }) } catch (error) { caught = error }
  assert.equal(caught, original); assert.ok(Date.now() - start < 500)
  // If protocol cleanup is unavailable, the browser-owned lease remains the
  // final boundary; invoke it in this synthetic scheduler without a browser.
  for (const timer of [...f.timers.values()]) timer.fn()
  assert.equal(f.listeners.length, 0); assert.equal(f.win[KEY].probes.size, 0)
})

test('synchronous hostile page/root methods and logger do not prevent original action', async () => {
  const f = fixture(), original = {}; let calls = 0
  const page = Object.defineProperty({}, 'evaluate', { get() { throw 'PRIVATE_PAGE' } })
  const root = Object.defineProperty({}, 'evaluate', { get() { throw 'PRIVATE_ROOT' } })
  assert.equal(await withHolisticDaoActionDiagnostics(page, root, { locale: 'ru' }, () => { calls++; return original }, { log() { throw 'PRIVATE_LOG' }, timeoutMs: 2 }), original)
  assert.equal(calls, 1); assert.equal(f.listeners.length, 0)
})

test('source integration keeps original fill, native tap, 20000ms visibility wait and summary/question gates verbatim', async () => {
  const source = await readFile(new URL('../scripts/verify-holistic-master-browser.mjs', import.meta.url), 'utf8')
  const match = source.match(/await withHolisticDaoActionDiagnostics\(page, engineCard, \{[\s\S]*?\}, async \(\) => \{([\s\S]*?)\n    \}\);/)
  assert.ok(match)
  const expected = `\n      await question.fill(copy[locale].question);\n      await insight.tap();\n      const result = engineCard.locator('[data-ideas-result="dao"]');\n      await result.waitFor({state:"visible", timeout: 20000});\n      assert.ok((await result.locator("[data-ideas-dao-summary]").innerText()).trim().length > 15,\n        label + ": genuine symbolic response");\n      assert.equal(await question.inputValue(), copy[locale].question,\n        label + ": original words kept only in editable field");`
  assert.equal(match[1], expected)
  assert.match(source, /await question\.fill\(copy\[locale\]\.intention\)/)
  assert.match(source, /assertHolisticContextHandoff\(transferredIntention, copy\[locale\]\.intention, label\)/)
  const helper = await readFile(new URL('../scripts/helpers/holistic-dao-action-diagnostics.mjs', import.meta.url), 'utf8')
  for (const forbidden of [/\.click\(/, /\.tap\(/, /\.focus\(/, /\.blur\(/, /scrollIntoView\(/, /dispatchEvent\(/, /requestSubmit\(/, /checkValidity\(/, /preventDefault\(/, /stopPropagation\(/, /\.innerText\b/, /\.textContent\b/, /\.innerHTML\b/, /\.outerHTML\b/, /\.url\(/]) assert.doesNotMatch(helper, forbidden)
})


test('deadline crossed during listener installation disposes before lease or action', () => {
  const f = fixture(); let reads = 0
  const install = vm.runInNewContext('(' + installHolisticDaoActionProbe.toString() + ')', { Date: { now: () => ++reads < 3 ? 10 : 30 } })
  assert.equal(install(f.root, { token: 1, expiresAt: 20 }), false)
  assert.equal(f.listeners.length, 0); assert.equal(f.timers.size, 0); assert.equal(f.win[KEY].probes.size, 0)
})

for (const value of [undefined, null, false, 0, '', { returnIdentity: true }]) test('successful return identity survives hung logger: ' + typeof value + ':' + String(value), async () => {
  const f = fixture()
  const actual = await withHolisticDaoActionDiagnostics(f.page, f.locator, { locale: 'ru', readPageErrorCount: () => 0 }, () => value, { log: pending, timeoutMs: 2 })
  assert.equal(actual, value); assert.equal(f.listeners.length, 0)
})

test('pageerror metadata is numeric only even for secret objects, getters and out-of-range values', () => {
  let calls = 0
  const meta = { locale: 'PRIVATE_LOCALE', actionResult: 'PRIVATE_RESULT', pageErrorCount: { toString() { calls++; return 'PRIVATE_COUNTER' } } }
  Object.defineProperty(meta, 'setup', { get() { calls++; throw 'PRIVATE_GETTER' } })
  const output = sanitizeHolisticDaoActionDiagnostic({}, meta)
  assert.equal(output.pageErrorCount, null); assert.equal(output.locale, 'unknown'); assert.equal(calls, 0)
  assert.equal(safe({}, { pageErrorCount: 1e9 }).pageErrorCount, 1000000)
  assert.equal(safe({}, { pageErrorCount: -1 }).pageErrorCount, null)
  assert.ok(!JSON.stringify(output).includes('PRIVATE'))
})
