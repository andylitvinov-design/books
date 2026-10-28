import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { observePortraitNavigation } from '../scripts/helpers/portrait-navigation-diagnostics.mjs'
import { sanitizePathname } from '../scripts/helpers/isolated-browser-diagnostics.mjs'
import { observePersonalityPdfNavigation, PDF_NAVIGATION_LIMITS } from '../scripts/helpers/personality-pdf-navigation-diagnostics.mjs'

const origin = 'http://127.0.0.1:3100', options = { timeout: 3000 }
const helperSource = await readFile(new URL('../scripts/helpers/personality-pdf-navigation-diagnostics.mjs', import.meta.url), 'utf8')
const verifierSource = await readFile(new URL('../scripts/verify-personality-types.mjs', import.meta.url), 'utf8')
function fixture() {
  const page = new EventEmitter(), main = {}, child = {}
  page.mainFrame = () => main
  page.url = () => origin + '/ru/app/portrait?token=PRIVATE#PRIVATE'
  const forbidden = () => { throw Error('PRIVATE must not be read') }
  const request = (path = '/api/app/bootstrap', extra = {}) => ({
    url: () => origin + path, frame: () => main, isNavigationRequest: () => false,
    redirectedFrom: () => null, method: () => 'GET', resourceType: () => 'fetch',
    failure: () => ({ errorText: 'net::ERR_ABORTED PRIVATE' }),
    headers: forbidden, allHeaders: forbidden, postData: forbidden, postDataJSON: forbidden, ...extra,
  })
  const response = (request, status = 200) => ({ request: () => request, status: () => status, headers: forbidden, allHeaders: forbidden, body: forbidden, text: forbidden, json: forbidden })
  return { page, main, child, request, response }
}
function virtual({ writer = async () => {}, portrait = observePortraitNavigation, logging } = {}) {
  const timers = [], logs = [], writes = []
  let now = 0
  const api = runInNewContext(helperSource.replace(/^import .*\n/gm, '').replace(/^export /gm, '') + '\n({observePersonalityPdfNavigation,preservePersonalityPdfNavigation})', {
    performance: { now: () => now }, writeFile: (...args) => { writes.push(args); return writer(...args) },
    observePortraitNavigation: portrait, sanitizePathname, URL, structuredClone, AbortController,
    console: { log: logging || ((...args) => logs.push(args)) }, setTimeout: (fn, ms) => { const timer = { fn, ms, cleared: false, unref() {} }; timers.push(timer); return timer },
    clearTimeout: timer => { if (timer) timer.cleared = true },
  }, { timeout: 1000 })
  return { ...api, logs, writes, timers, fire(ms) { now += ms; const timer = timers.find(item => !item.cleared && item.ms === ms); assert.ok(timer); timer.cleared = true; timer.fn() } }
}

test('fixed bootstrap/billing aliases expose 429 and headers without body completion; child and other resources remain pending', options, () => {
  const f = fixture(), observer = observePersonalityPdfNavigation(f.page, { origin, locale: 'ru', runtime: 'isolated' })
  const bootstrap = f.request('/api/app/bootstrap?account=PRIVATE'), billing = f.request('/api/app/billing/status?token=PRIVATE')
  const image = f.request('/PRIVATE.png', { resourceType: () => 'image', frame: () => f.child })
  const outside = f.request('', { url: () => 'https://PRIVATE.invalid/PRIVATE?PRIVATE', resourceType: () => 'script' })
  for (const request of [bootstrap, billing, image, outside]) f.page.emit('request', request)
  f.page.emit('response', f.response(bootstrap)); f.page.emit('requestfinished', bootstrap)
  f.page.emit('response', f.response(billing, 429))
  const result = observer.stop('entry-failed')
  assert.equal(result.totals.status429, 1); assert.equal(result.pendingCount, 3)
  assert.deepEqual(result.pending.map(item => [item.endpoint, item.frame, item.status]), [['billing-status', 'main', 429], ['other-local-resource', 'child', null], ['external-resource', 'main', null]])
  assert.equal(result.coverage, 'requests-starting-after-observer-attachment'); assert.equal(result.preexistingRequests, 'unknown')
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|https?:|requestId|accountId|token|headers|body/)
})

test('200 headers followed by failure is not reported as a completed successful read', options, () => {
  const f = fixture(), observer = observePersonalityPdfNavigation(f.page, { origin, locale: 'en', runtime: 'isolated' }), request = f.request('/api/app/journey')
  f.page.emit('request', request); f.page.emit('response', f.response(request)); f.page.emit('requestfailed', request)
  const result = observer.stop('entry-failed')
  assert.equal(result.totals.finished, 0); assert.equal(result.totals.failed, 1)
  assert.ok(result.trace.events.some(event => event.type === 'portrait-read-failed' && event.endpoint === 'journey'))
  assert.equal(result.pendingCount, 0)
})

test('resource enums, credentials, malformed status and hostile methods cannot expose private values', options, () => {
  const f = fixture(), observer = observePersonalityPdfNavigation(f.page, { origin, locale: 'en', runtime: 'isolated' })
  for (const url of ['http://PRIVATE@127.0.0.1:3100/api/app/bootstrap', origin + '/api/app/%62ootstrap', origin + '/?' + 'PRIVATE'.repeat(3000)]) {
    const request = f.request('', { url: () => url, method: () => 'PRIVATE', resourceType: () => 'PRIVATE', frame: () => { throw Error('PRIVATE') } })
    f.page.emit('request', request); f.page.emit('response', f.response(request, { PRIVATE: true }))
  }
  const result = observer.stop('entry-failed')
  assert.ok(result.pending.every(row => row.method === 'OTHER' && row.resourceType === 'other' && row.frame === 'unavailable' && row.status === null))
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|%62|https?:/)
})

test('pending and total-request budgets are independent, finite and still surface 429 after truncation', options, () => {
  const f = fixture(), observer = observePersonalityPdfNavigation(f.page, { origin, locale: 'en', runtime: 'isolated' })
  for (let i = 0; i < 150; i++) { const request = f.request(); f.page.emit('request', request); if (i === 149) f.page.emit('response', f.response(request, 429)) }
  const result = observer.stop('entry-failed')
  assert.equal(result.pendingCount, 128); assert.equal(result.totals.droppedRequests, 22)
  assert.equal(result.totals.status429, 1); assert.equal(result.totals.unmatchedResponses, 1); assert.equal(result.incomplete, true)
  const second = observePersonalityPdfNavigation(f.page, { origin, locale: 'en', runtime: 'isolated' })
  for (let i = 0; i < 1100; i++) { const request = f.request(); f.page.emit('request', request); f.page.emit('requestfinished', request) }
  const capped = second.stop('entry-complete')
  assert.equal(capped.totals.requests, 1024); assert.equal(capped.totals.droppedRequests, 76)
})

test('response-group and unmatched-identity budgets are bounded without hiding later 429 observations', options, () => {
  const f = fixture(), observer = observePersonalityPdfNavigation(f.page, { origin, locale: 'en', runtime: 'isolated' })
  for (let i = 100; i < 180; i++) { const request = f.request(); f.page.emit('request', request); f.page.emit('response', f.response(request, i)); f.page.emit('requestfinished', request) }
  for (let i = 0; i < 1030; i++) f.page.emit('response', f.response(f.request(), 429))
  const result = observer.stop('entry-failed')
  assert.equal(result.responses.length, 64); assert.equal(result.totals.droppedResponseGroups, 16)
  assert.equal(result.totals.droppedUnmatchedIdentities, 6); assert.equal(result.responseCountsUnique, false)
  assert.equal(result.totals.status429, 1030); assert.equal(result.incomplete, true)
})

test('all own-data trace fields are re-encoded without invoking poisoned getters or inheriting secret fields', options, async () => {
  let accessed = 0
  const event = Object.assign(Object.create({ category: 'PRIVATE' }), { type: 'portrait-read-response', endpoint: 'journey', status: 429, atMs: 70000, requestId: 'PRIVATE', raw: 'PRIVATE' })
  Object.defineProperty(event, 'errorCategory', { get() { accessed++; return 'PRIVATE' } })
  const v = virtual({ portrait: () => ({ stop: () => ({ events: [event], dropped: 0, raw: 'PRIVATE' }) }) }), f = fixture()
  const observer = v.observePersonalityPdfNavigation(f.page, { origin, locale: 'en', runtime: 'isolated' })
  observer.stop = () => ({ locale: '../PRIVATE', secret: 'PRIVATE' })
  await v.preservePersonalityPdfNavigation(observer, { directory: '/synthetic', completed: false })
  assert.equal(accessed, 0); assert.equal(v.writes.length, 1)
  assert.equal(v.writes[0][0], '/synthetic/pdf-navigation-en.json'); assert.doesNotMatch(v.writes[0][1], /PRIVATE|requestId|secret|raw/)
  const result = JSON.parse(v.writes[0][1]); assert.equal(result.trace.events[0].atMs, 70000)
  await v.preservePersonalityPdfNavigation({ stop() { throw Error('PRIVATE') } }, { directory: '/synthetic' })
  assert.equal(v.writes.length, 1)
})

test('stop owns only its listeners and late callbacks cannot inspect requests or change snapshots', options, () => {
  const f = fixture(), original = () => {}, originalError = () => {}
  f.page.on('request', original); f.page.on('pageerror', originalError)
  const observer = observePersonalityPdfNavigation(f.page, { origin, locale: 'ru', runtime: 'isolated' })
  const callbacks = f.page.listeners('request'), result = observer.stop('entry-complete')
  assert.deepEqual(f.page.listeners('request'), [original]); assert.deepEqual(f.page.listeners('pageerror'), [originalError])
  for (const callback of callbacks) callback(f.request('/PRIVATE'))
  f.page.emit('load'); assert.deepEqual(observer.stop('entry-failed'), result)
})

test('deadline detaches observers, marks evidence incomplete and emits no late output', options, () => {
  const v = virtual(), f = fixture(), observer = v.observePersonalityPdfNavigation(f.page, { origin, locale: 'en', runtime: 'isolated' })
  f.page.emit('request', f.request())
  v.fire(PDF_NAVIGATION_LIMITS.deadlineMs)
  const result = observer.stop('entry-complete')
  assert.equal(result.phase, 'capture-deadline'); assert.equal(result.elapsedMs, 120000); assert.equal(result.incomplete, true)
  assert.deepEqual(f.page.eventNames(), []); f.page.emit('response', f.response(f.request(), 429))
  assert.deepEqual(observer.stop(), result); assert.equal(v.logs.length, 0)
})

test('write failure and throwing logging cannot mask the original navigation exception', options, async () => {
  const v = virtual({ writer: async () => { throw Error('PRIVATE') }, logging: () => { throw Error('PRIVATE') } }), f = fixture()
  const observer = v.observePersonalityPdfNavigation(f.page, { origin, locale: 'en', runtime: 'isolated' }), primary = Error('original navigation')
  await assert.rejects(async () => { try { throw primary } finally { await v.preservePersonalityPdfNavigation(observer, { directory: '/synthetic' }) } }, error => error === primary)
  assert.deepEqual(f.page.eventNames(), [])
})

test('writer deadline settles even a nonsettling writer; a late rejection never emits output or changes evidence', options, async () => {
  let reject
  const v = virtual({ writer: () => new Promise((_, fail) => { reject = fail }) }), f = fixture()
  const observer = v.observePersonalityPdfNavigation(f.page, { origin, locale: 'ru', runtime: 'isolated' })
  const retaining = v.preservePersonalityPdfNavigation(observer, { directory: '/synthetic' })
  v.fire(PDF_NAVIGATION_LIMITS.writeMs); await retaining
  assert.equal(v.writes[0][2].signal.aborted, true)
  const before = JSON.stringify(v.logs), evidence = v.writes[0][1]
  reject(Error('PRIVATE')); await Promise.resolve(); await Promise.resolve()
  assert.equal(JSON.stringify(v.logs), before); assert.equal(v.writes[0][1], evidence)
  assert.deepEqual(f.page.eventNames(), [])
})

test('partial initialization rolls back shared and own listeners even when on adds before throwing', options, () => {
  for (const failureAt of [1, 2]) {
    const f = fixture(), original = () => {}, on = f.page.on.bind(f.page)
    f.page.on('request', original)
    let seen = 0
    f.page.on = (type, callback) => { on(type, callback); if (type === 'requestfailed' && ++seen === failureAt) throw Error('PRIVATE'); return f.page }
    assert.throws(() => observePersonalityPdfNavigation(f.page, { origin, locale: 'en', runtime: 'isolated' }), /PRIVATE/)
    assert.deepEqual(f.page.eventNames(), ['request']); assert.deepEqual(f.page.listeners('request'), [original])
  }
})

test('cleanup attempts all page and HMR socket removals after an off failure, preserving other listeners', options, () => {
  const f = fixture(), socket = new EventEmitter(), original = () => {}, removed = []
  socket.url = () => 'ws://127.0.0.1:3100/_next/webpack-hmr'; socket.on('close', original)
  const observer = observePersonalityPdfNavigation(f.page, { origin, locale: 'en', runtime: 'isolated' })
  f.page.emit('websocket', socket)
  const off = socket.off.bind(socket)
  socket.off = (type, callback) => { removed.push(type); off(type, callback); if (type === 'framereceived') throw Error('PRIVATE'); return socket }
  const result = observer.stop('entry-failed')
  assert.deepEqual(removed, ['framereceived', 'framesent', 'close']); assert.deepEqual(socket.listeners('close'), [original])
  assert.equal(result.trace.cleanupErrors, 1); assert.equal(result.incomplete, true)
  assert.deepEqual(observer.stop(), result); assert.equal(removed.length, 3)
})

test('invalid origins/locales cannot create observers or emit any requests', options, () => {
  for (const config of [{ origin: 'https://example.com', locale: 'en' }, { origin: 'http://PRIVATE@127.0.0.1:3100', locale: 'en' }, { origin, locale: 'PRIVATE' }, { origin, locale: 'en', runtime: 'production' }]) {
    const f = fixture()
    assert.throws(() => observePersonalityPdfNavigation(f.page, { runtime: 'isolated', ...config }))
    assert.deepEqual(f.page.eventNames(), [])
  }
})

test('verifier keeps both networkidle barriers, exact PDF entry calls and every original error/PDF gate', options, () => {
  const navigate = verifierSource.slice(verifierSource.indexOf('async function navigate('), verifierSource.indexOf('async function api('))
  assert.equal((navigate.match(/await page.waitForLoadState\('networkidle'\)/g) || []).length, 2)
  assert.match(navigate, /await page.waitForLoadState\('networkidle'\)\s+await page.goto\(url\)\s+await page.waitForLoadState\('networkidle'\)/)
  assert.match(verifierSource, /await navigate\(page,origin\+'\/'\+locale\+'\/app'\)\s+await assertCabinetPortrait\(page, expect, \{ origin, locale \}\)\s+await openCabinetMyTests\(page, expect, \{ origin, locale \}\)/)
  assert.match(verifierSource, /assert\.deepEqual\(errors,\[\]\)/)
  assert.ok(verifierSource.includes("'%PDF-1.4'")); assert.ok(verifierSource.includes('bytes.length>12000'))
  assert.equal((verifierSource.match(/observePersonalityPdfNavigation\(page/g) || []).length, 1)
  assert.match(verifierSource, /for\(const locale of \['en','ru'\]\)\{\s+let navigationDiagnostics/)
})

test('actual extracted PDF entry preserves original navigation error despite observer-init and logging failures', options, async () => {
  const start = verifierSource.indexOf('  let navigationDiagnostics'), end = verifierSource.indexOf("  const download=page.waitForEvent('download'", start)
  const v = virtual({ logging: () => { throw Error('PRIVATE') } }), primary = Error('original networkidle'), calls = []
  const promise = runInNewContext('(async()=>{' + verifierSource.slice(start, end) + '})()', {
    page: {}, origin, locale: 'ru', output: '/synthetic', console: { log() { throw Error('PRIVATE') } },
    observePersonalityPdfNavigation() { throw Error('PRIVATE') }, preservePersonalityPdfNavigation: v.preservePersonalityPdfNavigation,
    async navigate() { calls.push('navigate'); throw primary }, async assertCabinetPortrait() { calls.push('portrait') }, async openCabinetMyTests() { calls.push('tests') },
  })
  await assert.rejects(promise, error => error === primary); assert.deepEqual(calls, ['navigate'])
})
