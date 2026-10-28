import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { types as nodeTypes } from 'node:util'
import test from 'node:test'

const source = readFileSync(new URL('../scripts/helpers/business-geometry-diagnostics.mjs', import.meta.url), 'utf8')
const verifier = readFileSync(new URL('../scripts/verify-business-quiz-mobile.mjs', import.meta.url), 'utf8')
const secret = 'SYNTHETIC-PRIVATE-MUST-NOT-APPEAR'
const forbidden = () => { throw new Error(secret) }
const rect = (height = 42) => ({ x: 114, y: 1925.296875, width: 136.546875, height })
const metadata = phase => ({ engine: 'webkit', locale: 'en', width: 320, phase })
const clone = value => JSON.parse(JSON.stringify(value))
function runtime(extra = {}) {
  const writes = [], logs = [], timers = new Set()
  const context = {
    nodeTypes, nodePerformance: { now: () => 0 },
    writeFileSync: (path, data) => writes.push({ path, data }),
    console: { error: (...args) => logs.push(args) },
    setTimeout: (fn, ms) => { assert.equal(ms, 1000); const timer = { fn }; timers.add(timer); return timer },
    clearTimeout: timer => { timers.delete(timer) },
    ...extra,
  }
  const api = runInNewContext(source.replace(/^import .*$/gm, '').replace(/^export /gm, '')
    + '\n;({businessGeometrySnapshot,canonicalBusinessGeometry,createBusinessGeometryRecorder})', context)
  return { ...api, writes, logs, timers, context }
}
function browserFixture() {
  let targetReads = 0, rectReads = 0, styleReads = 0
  const style = { display: 'flex', visibility: 'visible', pointerEvents: 'auto' }
  const node = { getBoundingClientRect: () => { rectReads++; return rect(74) },
    getAttribute: forbidden, setAttribute: forbidden, click: forbidden, focus: forbidden, scrollIntoView: forbidden,
    get innerText() { return forbidden() }, get textContent() { return forbidden() }, get value() { return forbidden() },
    get href() { return forbidden() }, get id() { return forbidden() }, get className() { return forbidden() } }
  const targets = new Set(['[data-direction-filter="decisions"]', '[data-direction-filter="productivity"]',
    '[data-direction-filter="work-stress"]', '[data-direction-filter="money-beliefs"]',
    '[data-goal-support-action="business-review"]', '[data-offer-id="primary-session"] [data-offer-action="session"]',
    '[data-business-direct-option="express"]', '[data-business-direct-option="full"]'])
  const nav = Array.from({ length: 20 }, () => node)
  const document = {
    querySelector: selector => { assert.ok(targets.has(selector)); targetReads++; return node },
    querySelectorAll: selector => { assert.equal(selector, '.mobile-bottom-navigation, .ia222-bottom-navigation'); return nav },
    get styleSheets() { return forbidden() }, get URL() { return forbidden() },
    get location() { return forbidden() }, createTreeWalker: forbidden,
  }
  return { style, nav, node, context: { document, window: { visualViewport: { width: 320, height: 844, offsetLeft: 0, offsetTop: 0, scale: 1 } },
    innerWidth: 320, innerHeight: 844, scrollX: 0, scrollY: 1000,
    getComputedStyle: value => { assert.equal(value, node); styleReads++; return style } },
    counts: () => ({ targetReads, rectReads, styleReads }) }
}
function observed() {
  const fixture = browserFixture(), api = runtime(fixture.context)
  return api.businessGeometrySnapshot('selected-needs')
}

test('Snapshot reads only fixed selectors, capped nav geometry and visibility enums', () => {
  const fixture = browserFixture(), api = runtime(fixture.context)
  const raw = api.businessGeometrySnapshot('selected-needs')
  assert.deepEqual(fixture.counts(), { targetReads: 2, rectReads: 3, styleReads: 5 })
  assert.equal(raw.navCount, 4); assert.equal(raw.nav.length, 3)
  fixture.style.display = 'none'; fixture.style.pointerEvents = 'none'
  const hidden = api.businessGeometrySnapshot('selected-needs')
  assert.equal(hidden.nav[0].visibility, 'not-rendered'); assert.equal(hidden.nav[0].pointerEvents, 'none')
  fixture.style.display = secret; fixture.style.visibility = secret; fixture.style.pointerEvents = secret
  assert.equal(api.businessGeometrySnapshot('express-option').targets[0].visibility, 'other')
  assert.ok(!JSON.stringify(api.businessGeometrySnapshot('full-option')).includes(secret))
  assert.equal(api.businessGeometrySnapshot(secret), null)
})

test('Canonical output reuses numeric assertion rectangles and reconstructs every alias', () => {
  const api = runtime(), raw = observed(), boxes = [rect(44), rect()]
  raw.extra = secret; raw.targets[0].alias = secret; boxes[0].href = secret
  const result = api.canonicalBusinessGeometry(raw, metadata('selected-needs'), boxes)
  assert.equal(result.measurement.status, 'captured')
  assert.equal(result.measurement.targets[0].alias, 'free-review')
  assert.equal(result.measurement.targets[1].alias, 'paid-session')
  assert.equal(result.measurement.targets[1].rect.height, 42)
  assert.equal(result.measurement.targets[1].rect.y, 1925.3)
  assert.equal(result.measurement.viewport.scrollY, 1000)
  assert.ok(!JSON.stringify(result).includes(secret))
  raw.viewport.width = 1e10; boxes[0].y = -1e10
  const capped = api.canonicalBusinessGeometry(raw, metadata('selected-needs'), boxes)
  assert.equal(capped.measurement.viewport.width, 100000); assert.equal(capped.measurement.targets[0].rect.y, -100000)
})

test('Own-data boundary never invokes accessors, proxies, numeric coercion or untrusted array methods', () => {
  const api = runtime(), good = observed(), boxes = [rect(), rect()]
  let touched = 0
  const getter = () => { touched++; return secret }
  const proxy = value => new Proxy(value, { get() { touched++; return secret }, getOwnPropertyDescriptor() { touched++; return undefined } })
  const poison = [
    raw => { Object.defineProperty(raw, 'viewport', { get: getter }) },
    raw => { raw.viewport = proxy(raw.viewport) },
    raw => { Object.defineProperty(raw.targets, '0', { get: getter }) },
    raw => { raw.nav = proxy(raw.nav) },
    raw => { raw.viewport.width = { valueOf: getter, toString: getter } },
    raw => { raw.targets[0].visibility = secret },
    raw => { raw.nav[0].rect = proxy(rect()) },
    raw => { raw.targets = Object.create(raw.targets) },
  ]
  for (const mutate of poison) {
    const raw = clone(good); mutate(raw)
    const result = api.canonicalBusinessGeometry(raw, metadata('selected-needs'), boxes)
    assert.equal(result.measurement.status, 'unavailable'); assert.ok(!JSON.stringify(result).includes(secret))
  }
  assert.equal(api.canonicalBusinessGeometry(proxy(good), metadata('selected-needs'), boxes).measurement.status, 'unavailable')
  const raw = clone(good)
  raw.targets.map = forbidden; raw.nav.slice = forbidden; raw.targets[2] = { get visibility() { return forbidden() } }
  assert.equal(api.canonicalBusinessGeometry(raw, metadata('selected-needs'), boxes).measurement.status, 'captured')
  assert.equal(touched, 0)
  assert.equal(api.canonicalBusinessGeometry(good, proxy(metadata('selected-needs')), boxes), null)
  assert.equal(touched, 0)
})

test('Every phase uses fixed target caps; malformed metadata produces no diagnostic', () => {
  const fixture = browserFixture(), api = runtime(fixture.context)
  for (const [phase, length] of [['initial-needs', 5], ['selected-needs', 2], ['express-option', 1], ['full-option', 1]]) {
    const raw = api.businessGeometrySnapshot(phase), boxes = Array.from({ length: length + 3 }, () => rect())
    const result = api.canonicalBusinessGeometry(raw, metadata(phase), boxes)
    assert.equal(result.measurement.targets.length, length)
  }
  for (const key of ['phase', 'engine', 'locale', 'width']) {
    const value = metadata('selected-needs'); value[key] = secret
    assert.equal(api.canonicalBusinessGeometry(observed(), value, [rect(), rect()]), null)
  }
})

test('Recorder has four attempts, fixed path, original-failure preservation and no browser error output', { timeout: 1000 }, async () => {
  const api = runtime(), record = api.createBusinessGeometryRecorder('webkit', 'en', 320)
  let calls = 0
  const page = { evaluate: async () => { calls++; throw new Error(secret) } }
  const original = new Error('original geometry failure')
  await assert.rejects(async () => { for (let index = 0; index < 7; index++) await record(page, 'selected-needs', [rect(), rect()]); throw original }, error => error === original)
  assert.equal(calls, 4); assert.equal(api.writes.length, 4); assert.equal(api.logs.length, 4)
  assert.equal(api.timers.size, 0)
  for (const write of api.writes) {
    assert.equal(write.path, 'artifacts/business-quiz-mobile/geometry-diagnostics.json')
    assert.ok(!write.data.includes(secret)); assert.ok(JSON.parse(write.data).observations.length <= 4)
  }
  const failIO = runtime({ writeFileSync: forbidden, console: { error: forbidden } })
  await assert.rejects(async () => { await failIO.createBusinessGeometryRecorder('webkit', 'en', 320)(page, 'selected-needs', [rect(), rect()]); throw original }, error => error === original)
  assert.equal(failIO.timers.size, 0)
})

test('Successful diagnostic capture evaluates once per failed phase and bounds serialized output', { timeout: 1000 }, async () => {
  const fixture = browserFixture(), api = runtime(fixture.context), record = api.createBusinessGeometryRecorder('webkit', 'en', 320)
  let calls = 0
  const page = { evaluate: async (snapshot, phase) => { calls++; return snapshot(phase) } }
  for (const [phase, length] of [['initial-needs', 5], ['selected-needs', 2], ['express-option', 1], ['full-option', 1]])
    await record(page, phase, Array.from({ length }, () => rect()))
  assert.equal(calls, 4); assert.equal(api.writes.length, 4)
  const last = JSON.parse(api.writes.at(-1).data)
  assert.equal(last.observations.length, 4)
  for (const write of api.writes) assert.ok(write.data.length <= 8192)
  assert.equal(api.timers.size, 0)
})

test('Trusted monotonic expiry blocks late writes even when timeout callback has not fired', { timeout: 1000 }, async () => {
  let now = 0, resolve
  const api = runtime({ nodePerformance: { now: () => now } })
  const record = api.createBusinessGeometryRecorder('webkit', 'en', 320)
  const pending = record({ evaluate: () => new Promise(done => { resolve = done }) }, 'selected-needs', [rect(), rect()])
  await Promise.resolve(); now = 1001; resolve(observed()); await pending
  assert.equal(api.writes.length, 0); assert.equal(api.logs.length, 0); assert.equal(api.timers.size, 0)
})

test('Timer race cancels late successful or rejected evaluations without late output', { timeout: 1000 }, async () => {
  for (const reject of [false, true]) {
    let settle
    const api = runtime(), record = api.createBusinessGeometryRecorder('webkit', 'en', 320)
    const pending = record({ evaluate: () => new Promise((resolve, fail) => { settle = reject ? fail : resolve }) }, 'selected-needs', [rect(), rect()])
    await Promise.resolve(); assert.equal(api.timers.size, 1)
    for (const timer of api.timers) timer.fn()
    await pending
    settle(reject ? new Error(secret) : observed())
    await Promise.resolve(); await Promise.resolve()
    assert.equal(api.writes.length, 0); assert.equal(api.logs.length, 0); assert.equal(api.timers.size, 0)
  }
})

test('Monotonic checks protect write and log separately', { timeout: 1000 }, async () => {
  let now = 0
  const api = runtime({ nodePerformance: { now: () => now }, writeFileSync: () => { now = 1001 } })
  await api.createBusinessGeometryRecorder('webkit', 'en', 320)({ evaluate: async () => observed() }, 'selected-needs', [rect(), rect()])
  assert.equal(api.logs.length, 0)
  let reads = 0
  const beforeWrite = runtime({ nodePerformance: { now: () => ++reads >= 4 ? 1001 : 0 } })
  await beforeWrite.createBusinessGeometryRecorder('webkit', 'en', 320)({ evaluate: async () => observed() }, 'selected-needs', [rect(), rect()])
  assert.equal(beforeWrite.writes.length, 0); assert.equal(beforeWrite.logs.length, 0)
})

test('Verifier retains its original 44px and 770px assertions; observation follows failed measurements only', () => {
  assert.ok(verifier.includes('box&&box.height>=44&&box.width>=44&&box.x>=-1&&box.x+box.width<=width+1'))
  assert.ok(verifier.includes("if(aboveBar&&width<=430)contract(()=>assert.ok(box&&box.y+box.height<770,\n      label+': '+name+' retains original above-bottom-bar requirement: '+JSON.stringify(box)))"))
  assert.ok(verifier.includes("if(width<=430)contract(()=>assert.ok(last&&last.y+last.height<770,label+': all need choices above bottom bar'))"))
  assert.ok(verifier.includes("assert.deepEqual(failures,[],label+': preserving diagnostic contracts, NOT a baseline waiver')"))
  assert.equal((verifier.match(/scrollIntoViewIfNeeded\(/g) ?? []).length, 1)
  assert.ok(!/force\s*:\s*true/.test(verifier))
  assert.ok(verifier.indexOf("const paidBox=await target(paidCta,'paid consultation CTA',true)") < verifier.indexOf("recordGeometry(page,'selected-needs'"))
  assert.ok(verifier.indexOf("await noOverflow('initial')") < verifier.indexOf("recordGeometry(page,'initial-needs'"))
  assert.ok(verifier.includes("if(failures.length>initialFailures)await recordGeometry"))
  assert.ok(verifier.includes("if(failures.length>selectedFailures)await recordGeometry"))
  assert.ok(verifier.includes("if(failures.length>optionFailures)await recordGeometry"))
})
