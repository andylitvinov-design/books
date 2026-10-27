import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { observePortraitNavigation } from '../scripts/helpers/portrait-navigation-diagnostics.mjs'
import { sanitizeServiceLog } from '../scripts/helpers/isolated-browser-diagnostics.mjs'

const origin = 'http://127.0.0.1:3100'
const options = { timeout: 3000 }
function fixture() {
  const page = new EventEmitter()
  const frame = { url: () => origin + '/en/app/portrait?token=secret#secret' }
  page.mainFrame = () => frame
  page.url = frame.url
  const request = (pathname, previous = null, targetFrame = frame, navigation = true) => ({
    url: () => origin + pathname, isNavigationRequest: () => navigation, frame: () => targetFrame,
    redirectedFrom: () => previous, failure: () => ({ errorText: 'ERR_ABORTED secret' }),
  })
  return { page, frame, request }
}
test('records main-frame route, redirect and status evidence without sensitive values', options, () => {
  const { page, frame, request } = fixture()
  const probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const previous = request('/en/app/portfolio?code=secret')
  const redirected = request('/en/app/portrait?session=secret', previous)
  page.emit('request', previous)
  page.emit('request', redirected)
  page.emit('response', { request: () => redirected, status: () => 307 })
  page.emit('requestfailed', previous)
  page.emit('framenavigated', frame)
  page.emit('request', request('/api/app/secret', null, frame, false))
  page.emit('request', request('/en/secret', null, {}))
  page.emit('request', { ...request('/'), url: () => 'https://external.invalid/secret' })
  const result = probe.stop()
  assert.equal(result.events.length, 5)
  assert.ok(result.events.some(e => e.type === 'navigation-request' && e.redirectedFrom === '/en/app/portfolio'))
  assert.ok(result.events.some(e => e.type === 'navigation-response' && e.status === 307))
  assert.ok(result.events.some(e => e.type === 'navigation-failed' && e.category === 'request_aborted'))
  assert.ok(result.events.some(e => e.type === 'frame-navigated' && e.pathname === '/en/app/portrait'))
  assert.doesNotMatch(JSON.stringify(result), /secret|token|code=|session|external|https?:/)
})
test('records only fixed development-console categories and preserves other listeners', options, () => {
  const { page } = fixture(), originalErrors = []
  page.on('pageerror', error => originalErrors.push(error))
  const probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  for (const text of ['[Fast Refresh] rebuilding secret', '[Fast Refresh] done in 1ms secret',
    'Fast Refresh had to perform a full reload secret', 'Authorization: secret']) {
    page.emit('console', { text: () => text })
  }
  const error = new TypeError('secret')
  page.emit('pageerror', error)
  page.emit('domcontentloaded'); page.emit('load')
  const result = probe.stop()
  assert.equal(result.events.filter(e => e.type === 'development-console').length, 3)
  assert.ok(result.events.some(e => e.category === 'fast-refresh-full-reload'))
  assert.equal(originalErrors[0], error)
  assert.doesNotMatch(JSON.stringify(result), /secret|Authorization/)
  assert.deepEqual(page.eventNames(), ['pageerror'])
})
test('isolation rejects production and malformed events stay bounded and passive', options, () => {
  for (const settings of [{ origin, runtime: 'production' }, { origin: 'https://example.com', runtime: 'isolated' }]) {
    const { page } = fixture()
    assert.throws(() => observePortraitNavigation(page, settings), /Isolated loopback/)
    assert.deepEqual(page.eventNames(), [])
  }
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  assert.doesNotThrow(() => page.emit('request', null))
  for (let i = 0; i < 300; i++) page.emit('load')
  const result = probe.stop()
  assert.equal(result.events.length, 200); assert.ok(result.dropped > 0)
  assert.ok(result.events.every(e => Number.isInteger(e.atMs) && e.atMs >= 0))
  assert.deepEqual(page.eventNames(), [])
  page.emit('load'); assert.deepEqual(probe.stop(), result)
})
test('explicit goto phases mask dynamic routes and ignore unknown labels', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  probe.mark('goto-start', '/en/app/runs/secret?token=secret')
  probe.mark('secret', '/en/app')
  const result = probe.stop()
  assert.equal(result.events.length, 1)
  assert.equal(result.events[0].target, '/en/app/runs/[segment]')
  assert.equal(result.events[0].pathname, '/en/app/portrait')
  assert.doesNotMatch(JSON.stringify(result), /secret|token/)
})
const sourceURL = new URL('../scripts/verify-portrait-mobile.mjs', import.meta.url)
async function actualOpen(page, diagnostics) {
  const source = await readFile(sourceURL, 'utf8')
  const start = source.indexOf('const open = '), end = source.indexOf('\nconst card = ', start)
  assert.ok(start > 0 && end > start)
  return runInNewContext(source.slice(start, end) + '\nopen', { page, navigationDiagnostics: diagnostics, origin }, { timeout: 1000 })
}
test('actual goto preserves original navigation failure and never retries', options, async () => {
  const failure = new Error('synthetic navigation interrupted')
  const calls = [], marks = []
  const open = await actualOpen({ goto: async (...args) => { calls.push(args); throw failure } }, { mark: (...args) => marks.push(args) })
  await assert.rejects(open('/en/app/portfolio'), error => error === failure)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], origin + '/en/app/portfolio')
  assert.equal(calls[0][1].waitUntil, 'domcontentloaded')
  assert.equal(calls[0][1].timeout, 90000)
  assert.deepEqual(marks, [['goto-start', '/en/app/portfolio'], ['goto-failed', '/en/app/portfolio']])
})
test('actual goto preserves successful response and same destination', options, async () => {
  const response = {}, calls = [], marks = []
  const open = await actualOpen({ goto: async (...args) => { calls.push(args); return response } }, { mark: (...args) => marks.push(args) })
  assert.equal(await open('/ru/app/portfolio'), response)
  assert.equal(calls.length, 1); assert.equal(calls[0][0], origin + '/ru/app/portfolio')
  assert.deepEqual(marks, [['goto-start', '/ru/app/portfolio'], ['goto-complete', '/ru/app/portfolio']])
})
test('actual finally persists failed-navigation evidence without masking failure or cleanup', options, async () => {
  const source = await readFile(sourceURL, 'utf8'), start = source.lastIndexOf('} finally {')
  assert.ok(start > 0)
  const body = source.slice(start + '} finally {'.length, source.lastIndexOf('}'))
  const calls = []
  await runInNewContext('(async () => {' + body + '})()', {
    completed: false, output: '/synthetic', name: 'webkit',
    navigationDiagnostics: { mark: value => calls.push(value), stop: () => ({ events: ['sanitized'] }) },
    writeFile: async (path, content) => { calls.push([path, JSON.parse(content)]); throw new Error('synthetic disk failure') },
    console: { warn: value => calls.push(value) },
    context: { close: async () => calls.push('context-close') }, browser: { close: async () => calls.push('browser-close') },
  }, { timeout: 1000 })
  assert.equal(calls[0], 'failure')
  assert.equal(calls[1][0], '/synthetic/webkit-navigation.json')
  assert.deepEqual(calls[1][1], { events: ['sanitized'] })
  assert.deepEqual(calls.slice(2), ['PORTRAIT_NAVIGATION_DIAGNOSTICS_UNAVAILABLE', 'context-close', 'browser-close'])
})
test('filtered Next metadata retains route/status timing but no raw secret material', options, () => {
  const result = sanitizeServiceLog('GET /en/app/portfolio?code=secret 307 in 123ms\nGET /en/app/portrait?token=secret 200 in 2s\nAuthorization: secret\nCookie: secret\nbody: secret', { origin, source: 'next' })
  assert.equal(result.events.length, 2)
  assert.equal(result.events[0].pathname, '/en/app/portfolio')
  assert.equal(result.events[0].status, 307)
  assert.equal(result.events[1].durationMs, 2000)
  assert.doesNotMatch(JSON.stringify(result), /secret|Authorization|Cookie|token|code=/)
})
test('workflow preserves only filtered Next metadata after failure; hard browser gates remain', options, async () => {
  const workflow = await readFile(new URL('../.github/workflows/hh-portrait-mobile-browser.yml', import.meta.url), 'utf8')
  assert.match(workflow, /name: Preserve sanitized synthetic Next diagnostics on failure\s+if: failure\(\)\s+timeout-minutes: 1/)
  assert.match(workflow, /import \{ preserveIsolatedServiceDiagnostics \}/)
  assert.match(workflow, /sources: \[\['\/tmp\/hh-portrait-next\.log', 'next'\]\]/)
  assert.doesNotMatch(workflow, /(?:cat|cp|tail)\s+\/tmp\/hh-portrait-(?:next|auth)\.log/)
  const source = await readFile(sourceURL, 'utf8')
  assert.match(source, /const maxSpan = shortViewport \? 470 : 535/)
  assert.match(source, /frame\.firstTop >= -2 && frame\.lastBottom <= frame\.viewportHeight - 70/)
  assert.match(source, /assert\.equal\(appProblems\.length,0/)
  assert.ok(source.indexOf('observePortraitNavigation(page, { origin })') < source.indexOf("await open('/en/app/portrait')"))
  assert.match(source, /navigationDiagnostics\.mark\('signed-in'\)/)
})

function socket(url = 'ws://127.0.0.1:3100/_next/webpack-hmr?secret=secret') {
  const value = new EventEmitter()
  value.url = () => url
  return value
}
const emitFrame = (target, direction, message) => target.emit(direction, { payload: JSON.stringify(message) })
test('HMR reports fixed incoming actions and actual outgoing reload signals, never payloads', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' }), ws = socket()
  page.emit('websocket', ws)
  emitFrame(ws, 'framereceived', { action: 'building', hash: 'secret' })
  emitFrame(ws, 'framereceived', { action: 'serverComponentChanges', data: 'secret' })
  emitFrame(ws, 'framesent', { event: 'client-full-reload', hadRuntimeError: true, stackTrace: 'secret', dependencyChain: ['secret'], clientId: 'secret' })
  emitFrame(ws, 'framesent', { event: 'client-reload-page', hadRuntimeError: false, token: 'secret' })
  emitFrame(ws, 'framesent', { event: 'server-component-reload-page', hash: 'secret' })
  emitFrame(ws, 'framesent', { event: 'client-error', error: 'secret' })
  emitFrame(ws, 'framereceived', { action: 'secret', data: 'secret' })
  const result = probe.stop()
  assert.equal(result.events.length, 6)
  assert.deepEqual(result.events.filter(e => e.type === 'hmr-received').map(e => e.action), ['building', 'serverComponentChanges'])
  const sent = result.events.filter(e => e.type === 'hmr-sent')
  assert.deepEqual(sent.map(e => e.event), ['client-full-reload', 'client-reload-page', 'server-component-reload-page'])
  assert.equal(sent[0].hadRuntimeError, true); assert.equal(sent[1].hadRuntimeError, false)
  assert.doesNotMatch(JSON.stringify(result), /secret|stack|dependency|hash|clientId|token|ws:/)
  assert.deepEqual(ws.eventNames(), [])
})
test('only the exact same-loopback HMR socket is observed, not auth or external sockets', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  for (const url of ['ws://external.invalid/_next/webpack-hmr', 'ws://127.0.0.1:54329/_next/webpack-hmr',
    'ws://127.0.0.1:3100/api/auth', 'wss://127.0.0.1:3100/_next/webpack-hmr',
    'ws://secret@127.0.0.1:3100/_next/webpack-hmr']) {
    const ws = socket(url); page.emit('websocket', ws)
    assert.deepEqual(ws.eventNames(), [])
    emitFrame(ws, 'framesent', { event: 'client-full-reload', hadRuntimeError: true, secret: 'secret' })
  }
  assert.equal(probe.stop().events.length, 0)
})
test('HMR enforces UTF-8 byte limit and drops binary/malformed frames without exposing raw values', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' }), ws = socket()
  page.emit('websocket', ws)
  emitFrame(ws, 'framesent', { event: 'client-full-reload', stackTrace: 'ю'.repeat(9000) })
  ws.emit('framesent', { payload: Buffer.from('secret') })
  ws.emit('framesent', { payload: '{secret' })
  emitFrame(ws, 'framesent', { event: 'client-full-reload', hadRuntimeError: 'secret', stackTrace: 'secret' })
  const result = probe.stop()
  assert.equal(result.events.filter(e => e.type === 'hmr-frame-dropped').length, 2)
  assert.equal(result.events.filter(e => e.type === 'hmr-frame-invalid').length, 1)
  const sent = result.events.filter(e => e.type === 'hmr-sent')
  assert.equal(sent.length, 1); assert.ok(!Object.hasOwn(sent[0], 'hadRuntimeError'))
  assert.doesNotMatch(JSON.stringify(result), /secret|ю|stackTrace/)
})
test('HMR observers are bounded and cleanup leaves original socket listeners intact', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' }), sockets = []
  let originalCalls = 0
  for (let i = 0; i < 9; i++) {
    const ws = socket(); sockets.push(ws); ws.on('framesent', () => { originalCalls++ }); page.emit('websocket', ws)
  }
  assert.equal(sockets[8].listenerCount('framesent'), 1)
  for (let i = 0; i < 300; i++) emitFrame(sockets[0], 'framesent', { event: 'client-reload-page' })
  const result = probe.stop()
  assert.equal(result.events.length, 200); assert.ok(result.dropped > 0)
  assert.ok(result.events.some(e => e.type === 'hmr-socket-limit'))
  for (const ws of sockets) assert.deepEqual(ws.eventNames(), ['framesent'])
  assert.equal(originalCalls, 300)
  emitFrame(sockets[0], 'framesent', { event: 'client-reload-page' })
  assert.equal(originalCalls, 301); assert.deepEqual(probe.stop(), result)
})
test('page errors include only a fixed Error.name class and still reach original error listener', options, () => {
  const { page } = fixture(), errors = []
  page.on('pageerror', error => errors.push(error))
  const probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const safe = new TypeError('secret'), arbitrary = { name: 'secret', message: 'secret', stack: 'secret' }
  page.emit('pageerror', safe); page.emit('pageerror', arbitrary)
  const result = probe.stop()
  assert.deepEqual(result.events.map(e => e.errorName), ['TypeError', 'Other'])
  assert.deepEqual(errors, [safe, arbitrary])
  assert.doesNotMatch(JSON.stringify(result), /secret|message|stack/)
})
