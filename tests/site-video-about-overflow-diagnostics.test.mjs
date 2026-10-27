import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { types as nodeTypes } from 'node:util'
import { performance as nodePerformance } from 'node:perf_hooks'

const source = readFileSync(new URL('../scripts/verify-site-video-browser.mjs', import.meta.url), 'utf8')
function extract(begin, end) {
  const start = source.indexOf(begin), finish = source.indexOf(end, start)
  assert.ok(start >= 0 && finish > start, 'Expected bounded diagnostic source')
  return source.slice(start, finish)
}
const block = extract('// BEGIN bounded About overflow diagnostics', '// END bounded About overflow diagnostics.')
const recorder = extract('  async function recordAboutOverflowDiagnostic(path, isActive)', '  async function recordAboutPosterDiagnostic()')
const forbidden = () => { throw new Error('SYNTHETIC-PRIVATE-DATA-MUST-NOT-APPEAR') }
const selectors = [
  ['about-shell', 'main.about-shell'],
  ['about-header', 'main.about-shell > .section-site-header'],
  ['about-intro-video', 'main.about-shell > #psychic-alchemy-video'],
  ['about-intro-slot', 'main.about-shell > [data-video-slot="about-intro"]'],
  ['about-introduction', 'main.about-shell > .about-introduction'],
  ['about-portrait', 'main.about-shell > .about-introduction > .about-portrait'],
  ['about-introduction-copy', 'main.about-shell > .about-introduction > .about-introduction-copy'],
  ['about-biography', 'main.about-shell > .about-biography'],
  ['about-explore', 'main.about-shell > .about-explore'],
  ['about-gallery', 'main.about-shell > #about-testimonials[data-personal-testimonials="about"]'],
  ['about-gallery-row', 'main.about-shell > #about-testimonials > [role="region"]'],
  ['about-consultation-video', 'main.about-shell > [data-video-slot="consultation"]'],
  ['about-consultation', 'main.about-shell > .about-consultation'],
  ['about-consultation-capture', 'main.about-shell > .about-consultation > [data-consultation-capture]'],
  ['about-cabinet-entry', 'main.about-shell > .about-client-cabinet'],
]
const styleEnums = {
  display: ['none', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'flow-root', 'table', 'other'],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky', 'other'],
  boxSizing: ['border-box', 'content-box', 'other'],
  overflowX: ['visible', 'hidden', 'clip', 'scroll', 'auto', 'other'],
  overflowY: ['visible', 'hidden', 'clip', 'scroll', 'auto', 'other'],
  flexWrap: ['nowrap', 'wrap', 'wrap-reverse', 'other'],
  whiteSpace: ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces', 'other'],
  overflowWrap: ['normal', 'anywhere', 'break-word', 'other'],
}
function fixture() {
  const styles = new WeakMap(), bounds = new WeakMap()
  let rectReads = 0, walkSteps = 0
  function element({ left = 0, width = 1188, scrollWidth = width, children = [], style = {} } = {}) {
    const value = { children, clientWidth: width, scrollWidth,
      getBoundingClientRect() { rectReads++; return bounds.get(value) },
      querySelectorAll: forbidden, getAttribute: forbidden, setAttribute: forbidden,
      click: forbidden, focus: forbidden, scrollIntoView: forbidden,
      get textContent() { return forbidden() }, get innerText() { return forbidden() },
      get outerHTML() { return forbidden() }, get innerHTML() { return forbidden() },
      get src() { return forbidden() }, get href() { return forbidden() },
      get id() { return forbidden() }, get className() { return forbidden() }, get tagName() { return forbidden() } }
    styles.set(value, { display: 'block', position: 'static', boxSizing: 'border-box', overflowX: 'visible', overflowY: 'visible',
      flexWrap: 'nowrap', whiteSpace: 'normal', overflowWrap: 'normal', ...style })
    bounds.set(value, { left, right: left + width, width, top: 100, bottom: 300, height: 200 })
    return value
  }
  const nodes = new Map(selectors.map(([, selector]) => [selector, [element()]]))
  const root = element({ width: 1365, scrollWidth: 3057 })
  const body = element({ width: 1365, scrollWidth: 3057 })
  const shell = nodes.get('main.about-shell')[0]
  const cards = Array.from({ length: 10 }, (_, index) => element({ left: 100 + index * 300, width: 287 }))
  shell.children = selectors.slice(1, 13).map(([, selector]) => nodes.get(selector)[0])
  body.children = [shell]
  let unknown = []
  const document = { documentElement: root, body,
    createTreeWalker(value, whatToShow) {
      assert.equal(value, body); assert.equal(whatToShow, 1); let index = 0
      return { nextNode() { walkSteps++; return unknown[index++] ?? null } }
    },
    querySelectorAll(selector) {
      if (selector === 'main.about-shell > #about-testimonials [data-testimonial-video-id]') return cards
      assert.ok(nodes.has(selector), 'Only fixed technical selectors')
      return nodes.get(selector)
    },
    querySelector(selector) { assert.equal(selector, 'main.about-shell'); return shell },
    get styleSheets() { return forbidden() }, get URL() { return forbidden() }, get location() { return forbidden() },
  }
  const context = { document, innerWidth: 1365, getComputedStyle(value) { assert.ok(styles.has(value)); return styles.get(value) },
    fetch: forbidden, Image: forbidden, XMLHttpRequest: forbidden, setTimeout, clearTimeout, nodeTypes, nodePerformance, requestAnimationFrame: forbidden }
  const functions = runInNewContext(block + '\n({ aboutOverflowDiagnosticSnapshot, canonicalAboutOverflowDiagnostic, withAboutOverflowDiagnostic })', context, { timeout: 1000 })
  return { ...functions, document, nodes, cards, root, body, shell, styles, bounds, element,
    setUnknown(value) { unknown = value }, get rectReads() { return rectReads }, get walkSteps() { return walkSteps },
    snapshot() { return JSON.parse(JSON.stringify(functions.aboutOverflowDiagnosticSnapshot())) } }
}
function numeric(value) { assert.ok(value === null || typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 100000) }
function rect(value) {
  assert.deepEqual(Object.keys(value).sort(), ['bottom', 'height', 'left', 'right', 'top', 'width'])
  Object.values(value).forEach(numeric)
}
function row(value, alias, section = false) {
  assert.equal(value.alias, alias); assert.equal(typeof value.present, 'boolean')
  const keys = ['alias', 'present', ...(section ? ['count'] : []), ...(value.present ? ['rect', 'clientWidth', 'scrollWidth', 'styles'] : [])]
  assert.deepEqual(Object.keys(value).sort(), keys.sort())
  if (section) assert.ok(Number.isInteger(value.count) && value.count >= 0 && value.count <= 2)
  if (!value.present) return
  rect(value.rect); numeric(value.clientWidth); numeric(value.scrollWidth)
  assert.deepEqual(Object.keys(value.styles).sort(), Object.keys(styleEnums).sort())
  for (const [key, values] of Object.entries(styleEnums)) assert.ok(values.includes(value.styles[key]), `Fixed ${key} enum`)
}
function schema(value) {
  assert.deepEqual(Object.keys(value).sort(), ['bodyChildCount', 'bodyChildren', 'cardCount', 'cards', 'roots', 'sections', 'shellChildCount', 'shellChildren', 'status', 'unknown', 'viewportWidth'])
  assert.equal(value.status, 'captured'); numeric(value.viewportWidth)
  assert.equal(value.roots.length, 2); row(value.roots[0], 'document-root'); row(value.roots[1], 'body-root')
  assert.equal(value.sections.length, selectors.length)
  value.sections.forEach((value, i) => row(value, selectors[i][0], true))
  for (const [field, prefix, countField, cap] of [['shellChildren', 'shell-child', 'shellChildCount', 12], ['bodyChildren', 'body-child', 'bodyChildCount', 12], ['cards', 'gallery-card', 'cardCount', 10]]) {
    assert.equal(value[field].length, cap)
    value[field].forEach((value, i) => row(value, `${prefix}-${String(i + 1).padStart(2, '0')}`))
    assert.ok(Number.isInteger(value[countField]) && value[countField] >= 0 && value[countField] <= cap + 1)
  }
  const u = value.unknown
  assert.deepEqual(Object.keys(u).sort(), ['elementCount', 'scanLimited', 'scanned', 'wideCount', 'wideRects'])
  for (const [key, cap] of [['elementCount', 2049], ['scanned', 2048], ['wideCount', 33]]) assert.ok(Number.isInteger(u[key]) && u[key] >= 0 && u[key] <= cap)
  assert.equal(typeof u.scanLimited, 'boolean'); assert.ok(u.wideRects.length <= 12); u.wideRects.forEach(rect)
  assert.ok(!/SYNTHETIC|SECRET|https?:|<|src=|class=|id=|\.css|\.webp/.test(JSON.stringify(value)), 'No DOM identifiers, source, text, errors or payloads')
  assert.ok(JSON.stringify(value).length < 35000, 'Output remains bounded')
}

test('passive geometry distinguishes document, direct children, known sections and internal scrolling without DOM content', () => {
  const f = fixture()
  const gallery = f.nodes.get(selectors[10][1])[0]
  gallery.scrollWidth = 3057; f.styles.get(gallery).overflowX = 'auto'; f.styles.get(gallery).display = 'flex'
  const sibling = f.element({ left: 1200, width: 1857 }); f.body.children.push(sibling)
  const unknown = f.element({ left: 1360, width: 1697 }); f.setUnknown([f.cards[9], unknown])
  const value = f.snapshot(); schema(value)
  assert.equal(value.roots[0].scrollWidth, 3057); assert.equal(value.roots[0].rect.width, 1365)
  assert.equal(value.sections[10].scrollWidth, 3057); assert.equal(value.sections[10].styles.overflowX, 'auto')
  assert.equal(value.bodyChildren[1].rect.right, 3057)
  assert.equal(value.cards[9].rect.right, 3087)
  assert.equal(value.unknown.wideCount, 1, 'Known offscreen scroll cards are not duplicated as unknown nodes')
  assert.equal(value.unknown.wideRects[0].right, 3057)
})

test('index, scan, count, numeric and style caps reject arbitrary data without loading, style-sheet reads or identifiers', () => {
  const f = fixture(), odd = f.element({ width: 1e9, scrollWidth: 1e9, style: Object.fromEntries(Object.keys(styleEnums).map(key => [key, 'SYNTHETIC-SECRET'])) })
  f.bounds.set(odd, { left: -1e9, right: 1e9, top: NaN, bottom: Infinity, width: 'SYNTHETIC-SECRET', height: 12.345 })
  odd.clientWidth = 'SYNTHETIC-SECRET'
  for (const key of f.nodes.keys()) f.nodes.set(key, Array(40).fill(odd))
  f.shell.children = Array(40).fill(odd); f.body.children = Array(40).fill(odd); f.cards.splice(0, 10, ...Array(40).fill(odd))
  const unknown = f.element({ left: 2000, width: 50 }); f.setUnknown(Array(3000).fill(unknown))
  const value = f.snapshot(); schema(value)
  assert.equal(value.shellChildCount, 13); assert.equal(value.bodyChildCount, 13); assert.equal(value.cardCount, 11)
  assert.ok(value.sections.every(row => row.count === 2 && row.rect.left === -100000 && row.rect.width === null && row.clientWidth === null && row.scrollWidth === 100000))
  assert.ok(value.sections.every(row => Object.values(row.styles).every(value => value === 'other')))
  assert.equal(value.unknown.elementCount, 2049); assert.equal(value.unknown.scanned, 2048); assert.equal(value.unknown.scanLimited, true)
  assert.equal(value.unknown.wideCount, 33); assert.equal(value.unknown.wideRects.length, 12)
  assert.ok(f.rectReads <= 2100, 'DOM rectangle reads are bounded independently of node count')
  assert.equal(f.walkSteps, 2049, 'Unknown-node traversal is capped without enumerating the entire DOM')
})

test('missing known sections retain fixed absent aliases and no geometry is invented', () => {
  const f = fixture(); for (const key of f.nodes.keys()) f.nodes.set(key, [])
  f.shell.children = []; f.body.children = []; f.cards.length = 0
  const value = f.snapshot(); schema(value)
  assert.ok(value.sections.every(row => row.count === 0 && !row.present))
  assert.ok(value.shellChildren.every(row => !row.present)); assert.ok(value.cards.every(row => !row.present))
  assert.equal(value.unknown.wideCount, 0)
})

test('successful assertion is silent; failure is observed once without retry and retains the identical original error', async () => {
  const { withAboutOverflowDiagnostic } = fixture()
  let operations = 0, observations = 0
  const result = { unchanged: true }
  assert.equal(await withAboutOverflowDiagnostic(async () => { operations++; return result }, async () => { observations++ }), result)
  assert.equal(operations, 1); assert.equal(observations, 0)
  for (const diagnosticFails of [false, true]) {
    operations = 0; observations = 0; const original = new Error('original-overflow-assertion')
    await assert.rejects(withAboutOverflowDiagnostic(async () => { operations++; throw original }, async () => {
      observations++; if (diagnosticFails) throw new Error('SYNTHETIC-PRIVATE-DIAGNOSTIC')
    }), error => error === original)
    assert.equal(operations, 1); assert.equal(observations, 1)
  }
})

test('recorder only observes fixed About paths and suppresses DOM/write errors while preserving bounded output', async () => {
  const f = fixture()
  for (const path of ['/en/about', '/ru/about', '/SYNTHETIC-SECRET?token=SECRET']) {
    for (const failAt of ['none', 'dom', 'write']) {
      let reads = 0; const logs = [], writes = []
      const context = { aboutOverflowDiagnosticSnapshot: f.aboutOverflowDiagnosticSnapshot, canonicalAboutOverflowDiagnostic: f.canonicalAboutOverflowDiagnostic, evidence: '/synthetic-evidence',
        page: { async evaluate(fn) { reads++; assert.equal(fn, f.aboutOverflowDiagnosticSnapshot); if (failAt === 'dom') throw new Error('SYNTHETIC-PRIVATE-DOM'); return f.snapshot() } },
        writeFileSync(file, value) { assert.equal(file, '/synthetic-evidence/about-overflow-diagnostic.json'); if (failAt === 'write') throw new Error('SYNTHETIC-PRIVATE-WRITE'); writes.push(value) },
        console: { error(label, value) { assert.equal(label, 'OBSERVATION: about-overflow'); logs.push(value) } } }
      const run = runInNewContext(recorder + '\nrecordAboutOverflowDiagnostic', context, { timeout: 1000 })
      await run(path, () => true)
      const allowed = path === '/en/about' || path === '/ru/about'
      assert.equal(reads, allowed ? 1 : 0); assert.equal(logs.length, allowed ? 1 : 0)
      assert.equal(writes.length, allowed && failAt !== 'write' ? 1 : 0)
      if (!allowed) continue
      const value = JSON.parse(logs[0]); assert.equal(value.schemaVersion, 1)
      assert.equal(value.caseAlias, path === '/en/about' ? 'about-en-overflow' : 'about-ru-overflow')
      assert.deepEqual(Object.keys(value).sort(), ['caseAlias', 'measurement', 'schemaVersion'])
      const measurement = value.measurement
      if (failAt === 'dom') assert.deepEqual(measurement, { status: 'unavailable' }); else schema(measurement)
      assert.ok(!/SYNTHETIC|SECRET|\/en\/about|\/ru\/about/.test(logs[0]))
    }
  }
})

test('integration leaves the strict overflow assertion and route/viewport sweep intact; diagnostic neither fixes nor retries', () => {
  const assertion = 'assert.ok(sizes.document <= sizes.viewport + 2, `Overflow on ${path}: ${JSON.stringify(sizes)}`)'
  assert.equal(source.split(assertion).length - 1, 1)
  assert.ok(source.includes('for (const width of [1365, 390]) {\n    await page.setViewportSize({ width, height: 900 })\n    for (const path of paths) {\n      await navigate(path)'))
  assert.ok(source.includes('      await withAboutOverflowDiagnostic(async () => {\n      ' + assertion + '\n      }, isActive => recordAboutOverflowDiagnostic(path, isActive))'))
  assert.equal(source.split('recordAboutOverflowDiagnostic(path, isActive)').length - 1, 2, 'Definition plus sole failure-wrapper call')
  assert.ok(!/styleSheets|cssRules|textContent|innerText|innerHTML|outerHTML|getAttribute|\.src|\.href|\.id\b|\.className|\.tagName|fetch\(|new Image|setTimeout|requestAnimationFrame|\.click\(|\.focus\(|scrollIntoView|setAttribute/.test(block.slice(0, block.indexOf('// Independent Node boundary:')) + recorder))
})

test('reviewer reproduction: alternating computed-style getter is read once and only a canonical enum is emitted', () => {
  const f = fixture(); let reads = 0
  Object.defineProperty(f.styles.get(f.root), 'display', { get() { reads++; return reads === 1 ? 'block' : 'SYNTHETIC-SECRET' } })
  const value = f.snapshot(); schema(value)
  assert.equal(reads, 1); assert.equal(value.roots[0].styles.display, 'block')
  const odd = { valueOf: forbidden, toString: forbidden }
  f.bounds.get(f.body).width = odd; f.body.clientWidth = odd
  f.nodes.set(selectors[1][1], { 0: f.body, length: odd })
  f.setUnknown([])
  const second = f.snapshot(); schema(second)
  assert.equal(second.roots[1].rect.width, null); assert.equal(second.roots[1].clientWidth, null)
  assert.equal(second.sections[1].count, 0); assert.equal(second.unknown.scanned, 0)
})

function envelope(value, locale = 'en') {
  assert.deepEqual(Object.keys(value).sort(), ['caseAlias', 'measurement', 'schemaVersion'])
  assert.equal(value.schemaVersion, 1); assert.equal(value.caseAlias, `about-${locale}-overflow`)
  if (value.measurement.status === 'unavailable') assert.deepEqual(value.measurement, { status: 'unavailable' })
  else schema(value.measurement)
  assert.ok(!/SYNTHETIC|SECRET|https?:|<script|arbitraryPayload/.test(JSON.stringify(value)))
}
const plain = value => JSON.parse(JSON.stringify(value))
const clone = value => structuredClone(value)

test('reviewer reproduction: Node reconstruction discards arbitrary evaluate fields and never trusts schema, aliases, prototypes or toJSON', () => {
  const f = fixture(); const original = f.snapshot(); const raw = clone(original); let reads = 0
  const poison = () => { reads++; return forbidden() }
  raw.schemaVersion = 999; raw.caseAlias = 'SYNTHETIC-SECRET'; raw.arbitraryPayload = 'SYNTHETIC-SECRET'
  const poisonedPrototype = { get inheritedPayload() { return poison() }, get toJSON() { return poison() } }
  for (const container of [raw, raw.roots, raw.sections, raw.shellChildren, raw.bodyChildren, raw.cards, raw.unknown, raw.unknown.wideRects,
    ...raw.roots, ...raw.sections, ...raw.shellChildren, ...raw.bodyChildren, ...raw.cards]) {
    Object.setPrototypeOf(container, poisonedPrototype)
    Object.defineProperty(container, 'toJSON', { get: poison })
    Object.defineProperty(container, 'arbitraryGetter', { get: poison })
    if (Object.hasOwn(container, 'alias')) Object.defineProperty(container, 'alias', { get: poison })
  }
  const output = plain(f.canonicalAboutOverflowDiagnostic(raw, '/en/about')); envelope(output)
  assert.deepEqual(output.measurement, original); assert.equal(reads, 0)
  const invalid = plain(f.canonicalAboutOverflowDiagnostic({ status: 'captured', arbitraryPayload: 'SYNTHETIC-SECRET', schemaVersion: 999, caseAlias: 'arbitrary' }, '/ru/about'))
  envelope(invalid, 'ru'); assert.equal(invalid.measurement.status, 'unavailable')
  assert.equal(f.canonicalAboutOverflowDiagnostic(raw, '/SECRET'), null)
})

test('Node boundary rejects accessors and proxies at every nested boundary without invoking traps/getters/functions', () => {
  const f = fixture(), original = f.snapshot(); let reads = 0
  const poison = () => { reads++; return forbidden() }
  const accessors = [
    raw => [raw, 'status'], raw => [raw, 'viewportWidth'], raw => [raw, 'roots'], raw => [raw.roots, '0'],
    raw => [raw.roots[0], 'present'], raw => [raw.roots[0], 'rect'], raw => [raw.roots[0].rect, 'width'],
    raw => [raw.roots[0], 'styles'], raw => [raw.roots[0].styles, 'display'], raw => [raw, 'shellChildCount'],
    raw => [raw, 'unknown'], raw => [raw.unknown, 'scanned'], raw => [raw.unknown, 'scanLimited'], raw => [raw.unknown, 'wideRects'],
  ]
  for (const locate of accessors) {
    const raw = clone(original), [container, key] = locate(raw)
    Object.defineProperty(container, key, { get: poison })
    const result = plain(f.canonicalAboutOverflowDiagnostic(raw, '/en/about')); envelope(result)
    assert.equal(result.measurement.status, 'unavailable')
  }
  const proxy = value => new Proxy(value, { get: poison, getOwnPropertyDescriptor: poison, ownKeys: poison, getPrototypeOf: poison })
  const proxied = [
    raw => proxy(raw), raw => { raw.roots = proxy(raw.roots); return raw },
    raw => { raw.roots[0] = proxy(raw.roots[0]); return raw }, raw => { raw.roots[0].rect = proxy(raw.roots[0].rect); return raw },
    raw => { raw.roots[0].styles = proxy(raw.roots[0].styles); return raw }, raw => { raw.unknown = proxy(raw.unknown); return raw },
    raw => { raw.unknown.wideRects = proxy(raw.unknown.wideRects); return raw },
    raw => { const p = Proxy.revocable(raw, {}); p.revoke(); return p.proxy },
  ]
  for (const change of proxied) {
    const result = plain(f.canonicalAboutOverflowDiagnostic(change(clone(original)), '/en/about')); envelope(result)
    assert.equal(result.measurement.status, 'unavailable')
  }
  assert.equal(reads, 0, 'Own-data/proxy rejection must precede any accessor, descriptor trap or prototype lookup')
})

test('Node boundary independently caps oversized arrays/counts and reads only fixed indices and primitive finite numbers', () => {
  const f = fixture(), raw = f.snapshot(); let reads = 0
  const poison = () => { reads++; return forbidden() }
  for (const [key, size] of [['roots', 2], ['sections', 15], ['shellChildren', 12], ['bodyChildren', 12], ['cards', 10]]) {
    raw[key].length = 4294967295
    Object.defineProperty(raw[key], String(size), { get: poison })
    Object.defineProperty(raw[key], Symbol.iterator, { get: poison })
    raw[key].map = poison
  }
  const rectangle = { left: -1e12, right: 1e12, width: 1e12, top: null, bottom: 1e12, height: 1e12 }
  raw.unknown.wideRects = Array(12).fill(rectangle); raw.unknown.wideRects.length = 4294967295
  Object.defineProperty(raw.unknown.wideRects, '12', { get: poison })
  raw.shellChildCount = raw.bodyChildCount = raw.cardCount = raw.unknown.elementCount = raw.unknown.scanned = raw.unknown.wideCount = 1e12
  const output = plain(f.canonicalAboutOverflowDiagnostic(raw, '/en/about')); envelope(output)
  assert.equal(output.measurement.status, 'captured'); assert.equal(reads, 0)
  assert.equal(output.measurement.unknown.wideRects.length, 12)
  assert.equal(output.measurement.unknown.wideRects[0].left, -100000)
  assert.equal(output.measurement.unknown.elementCount, 2049); assert.equal(output.measurement.unknown.scanned, 2048)
  assert.equal(output.measurement.unknown.wideCount, 33); assert.equal(output.measurement.cardCount, 11)
  for (const value of [NaN, Infinity, -Infinity, '3000', 1n, Symbol('SECRET'), { valueOf: poison, toJSON: poison }, poison]) {
    const data = f.snapshot(); data.roots[0].rect.width = value
    const result = plain(f.canonicalAboutOverflowDiagnostic(data, '/en/about')); envelope(result)
    assert.equal(result.measurement.status, 'unavailable')
  }
  for (const value of [-1, 0.5, NaN, Infinity, '13', true, null, { valueOf: poison }]) {
    const data = f.snapshot(); data.cardCount = value
    assert.equal(f.canonicalAboutOverflowDiagnostic(data, '/en/about').measurement.status, 'unavailable')
  }
  for (const value of ['true', 1, null, { valueOf: poison }]) {
    const data = f.snapshot(); data.unknown.scanLimited = value
    assert.equal(f.canonicalAboutOverflowDiagnostic(data, '/en/about').measurement.status, 'unavailable')
  }
  assert.equal(reads, 0)
})

function timedRuntime({ evaluate, failAt = 'none', afterWrite, elapsedClock = false, sourceBlock = block, clock } = {}) {
  const f = fixture(), timers = new Map(), writes = [], logs = []
  let scheduled = 0, cleared = 0, reads = 0, now = 0
  const functions = runInNewContext(sourceBlock + '\n({ aboutOverflowDiagnosticSnapshot, canonicalAboutOverflowDiagnostic, withAboutOverflowDiagnostic })', {
    nodeTypes, nodePerformance: elapsedClock ? nodePerformance : { now: clock ?? (() => now) },
    setTimeout(fn, delay) { assert.equal(delay, 1000); timers.set(++scheduled, fn); return scheduled },
    clearTimeout(id) { cleared++; timers.delete(id) },
  }, { timeout: 1000 })
  const run = runInNewContext(recorder + '\nrecordAboutOverflowDiagnostic', {
    ...functions, evidence: '/synthetic-evidence',
    page: { async evaluate(fn) { reads++; assert.equal(fn, functions.aboutOverflowDiagnosticSnapshot); return evaluate ? evaluate() : f.snapshot() } },
    writeFileSync(file, value) { assert.equal(file, '/synthetic-evidence/about-overflow-diagnostic.json'); if (failAt === 'write') throw new Error('SYNTHETIC-WRITE'); writes.push(value); afterWrite?.() },
    console: { error(label, value) { assert.equal(label, 'OBSERVATION: about-overflow'); if (failAt === 'log') throw new Error('SYNTHETIC-LOG'); logs.push(value) } },
  }, { timeout: 1000 })
  return { ...functions, run, writes, logs, timers, snapshot: () => f.snapshot(),
    get scheduled() { return scheduled }, get cleared() { return cleared }, get reads() { return reads },
    elapse(milliseconds) { now += milliseconds },
    expire() { assert.equal(timers.size, 1); timers.values().next().value() },
  }
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
async function withinBound(promise) {
  let timer
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Synthetic deadline not honored')), 100) })]) }
  finally { clearTimeout(timer) }
}

test('reviewer reproduction: never-settling evaluate has a fixed deadline, releases original error and emits nothing late', async () => {
  for (const settlement of ['never', 'resolve', 'reject']) {
    let resolve, reject
    const pending = new Promise((yes, no) => { resolve = yes; reject = no })
    const r = timedRuntime({ evaluate: () => pending }), original = new Error('original-overflow')
    let operations = 0, finished = false
    const result = r.withAboutOverflowDiagnostic(async () => { operations++; throw original }, active => r.run('/en/about', active))
      .then(() => { finished = true; return null }, error => { finished = true; return error })
    await flush(); assert.equal(r.reads, 1); assert.equal(finished, false); assert.equal(r.scheduled, 1)
    r.expire(); assert.equal(await withinBound(result), original); assert.equal(operations, 1)
    assert.equal(r.cleared, 1); assert.equal(r.timers.size, 0)
    if (settlement === 'resolve') resolve(r.snapshot())
    if (settlement === 'reject') reject(new Error('SYNTHETIC-LATE-REJECTION'))
    await flush(); assert.equal(r.writes.length, 0); assert.equal(r.logs.length, 0)
  }
})

test('bounded observation clears timers on every early outcome, preserves write/log/evaluate failures and stays silent on pass/non-About', async () => {
  for (const failAt of ['none', 'write', 'log', 'evaluate']) {
    const r = timedRuntime({ failAt, evaluate: failAt === 'evaluate' ? () => Promise.reject(new Error('SYNTHETIC-DOM')) : undefined })
    const original = new Error('original-overflow')
    await assert.rejects(r.withAboutOverflowDiagnostic(async () => { throw original }, active => r.run('/ru/about', active)), error => error === original)
    assert.equal(r.scheduled, 1); assert.equal(r.cleared, 1); assert.equal(r.timers.size, 0)
    assert.equal(r.reads, 1)
    assert.equal(r.writes.length, failAt === 'write' ? 0 : 1); assert.equal(r.logs.length, failAt === 'log' ? 0 : 1)
    for (const value of [...r.writes, ...r.logs]) envelope(JSON.parse(value), 'ru')
  }
  const pass = timedRuntime(); let observations = 0
  assert.equal(await pass.withAboutOverflowDiagnostic(async () => 42, active => { observations++; return pass.run('/en/about', active) }), 42)
  assert.equal(observations, 0); assert.equal(pass.scheduled, 0); assert.equal(pass.reads, 0)
  const other = timedRuntime(), original = new Error('other-route-overflow')
  await assert.rejects(other.withAboutOverflowDiagnostic(async () => { throw original }, active => other.run('/SECRET', active)), error => error === original)
  assert.equal(other.reads, 0); assert.equal(other.logs.length, 0); assert.equal(other.writes.length, 0); assert.equal(other.timers.size, 0)
  await other.run('/en/about', () => false); await other.run('/en/about')
  assert.equal(other.reads, 0)
})

test('recorder serializes only independent own-data reconstruction, not the page payload', async () => {
  const f = fixture(), payload = f.snapshot(); let touched = 0
  payload.schemaVersion = 999; payload.caseAlias = 'SYNTHETIC-SECRET'; payload.extra = 'SYNTHETIC-SECRET'
  payload.toJSON = () => { touched++; return { arbitraryPayload: 'SYNTHETIC-SECRET' } }
  for (const pageValue of [payload, { schemaVersion: 999, caseAlias: 'SYNTHETIC-SECRET', status: 'captured', arbitraryPayload: 'SYNTHETIC-SECRET' },
    new Proxy({}, { get: forbidden, getOwnPropertyDescriptor: forbidden })]) {
    const r = timedRuntime({ evaluate: () => pageValue }), original = new Error('original')
    await assert.rejects(r.withAboutOverflowDiagnostic(async () => { throw original }, active => r.run('/en/about', active)), error => error === original)
    assert.equal(r.logs.length, 1); assert.equal(r.writes.length, 1)
    for (const value of [...r.logs, ...r.writes]) envelope(JSON.parse(value))
  }
  assert.equal(touched, 0)
})

test('elapsed monotonic budget suppresses overdue output even before delayed timer dispatch; timer-only counterfactual leaks', async () => {
  for (const timerOnly of [false, true]) {
    let resolve
    const pending = new Promise(yes => { resolve = yes })
    const sourceBlock = timerOnly ? block.replace('active && nodePerformance.now() < deadline', 'active') : block
    const r = timedRuntime({ evaluate: () => pending, sourceBlock }), original = new Error('original-overflow')
    const result = r.withAboutOverflowDiagnostic(async () => { throw original }, active => r.run('/en/about', active))
      .then(() => null, error => error)
    await flush(); assert.equal(r.reads, 1); assert.equal(r.timers.size, 1)
    r.elapse(1130); resolve(null) // Deliberately do not dispatch the overdue timer.
    assert.equal(await withinBound(result), original)
    assert.equal(r.writes.length, timerOnly ? 1 : 0); assert.equal(r.logs.length, timerOnly ? 1 : 0)
    assert.equal(r.cleared, 1); assert.equal(r.timers.size, 0)
  }
  let r
  r = timedRuntime({ afterWrite: () => r.elapse(1001) })
  const original = new Error('original-overflow')
  await assert.rejects(r.withAboutOverflowDiagnostic(async () => { throw original }, active => r.run('/en/about', active)), error => error === original)
  assert.equal(r.writes.length, 1, 'Write began within budget')
  assert.equal(r.logs.length, 0, 'A fresh deadline check suppresses logging after a delayed write')
  const times = [0, 0, 900, 1001]
  const beforeWrite = timedRuntime({ clock: () => times.shift() ?? 1001 })
  await assert.rejects(beforeWrite.withAboutOverflowDiagnostic(async () => { throw original }, active => beforeWrite.run('/en/about', active)), error => error === original)
  assert.equal(beforeWrite.reads, 1); assert.equal(beforeWrite.writes.length, 0); assert.equal(beforeWrite.logs.length, 0)
})

test('real elapsed reviewer reproduction: 900ms await plus230ms synchronous stall cannot emit after the monotonic deadline', { timeout: 2500 }, async () => {
  const r = timedRuntime({ elapsedClock: true, evaluate: async () => {
    await new Promise(resolve => setTimeout(resolve, 900))
    const until = nodePerformance.now() + 230
    while (nodePerformance.now() < until) { /* Synthetic event-loop starvation; no browser or IO. */ }
    return null
  } }), original = new Error('original-overflow')
  const start = nodePerformance.now()
  await assert.rejects(r.withAboutOverflowDiagnostic(async () => { throw original }, active => r.run('/en/about', active)), error => error === original)
  assert.ok(nodePerformance.now() - start >= 1000)
  assert.equal(r.writes.length, 0); assert.equal(r.logs.length, 0); assert.equal(r.cleared, 1)
  assert.equal(r.timers.size, 0)
})

test('opaque non-Error failures remain identical and rejecting diagnostic thenables are consumed without disclosure', async () => {
  const { withAboutOverflowDiagnostic } = fixture()
  for (const original of [null, undefined, 17, 'opaque-original', Object.freeze({ opaque: true })]) {
    let operations = 0, diagnoses = 0, caught = false
    try {
      await withAboutOverflowDiagnostic(() => { operations++; throw original }, () => {
        diagnoses++; return { then(resolve, reject) { reject(new Error('SYNTHETIC-SECRET')) } }
      })
    } catch (error) { caught = true; assert.equal(error, original) }
    assert.equal(caught, true); assert.equal(operations, 1); assert.equal(diagnoses, 1)
  }
})
