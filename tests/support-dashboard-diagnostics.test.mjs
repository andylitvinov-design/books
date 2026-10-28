import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import { types } from 'node:util'
import { canonicalSupportDashboard, supportDashboardSnapshot } from '../scripts/helpers/support-dashboard-diagnostics.mjs'

const metadata = { engine: 'chromium', locale: 'ru', width: 430 }
const rect = (y = 20, height = 30) => ({ x: 1, y, right: 21, bottom: y + height, width: 20, height, shown: true })
const initial = () => ({ client: 430, scroll: 430, a: [rect(20, 275)], photo: [rect(30, 100)],
  toolsSection: [rect(20, 274)], hero: [rect(306.703125, 288)], readableScores: [{ name: 'NEVER_RETAIN' }] })
const raw = () => ({ nodes: Array.from({ length: 7 }, (_, i) => ({ x: 1, y: i, width: 30, height: 40 })) })
const source = readFileSync(new URL('../scripts/helpers/support-dashboard-diagnostics.mjs', import.meta.url), 'utf8')
const verifier = readFileSync(new URL('../scripts/verify-holistic-support-mock-fidelity.mjs', import.meta.url), 'utf8')
function recorderEnvironment({ writeThrows = false, emitThrows = false } = {}) {
  const writes = [], messages = [], timers = new Map(); let now = 0, sequence = 0
  const context = vm.createContext({ types, performance: { now: () => now },
    writeFileSync: (path, content) => { if (writeThrows) throw Error('SECRET_WRITE'); writes.push({ path, content }) },
    console: { error: (...args) => { if (emitThrows) throw Error('SECRET_EMIT'); messages.push(args) } },
    setTimeout: (fn, ms) => { assert.equal(ms, 1000); timers.set(++sequence, fn); return sequence },
    clearTimeout: id => timers.delete(id),
  })
  vm.runInContext(source.replace(/^import .*\n/gm, '').replace(/export /g, '') + '\nthis.make = createSupportDashboardRecorder;', context)
  return { record: context.make(), writes, messages, timers, advance: n => { now = n }, flush: () => { for (const fn of timers.values()) fn() } }
}

test('exact numeric dashboard evidence and fixed aliases exclude names', () => {
  const result = canonicalSupportDashboard(initial(), raw(), metadata)
  assert.equal(result.original.dashboardHeight, 286.703125)
  assert.deepEqual(result.observation.targets.map(x => x.alias), ['top-band', 'assessment', 'profile', 'tools', 'goal-filter', 'quick-match', 'hero'])
  assert.equal(JSON.stringify(result).includes('NEVER_RETAIN'), false)
  assert.equal(result.caseAlias, 'chromium-ru-430')
})
test('unknown metadata keys and values fail closed', () => {
  for (const bad of [{ ...metadata, url: 'SECRET' }, { ...metadata, engine: 'firefox' }, { ...metadata, locale: 'secret' }, { ...metadata, width: 431 }])
    assert.equal(canonicalSupportDashboard(initial(), raw(), bad), null)
})
test('unknown raw or rectangle keys rejected without payload retention', () => {
  for (const value of [{ ...raw(), secret: 'SECRET' }, { nodes: raw().nodes.map((r, i) => i ? r : { ...r, value: 'SECRET' }) }]) {
    const result = canonicalSupportDashboard(initial(), value, metadata)
    assert.equal(result.observation.status, 'unavailable'); assert.equal(result.original.status, 'captured')
    assert.equal(JSON.stringify(result).includes('SECRET'), false)
  }
})
test('accessors and proxies are rejected without calling traps', () => {
  let calls = 0
  const accessor = {}; Object.defineProperty(accessor, 'nodes', { get() { calls++; throw Error('SECRET') } })
  const proxy = new Proxy(raw(), { ownKeys() { calls++; throw Error('SECRET') } })
  for (const value of [accessor, proxy]) assert.equal(canonicalSupportDashboard(initial(), value, metadata).observation.status, 'unavailable')
  const m = { ...metadata }; Object.defineProperty(m, 'width', { get() { calls++; return 430 } })
  assert.equal(canonicalSupportDashboard(initial(), raw(), m), null)
  assert.equal(calls, 0)
})
test('array extras holes and wrong lengths reject supplemental capture', () => {
  const values = [[], new Array(7), [...raw().nodes, null]]
  const extra = raw().nodes; extra.secret = 'SECRET'; values.push(extra)
  for (const nodes of values) assert.equal(canonicalSupportDashboard(initial(), { nodes }, metadata).observation.status, 'unavailable')
})
test('nonfinite and huge numbers reject while absent nodes remain explicit', () => {
  for (const value of [NaN, Infinity, -Infinity, 100001, '33']) {
    const data = raw(); data.nodes[0].height = value
    assert.equal(canonicalSupportDashboard(initial(), data, metadata).observation.status, 'unavailable')
  }
  const data = raw(); data.nodes[4] = null
  assert.equal(canonicalSupportDashboard(initial(), data, metadata).observation.targets[4].rect, null)
})
test('original accessors and unknown keys cannot leak or replace supplemental evidence', () => {
  let called = 0; const data = initial(); Object.defineProperty(data, 'a', { get() { called++; return [] } })
  assert.equal(canonicalSupportDashboard(data, raw(), metadata).original.status, 'unavailable')
  assert.equal(canonicalSupportDashboard({ ...initial(), secret: 'SECRET' }, raw(), metadata).original.status, 'unavailable')
  assert.equal(called, 0)
})
test('browser snapshot reads only seven fixed node rectangles', () => {
  const node = { getBoundingClientRect: () => ({ x: 1, y: 2, width: 3, height: 4 }), closest: () => node }
  node.parentElement = node
  const selectors = []
  const root = { querySelector: sel => { selectors.push(sel); return node } }
  const context = vm.createContext({ document: { querySelector: sel => { assert.equal(sel, '[data-holistic-mobile-alternative]'); return root } } })
  const result = vm.runInContext('(' + supportDashboardSnapshot.toString() + ')()', context)
  assert.equal(result.nodes.length, 7); assert.equal(selectors.length, 6)
  assert.deepEqual(JSON.parse(JSON.stringify(result.nodes[0])), { x: 1, y: 2, width: 3, height: 4 })
  assert.doesNotMatch(supportDashboardSnapshot.toString(), /textContent|innerText|getAttribute|getComputedStyle|\.value\b|\.url\b|storage|cookie/)
})
test('recorder is one attempt fixed path bounded content with timer cleanup', async () => {
  const e = recorderEnvironment(); let evaluations = 0
  const page = { evaluate: async () => { evaluations++; return raw() } }
  await e.record(page, metadata, initial()); await e.record(page, metadata, initial())
  assert.equal(evaluations, 1); assert.equal(e.writes.length, 1); assert.equal(e.messages.length, 1); assert.equal(e.timers.size, 0)
  assert.equal(e.writes[0].path, 'artifacts/holistic-support-mock-fidelity/dashboard-diagnostics.json')
  assert.ok(e.writes[0].content.length < 8192); assert.doesNotMatch(e.writes[0].content, /NEVER_RETAIN|SECRET/)
})
test('invalid metadata does not consume the single allowed valid attempt', async () => {
  const e = recorderEnvironment(); let evaluations = 0
  const page = { evaluate: async () => { evaluations++; return raw() } }
  await e.record(page, { ...metadata, width: 700 }, initial()); await e.record(page, metadata, initial())
  assert.equal(evaluations, 1); assert.equal(e.writes.length, 1)
})
test('evaluation rejection emits no error text and retains initial measurement', async () => {
  const e = recorderEnvironment()
  await e.record({ evaluate: async () => { throw Error('SECRET_BROWSER') } }, metadata, initial())
  const result = JSON.parse(e.writes[0].content)
  assert.equal(result.original.dashboardHeight, 286.703125); assert.equal(result.observation.status, 'unavailable')
  assert.doesNotMatch(JSON.stringify(e.messages), /SECRET_BROWSER/)
})
test('artifact and console errors never escape diagnostics', async () => {
  for (const config of [{ writeThrows: true }, { emitThrows: true }]) {
    const e = recorderEnvironment(config); await assert.doesNotReject(e.record({ evaluate: async () => raw() }, metadata, initial()))
    assert.equal(e.timers.size, 0)
  }
})
test('timer expiry forbids late evaluation writes and logs', async () => {
  const e = recorderEnvironment(); let resolve
  const pending = e.record({ evaluate: () => new Promise(r => { resolve = r }) }, metadata, initial())
  await Promise.resolve(); e.advance(1000); e.flush(); await pending
  resolve(raw()); await Promise.resolve(); await Promise.resolve()
  assert.equal(e.writes.length, 0); assert.equal(e.messages.length, 0); assert.equal(e.timers.size, 0)
})
test('monotonic expiry before timer callback also prevents emission', async () => {
  const e = recorderEnvironment()
  await e.record({ evaluate: async () => { e.advance(1001); return raw() } }, metadata, initial())
  assert.equal(e.writes.length, 0); assert.equal(e.messages.length, 0)
})
const insertedImport = 'import { createSupportDashboardRecorder } from "./helpers/support-dashboard-diagnostics.mjs";\nconst recordSupportDashboardFailure = createSupportDashboardRecorder();\n'
const insertedBlock = `          if (!(geometry.hero[0].y-geometry.a[0].y<285)) {
            try { await recordSupportDashboardFailure(page, { engine: browserType.name(), locale, width }, geometry); }
            catch { /* Diagnostics must not replace the original fatal assertion. */ }
          }
`
test('verifier is exact canonical99c preimage after removing only diagnostic additions', () => {
  assert.equal(verifier.split(insertedImport).length, 2); assert.equal(verifier.split(insertedBlock).length, 2)
  const before = verifier.replace(insertedImport, '').replace(insertedBlock, '')
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\0`).update(before).digest('hex'), '4d070dce94b992f4ddee7ed89cece31c4f6e895d')
  assert.match(verifier, /geometry\.hero\[0\]\.height>=268/)
})
test('actual verifier block never runs on pass and preserves original assertion after throwing observer', async () => {
  const assertion = '          assert.ok(geometry.hero[0].y-geometry.a[0].y<285,\n            label+" screenshot-like three-zone dashboard exposes scenic player by 285px");'
  assert.ok(verifier.includes(insertedBlock + assertion))
  let calls = 0
  const run = (gap, record) => vm.runInNewContext('(async()=>{' + insertedBlock + assertion + '\n})()', {
    geometry: { hero: [{ y: gap }], a: [{ y: 0 }] }, page: {}, browserType: { name: () => 'chromium' }, locale: 'ru', width: 430,
    label: 'case', recordSupportDashboardFailure: record, assert,
  })
  await run(284.999, async () => { calls++ }); assert.equal(calls, 0)
  await assert.rejects(run(285, async () => { calls++; throw Error('SECRET_OBSERVER') }), error => error.code === 'ERR_ASSERTION' && /by 285px/.test(error.message))
  assert.equal(calls, 1)
})

test('recorder preserves initial measurement and metadata across delayed evaluation', async () => {
  const e = recorderEnvironment(); const before = initial(), meta = { ...metadata }; let finish
  const pending = e.record({ evaluate: () => new Promise(resolve => { finish = resolve }) }, meta, before)
  await Promise.resolve(); before.hero[0].y = 999; meta.locale = 'en'; meta.width = 320
  finish(raw()); await pending
  const saved = JSON.parse(e.writes[0].content)
  assert.equal(saved.caseAlias, 'chromium-ru-430'); assert.equal(saved.original.dashboardHeight, 286.703125)
})

test('nested rectangle and indexed-array getters remain uncalled', () => {
  let calls = 0
  const a = raw(); Object.defineProperty(a.nodes[0], 'x', { get() { calls++; return 1 } })
  assert.equal(canonicalSupportDashboard(initial(), a, metadata).observation.status, 'unavailable')
  const b = raw(); Object.defineProperty(b.nodes, '0', { get() { calls++; return null } })
  assert.equal(canonicalSupportDashboard(initial(), b, metadata).observation.status, 'unavailable')
  const c = initial(); Object.defineProperty(c.hero[0], 'y', { get() { calls++; return 300 } })
  assert.equal(canonicalSupportDashboard(c, raw(), metadata).original.status, 'unavailable')
  assert.equal(calls, 0)
})

test('even ignored name-bearing fields must be own data, never accessors', () => {
  let calls = 0; const data = initial()
  Object.defineProperty(data, 'readableScores', { get() { calls++; return [{ name: 'SECRET' }] } })
  assert.equal(canonicalSupportDashboard(data, raw(), metadata).original.status, 'unavailable')
  assert.equal(calls, 0)
})
