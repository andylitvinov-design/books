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

test('full reload details distinguish absent, null, empty, non-text and classified error without inventing a cause', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' }), ws = socket()
  page.emit('websocket', ws)
  const details = [
    {}, { stackTrace: null }, { stackTrace: '' }, { stackTrace: { secret: 'secret' } },
    { stackTrace: 'ChunkLoadError: Loading hot update chunk secret failed.\n(error: https://secret.invalid/token)' },
    { stackTrace: 'Error: Failed to fetch update manifest secret\nsecret stack' },
    { stackTrace: 'Error: secret application fault\nsecret stack' },
  ]
  for (const detail of details) emitFrame(ws, 'framesent', { event: 'client-full-reload', hadRuntimeError: false, ...detail })
  emitFrame(ws, 'framesent', { event: 'client-reload-page', stackTrace: 'secret' })
  const result = probe.stop(), sent = result.events.filter(e => e.event === 'client-full-reload')
  assert.deepEqual(sent.map(e => e.errorDetails), ['absent', 'null', 'empty', 'non_text', 'text', 'text', 'text'])
  assert.deepEqual(sent.slice(4).map(e => e.errorCategory), ['hmr_chunk_load_error', 'hmr_manifest_fetch_error', 'unclassified_error'])
  assert.ok(sent.every(e => e.hadRuntimeError === false))
  assert.ok(sent.slice(0, 4).every(e => !Object.hasOwn(e, 'errorCategory')))
  assert.ok(!Object.hasOwn(result.events.at(-1), 'errorDetails'))
  assert.doesNotMatch(JSON.stringify(result), /secret|stackTrace|token|https?:|cause|benign/)
})

test('only same-loopback main-frame hot-update assets expose kind and response status, never names or content', options, () => {
  const { page, request } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const manifest = request('/_next/static/webpack/secret.hot-update.json?token=secret', null, page.mainFrame(), false)
  const chunk = request('/_next/static/webpack/app/private-secret.secret.hot-update.js?token=secret', null, page.mainFrame(), false)
  page.emit('request', manifest)
  page.emit('response', { request: () => manifest, status: () => 404 })
  page.emit('request', chunk)
  page.emit('response', { request: () => chunk, status: () => 200 })
  page.emit('requestfailed', { ...chunk, failure: () => ({ errorText: 'Frame load interrupted secret' }) })
  const result = probe.stop()
  assert.deepEqual(result.events.map(({ atMs, ...event }) => event), [
    { type: 'hmr-asset-request', asset: 'manifest' },
    { type: 'hmr-asset-response', asset: 'manifest', status: 404 },
    { type: 'hmr-asset-request', asset: 'chunk' },
    { type: 'hmr-asset-response', asset: 'chunk', status: 200 },
    { type: 'hmr-asset-failed', asset: 'chunk', category: 'navigation_interrupted' },
  ])
  assert.doesNotMatch(JSON.stringify(result), /secret|private|token|http|pathname|headers|body/)
})

test('hot-update observation rejects other origins, ports, credentials, frames, paths and oversized URLs', options, () => {
  const { page, request } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const good = request('/_next/static/webpack/secret.hot-update.json', null, page.mainFrame(), false)
  for (const url of ['https://127.0.0.1:3100/_next/static/webpack/secret.hot-update.json',
    'http://external.invalid/_next/static/webpack/secret.hot-update.json',
    'http://127.0.0.1:54329/_next/static/webpack/secret.hot-update.json',
    'http://secret@127.0.0.1:3100/_next/static/webpack/secret.hot-update.json',
    origin + '/api/app/secret.hot-update.json', origin + '/_next/static/chunks/secret.js',
    origin + '/_next/static/webpack/' + 's'.repeat(16384) + '.hot-update.json']) {
    const bad = { ...good, url: () => url }
    page.emit('request', bad)
    page.emit('response', { request: () => bad, status: () => 404 })
    page.emit('requestfailed', bad)
  }
  page.emit('request', { ...good, frame: () => ({}) })
  assert.deepEqual(probe.stop().events, [])
})

test('opaque events, named chunk failures, WebKit errors and actual runtime errors stay classified and fail-capable', options, () => {
  const { page } = fixture(), original = []
  page.on('pageerror', error => original.push(error))
  const probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const errors = [
    { name: '', message: '[object Event]' },
    { name: 'ChunkLoadError', message: 'Loading chunk secret failed.' },
    { name: 'ChunkLoadError', message: 'Loading hot update chunk secret failed.' },
    { name: 'TypeError', message: 'Load failed' },
    { name: 'Error', message: 'Refused to connect due to Content Security Policy secret' },
    { name: 'Error', message: 'Failed request /__nextjs_original-stack-frames?secret' },
    new TypeError('secret app failure'), new SyntaxError('secret app failure'),
    { name: 'secret', message: 'secret application failure', stack: 'secret' },
    { name: 'Error', message: 'x'.repeat(4096) + 'Failed to fetch update manifest secret' },
  ]
  errors.forEach(error => page.emit('pageerror', error))
  const result = probe.stop()
  assert.deepEqual(result.events.map(e => e.category), ['opaque_event', 'chunk_load_error', 'hmr_chunk_load_error',
    'network_load_error', 'content_security_policy_error', 'development_overlay_request_error',
    'javascript_type_error', 'javascript_syntax_error', 'unclassified_error', 'unclassified_error'])
  assert.deepEqual(result.events.slice(0, 3).map(e => e.errorName), ['Other', 'ChunkLoadError', 'ChunkLoadError'])
  assert.deepEqual(original, errors)
  assert.deepEqual(page.eventNames(), ['pageerror'])
  assert.doesNotMatch(JSON.stringify(result), /secret|message|stack|ignored|waived/)
})

test('hot-update diagnostics retain the total event cap and own-listener cleanup', options, () => {
  const { page, request } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const asset = request('/_next/static/webpack/secret.hot-update.json', null, page.mainFrame(), false)
  for (let i = 0; i < 300; i++) page.emit('response', { request: () => asset, status: () => 404 })
  const result = probe.stop()
  assert.equal(result.events.length, 200)
  assert.equal(result.dropped, 100)
  assert.deepEqual(page.eventNames(), [])
  page.emit('response', { request: () => asset, status: () => 404 })
  assert.deepEqual(probe.stop(), result)
})

const readPaths = ['/api/app/journey', '/api/app/express-reports', '/api/app/development-goals', '/api/free-express/claim']
const readAliases = ['journey', 'express-reports', 'development-goals', 'free-express-claim']
function readRequest(page, path = readPaths[0], overrides = {}) {
  const forbidden = () => { throw new Error('private data must not be inspected') }
  return {
    url: () => origin + path, frame: () => page.mainFrame(), isNavigationRequest: () => false,
    method: () => 'GET', resourceType: () => 'fetch', failure: () => ({ errorText: 'ERR_ABORTED secret' }),
    headers: forbidden, allHeaders: forbidden, postData: forbidden, postDataJSON: forbidden,
    ...overrides,
  }
}
const withoutTime = events => events.map(({ atMs, ...event }) => event)

test('four read aliases preserve per-request identity, headers and distinct terminal outcomes', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const requests = [...readPaths, ...readPaths].map(path => readRequest(page, path + '?account=secret#secret'))
  requests.forEach(request => page.emit('request', request))
  for (let i = 0; i < 4; i++) {
    page.emit('response', { request: () => requests[i], status: () => 200, body: () => { throw Error('forbidden') } })
    page.emit('requestfinished', requests[i])
  }
  for (const request of requests.slice(4)) page.emit('requestfailed', request)
  const events = withoutTime(probe.stop().events)
  assert.deepEqual(events.slice(0, 8), [...readAliases, ...readAliases].map((endpoint, i) => ({
    type: 'portrait-read-request', requestId: i + 1, endpoint, method: 'GET', resourceType: 'fetch',
  })))
  assert.deepEqual(events.slice(8, 16), readAliases.flatMap((endpoint, i) => [
    { type: 'portrait-read-response', requestId: i + 1, endpoint, status: 200 },
    { type: 'portrait-read-finished', requestId: i + 1, endpoint },
  ]))
  assert.deepEqual(events.slice(16), readAliases.map((endpoint, i) => ({
    type: 'portrait-read-failed', requestId: i + 5, endpoint, category: 'request_aborted',
  })))
  assert.doesNotMatch(JSON.stringify(events), /secret|account|token|https?:|headers|body|query|fragment/)
})

test('read lifecycle distinguishes successful headers from body interruption and server failures', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const interrupted = readRequest(page), denied = readRequest(page, readPaths[1])
  page.emit('request', interrupted)
  page.emit('response', { request: () => interrupted, status: () => 200 })
  page.emit('requestfailed', interrupted)
  page.emit('request', denied)
  page.emit('response', { request: () => denied, status: () => 503 })
  page.emit('requestfinished', denied)
  assert.deepEqual(withoutTime(probe.stop().events).map(event => [event.type, event.requestId, event.status ?? event.category ?? null]), [
    ['portrait-read-request', 1, null], ['portrait-read-response', 1, 200], ['portrait-read-failed', 1, 'request_aborted'],
    ['portrait-read-request', 2, null], ['portrait-read-response', 2, 503], ['portrait-read-finished', 2, null],
  ])
})

test('read scope rejects other origins, protocols, ports, credentials, frames, methods and paths', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const invalid = [
    ...['https://127.0.0.1:3100/api/app/journey', 'http://external.invalid/api/app/journey',
      'http://127.0.0.1:54329/api/app/journey', 'http://secret@127.0.0.1:3100/api/app/journey',
      'http://127.0.0.1:3100/api/app/journey/secret', 'http://127.0.0.1:3100/api/app/%6aourney',
      origin + '/api/app/journey?' + 's'.repeat(16384), origin + '/api/app/bootstrap/unknown',
      origin + '/api/free-express/claim/secret'].map(url => ({ url: () => url })),
    { frame: () => ({}) }, { method: () => 'POST' }, { method: () => 'DELETE' },
  ]
  for (const override of invalid) {
    const request = readRequest(page, readPaths[0], override)
    page.emit('request', request)
    page.emit('response', { request: () => request, status: () => 200 })
    page.emit('requestfinished', request); page.emit('requestfailed', request)
  }
  const navigation = readRequest(page, readPaths[0], { isNavigationRequest: () => true, redirectedFrom: () => null })
  page.emit('request', navigation)
  assert.ok(probe.stop().events.every(event => !event.type.startsWith('portrait-read')))
  assert.equal(probe.stop().events.filter(event => event.type === 'diagnostic-unavailable').length, 0)
})

test('read identities do not duplicate starts, responses, terminals or invent missed requests', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const request = readRequest(page), missed = readRequest(page, readPaths[1])
  const response = { request: () => request, status: () => 200 }
  page.emit('response', { request: () => missed, status: () => 200 }); page.emit('requestfinished', missed)
  page.emit('request', request); page.emit('request', request)
  page.emit('response', response); page.emit('response', response)
  page.emit('requestfinished', request); page.emit('requestfailed', request); page.emit('requestfinished', request)
  page.emit('response', response); page.emit('request', request)
  assert.deepEqual(probe.stop().events.map(event => event.type), ['portrait-read-request', 'portrait-read-response', 'portrait-read-finished'])
})

test('read resource and response values stay fixed or bounded, never copied from arbitrary metadata', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  for (const [i, resourceType] of ['fetch', 'xhr', 'secret'].entries()) {
    const request = readRequest(page, readPaths[i], { resourceType: () => resourceType })
    page.emit('request', request)
    page.emit('response', { request: () => request, status: () => [0, 600, 'secret'][i] })
  }
  const events = probe.stop().events
  assert.deepEqual(events.filter(event => event.type === 'portrait-read-request').map(event => event.resourceType), ['fetch', 'xhr', 'other'])
  assert.deepEqual(events.filter(event => event.type === 'portrait-read-response').map(event => event.status), [null, null, null])
  assert.doesNotMatch(JSON.stringify(events), /secret/)
})

test('read request budget stays finite and cleanup preserves original listeners', options, () => {
  const { page } = fixture(), original = []
  page.on('requestfinished', request => original.push(request))
  const probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const requests = Array.from({ length: 80 }, () => readRequest(page))
  requests.forEach(request => page.emit('request', request))
  requests.forEach(request => page.emit('requestfinished', request))
  const result = probe.stop()
  assert.deepEqual(result.events.filter(event => event.type === 'portrait-read-request').map(event => event.requestId), Array.from({ length: 64 }, (_, i) => i + 1))
  assert.equal(result.events.filter(event => event.type === 'portrait-read-limit').length, 1)
  assert.equal(result.events.filter(event => event.type === 'portrait-read-finished').length, 64)
  assert.equal(result.dropped, 0)
  assert.deepEqual(page.eventNames(), ['requestfinished']); assert.equal(original.length, 80)
  page.emit('requestfinished', requests[0]); assert.equal(original.length, 81)
  assert.deepEqual(probe.stop(), result)
})

test('read events share the unchanged 200-event cap rather than creating an unbounded ledger', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  for (let i = 0; i < 195; i++) page.emit('load')
  for (let i = 0; i < 4; i++) {
    const request = readRequest(page)
    page.emit('request', request); page.emit('response', { request: () => request, status: () => 200 }); page.emit('requestfinished', request)
  }
  const result = probe.stop()
  assert.equal(result.events.length, 200); assert.equal(result.dropped, 7)
  assert.deepEqual(page.eventNames(), [])
})

test('access-control text remains a failure class, not an inferred cancellation or an ignored page error', options, () => {
  const { page } = fixture(), original = []
  page.on('pageerror', error => original.push(error))
  const probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const error = { name: 'Fetch API cannot load http', message: '/127.0.0.1:3100/api/app/journey?secret due to access control checks.', stack: 'secret' }
  page.emit('pageerror', error)
  const request = readRequest(page, readPaths[0], { failure: () => ({ errorText: 'secret due to access control checks.' }) })
  page.emit('request', request); page.emit('requestfailed', request)
  const result = probe.stop()
  assert.equal(result.events[0].category, 'access_control_error'); assert.equal(result.events[0].errorName, 'Other')
  assert.equal(result.events.at(-1).category, 'access_control_error')
  assert.deepEqual(original, [error]); assert.deepEqual(page.eventNames(), ['pageerror'])
  assert.doesNotMatch(JSON.stringify(result), /secret|http|stack|ignored|waived|benign|request_aborted/)
})

// Mirrors Playwright1.63.0 splitErrorMessage: the first colon is the URL scheme
// delimiter, and substring(index+2) consumes its first slash as well.
function nativeFetchError(url, initiator = 'Fetch API') {
  const text = initiator + ' cannot load ' + url + ' due to access control checks.'
  const index = text.indexOf(':')
  return { name: text.slice(0, index), message: text.substring(index + 2), stack: 'secret' }
}

test('native WebKit error text yields only fixed same-origin targets after pinned Playwright splitting', options, () => {
  const { page } = fixture(), original = []
  page.on('pageerror', error => original.push(error))
  const probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const paths = [...readPaths, '/_next/static/webpack/secret.hot-update.json', '/_next/static/webpack/app/private-secret.secret.hot-update.js']
  const errors = paths.map((path, i) => nativeFetchError(origin + path + '?account=secret#private', i % 2 ? 'XMLHttpRequest' : 'Fetch API'))
  errors.forEach(error => page.emit('pageerror', error))
  const result = probe.stop()
  assert.deepEqual(result.events.map(event => event.errorTarget), [...readAliases, 'hot-update-manifest', 'hot-update-chunk'])
  assert.ok(result.events.every(event => event.category === 'access_control_error' && event.errorName === 'Other'))
  assert.deepEqual(original, errors); assert.deepEqual(page.eventNames(), ['pageerror'])
  assert.doesNotMatch(JSON.stringify(result), /secret|private|account|https?:|message|stack|query|fragment|ignored|benign/)
})

test('complete native text in HMR details is classified but plain Load failed has no invented target', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' }), ws = socket()
  page.emit('websocket', ws)
  for (const stackTrace of [
    'Fetch API cannot load ' + origin + '/_next/static/webpack/secret.hot-update.json?secret due to access control checks.\nsecret stack',
    'Error: XMLHttpRequest cannot load ' + origin + '/api/app/journey?secret due to access control checks.\nsecret stack',
    'TypeError: Load failed\n at fetch (' + origin + '/_next/static/webpack/secret.hot-update.json)',
  ]) emitFrame(ws, 'framesent', { event: 'client-full-reload', hadRuntimeError: false, stackTrace })
  const events = probe.stop().events.filter(event => event.type === 'hmr-sent')
  assert.deepEqual(events.map(event => event.errorTarget), ['hot-update-manifest', 'journey', undefined])
  assert.deepEqual(events.map(event => event.errorCategory), ['access_control_error', 'access_control_error', 'network_load_error'])
  assert.ok(events.every(event => event.errorDetails === 'text' && event.hadRuntimeError === false))
  assert.ok(!Object.hasOwn(events[2], 'errorTarget'))
  assert.doesNotMatch(JSON.stringify(events), /secret|https?:|stack|fetch|cause|benign/)
})

test('native error target rejects foreign origins, credentials, unknown paths and deceptive message shapes', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const urls = [
    'https://127.0.0.1:3100/api/app/journey', 'http://external.invalid/api/app/journey',
    'http://127.0.0.1:54329/api/app/journey', 'http://secret@127.0.0.1:3100/api/app/journey',
    origin + '/api/app/journey/private', origin + '/api/app/%6aourney', origin + '/api/app/bootstrap/unknown',
    origin + '/_next/static/chunks/secret.js', origin + '/other?next=/_next/static/webpack/secret.hot-update.json',
    origin + '/_next/static/webpack/secret…secret.hot-update.json', origin + '/_next/static/webpack/secret...secret.hot-update.json',
    origin + '/_next/static/webpack/secret%e2%80%a6secret.hot-update.json',
    'http:///127.0.0.1:3100/api/app/journey', 'http:////127.0.0.1:3100/api/app/journey',
    'http://127.0.0.1:3100\\api\\app\\journey',
  ]
  const good = 'Fetch API cannot load ' + origin + '/api/app/journey due to access control checks.'
  const malformed = [
    { name: 'Error', message: 'Unrelated failure at ' + origin + '/api/app/journey due to access control checks.' },
    { name: 'Error', message: 'secret\n' + good },
    { name: 'Error', message: good.replace('due to access control checks.', 'Load failed') },
    { name: 'Fetch API cannot load http', message: '//127.0.0.1:3100/api/app/journey due to access control checks.' },
    { name: 'secret', message: '/127.0.0.1:3100/api/app/journey due to access control checks.' },
    { message: '/127.0.0.1:3100/api/app/journey due to access control checks.' },
    { name: 'Fetch API cannot load http:', message: '/127.0.0.1:3100/api/app/journey due to access control checks.' },
    { name: 'Error', message: 'secret', stack: good },
    { name: 'Error', message: good + '\n' + 's'.repeat(4096) },
  ]
  for (const error of [...urls.map(url => nativeFetchError(url)), ...malformed]) page.emit('pageerror', error)
  const result = probe.stop()
  assert.equal(result.events.length, urls.length + malformed.length)
  assert.ok(result.events.every(event => !Object.hasOwn(event, 'errorTarget')))
  assert.doesNotMatch(JSON.stringify(result), /secret|private|https?:|message|stack|unavailable/)
})

test('error target aliases preserve event bounds and never create request identities', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  for (let i = 0; i < 220; i++) page.emit('pageerror', nativeFetchError(origin + '/api/free-express/claim?secret'))
  const result = probe.stop()
  assert.equal(result.events.length, 200); assert.equal(result.dropped, 20)
  assert.ok(result.events.every(event => event.errorTarget === 'free-express-claim'))
  assert.ok(result.events.every(event => !Object.hasOwn(event, 'requestId')))
  assert.deepEqual(page.eventNames(), [])
})

test('real verifier finally emits safe target aliases while its unchanged pageerror gate still rejects', options, async () => {
  const source = await readFile(sourceURL, 'utf8')
  const start = source.lastIndexOf('} finally {')
  assert.ok(start > 0)
  const body = source.slice(start + '} finally {'.length, source.lastIndexOf('}'))
  for (const completed of [false, true]) {
    const { page } = fixture(), problems = [], writes = [], cleanup = []
    page.on('pageerror', error => problems.push(String(error.message).slice(0, 250)))
    const probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
    page.emit('pageerror', nativeFetchError(origin + '/_next/static/webpack/secret.hot-update.json?account=secret#secret'))
    await runInNewContext('(async () => {' + body + '})()', {
      completed, output: '/synthetic', name: 'webkit', navigationDiagnostics: probe,
      writeFile: async (path, content) => writes.push({ path, content: JSON.parse(content) }),
      console: { warn: () => { throw Error('unexpected artifact failure') } },
      context: { close: async () => cleanup.push('context') }, browser: { close: async () => cleanup.push('browser') },
    }, { timeout: 1000 })
    assert.equal(writes.length, 1); assert.equal(writes[0].path, '/synthetic/webkit-navigation.json')
    assert.equal(writes[0].content.events[0].errorTarget, 'hot-update-manifest')
    assert.equal(writes[0].content.events.at(-1).phase, completed ? 'success' : 'failure')
    assert.doesNotMatch(JSON.stringify(writes), /secret|account|https?:|message|stack/)
    assert.deepEqual(cleanup, ['context', 'browser']); assert.deepEqual(page.eventNames(), ['pageerror'])
    const gateStart = source.indexOf('const devOverlayBlocked = ')
    const gateEnd = source.indexOf("console.log('PORTRAIT_QA_SUCCESS'", gateStart)
    assert.ok(gateStart > 0 && gateEnd > gateStart)
    assert.throws(() => runInNewContext(source.slice(gateStart, gateEnd), { problems, assert }, { timeout: 1000 }),
      error => error.code === 'ERR_ASSERTION' && error.actual === 1 && error.expected === 0)
  }
})

// This observes only the already-issued isolated app bootstrap. It neither
// fulfills a fixture nor establishes that navigation caused a fetch failure.
test('bootstrap diagnostics distinguish two concurrent request identities at a locale transition without inferring causality', options, () => {
  const { page } = fixture(), original = []
  page.on('pageerror', error => original.push(error))
  const probe = observePortraitNavigation(page, { origin, runtime: 'isolated' })
  const first = readRequest(page, '/api/app/bootstrap?view=portrait&token=secret')
  const second = readRequest(page, '/api/app/bootstrap?token=secret')
  page.emit('request', first); page.emit('request', second)
  probe.mark('goto-start', '/ru/app/portfolio')
  const errors = [nativeFetchError(origin + '/api/app/bootstrap?token=secret'), nativeFetchError(origin + '/api/app/bootstrap')]
  errors.forEach(error => page.emit('pageerror', error))
  page.emit('requestfailed', second); page.emit('requestfailed', first)
  const result = probe.stop(), events = withoutTime(result.events)
  assert.deepEqual(events.filter(event => event.type === 'portrait-read-request'), [
    { type:'portrait-read-request',requestId:1,endpoint:'bootstrap',method:'GET',resourceType:'fetch' },
    { type:'portrait-read-request',requestId:2,endpoint:'bootstrap',method:'GET',resourceType:'fetch' },
  ])
  assert.deepEqual(events.filter(event => event.type === 'portrait-read-failed').map(event => [event.requestId,event.endpoint,event.category]),
    [[2,'bootstrap','request_aborted'],[1,'bootstrap','request_aborted']])
  const classified = events.filter(event => event.type === 'page-error')
  assert.equal(classified.length,2)
  assert.ok(classified.every(event => event.errorTarget === 'bootstrap' && event.category === 'access_control_error'))
  assert.ok(classified.every(event => !Object.hasOwn(event,'requestId')), 'Error text must not fabricate a matching Request identity')
  assert.deepEqual(original,errors)
  assert.ok(result.events.every(event => Number.isInteger(event.atMs) && event.atMs >= 0))
  assert.doesNotMatch(JSON.stringify(result), /secret|token|https?:|cause|benign|ignored|waived/)
  assert.deepEqual(page.eventNames(),['pageerror'])
})

test('bootstrap diagnostics retain observed response status and terminals but never inspect headers, cookies or bodies', options, () => {
  const { page } = fixture(), probe = observePortraitNavigation(page, { origin, runtime:'isolated' })
  let sensitiveReads = 0
  const forbidden = () => { sensitiveReads++; throw Error('secret') }
  const requests = [200,503].map(() => readRequest(page,'/api/app/bootstrap',{
    headers:forbidden,allHeaders:forbidden,postData:forbidden,postDataJSON:forbidden,
  }))
  const missed = readRequest(page,'/api/app/bootstrap')
  page.emit('response',{request:()=>missed,status:()=>200}); page.emit('requestfinished',missed)
  requests.forEach((request,index) => {
    const response={request:()=>request,status:()=>index===0?200:503,headers:forbidden,allHeaders:forbidden,body:forbidden,json:forbidden,text:forbidden}
    page.emit('request',request);page.emit('request',request)
    page.emit('response',response);page.emit('response',response)
    page.emit('requestfinished',request);page.emit('requestfailed',request)
  })
  const result=probe.stop()
  assert.deepEqual(withoutTime(result.events),[1,2].flatMap((requestId,index)=>[
    {type:'portrait-read-request',requestId,endpoint:'bootstrap',method:'GET',resourceType:'fetch'},
    {type:'portrait-read-response',requestId,endpoint:'bootstrap',status:index===0?200:503},
    {type:'portrait-read-finished',requestId,endpoint:'bootstrap'},
  ]))
  assert.equal(sensitiveReads,0)
  assert.doesNotMatch(JSON.stringify(result),/secret|headers|cookie|body|https?:/i)
})

test('bootstrap observation rejects changed origin, private paths, navigation, non-GET and foreign frames', options, () => {
  const { page } = fixture(), probe=observePortraitNavigation(page,{origin,runtime:'isolated'})
  const overrides=[
    ...['https://127.0.0.1:3100/api/app/bootstrap','http://127.0.0.1:54329/api/app/bootstrap',
      'http://external.invalid/api/app/bootstrap','http://secret@127.0.0.1:3100/api/app/bootstrap',
      origin+'/api/app/bootstrap/private',origin+'/api/app/%62ootstrap',origin+'/api/app/private-bootstrap',
      origin+'/api/app/bootstrap?'+ 's'.repeat(16384)].map(url=>({url:()=>url})),
    {frame:()=>({})},{method:()=> 'POST'},{method:()=> 'DELETE'},
  ]
  for(const override of overrides){
    const request=readRequest(page,'/api/app/bootstrap',override)
    page.emit('request',request);page.emit('response',{request:()=>request,status:()=>200});page.emit('requestfinished',request)
  }
  const navigation=readRequest(page,'/api/app/bootstrap',{isNavigationRequest:()=>true,redirectedFrom:()=>null})
  page.emit('request',navigation)
  assert.ok(probe.stop().events.every(event=>!event.type.startsWith('portrait-read')))
  assert.doesNotMatch(JSON.stringify(probe.stop()),/secret|external|https?:/)
})

test('bootstrap access-control target remains absent for foreign, deceptive and missing error evidence', options, () => {
  const {page}=fixture(), probe=observePortraitNavigation(page,{origin,runtime:'isolated'})
  for(const error of [
    nativeFetchError('http://external.invalid/api/app/bootstrap'),
    nativeFetchError(origin+'/api/app/bootstrap/private'),
    nativeFetchError('http://secret@127.0.0.1:3100/api/app/bootstrap'),
    {name:'Error',message:'Load failed',stack:'Fetch API cannot load '+origin+'/api/app/bootstrap due to access control checks.'},
    {message:'/127.0.0.1:3100/api/app/bootstrap due to access control checks.'},
  ])page.emit('pageerror',error)
  const events=probe.stop().events
  assert.equal(events.length,5);assert.ok(events.every(event=>!Object.hasOwn(event,'errorTarget')&&!Object.hasOwn(event,'requestId')))
  assert.doesNotMatch(JSON.stringify(events),/secret|external|https?:|stack|message/)
})

test('bootstrap uses the existing shared request budget, event cap and exact listener cleanup', options, () => {
  const {page}=fixture(), original=[];page.on('requestfinished',request=>original.push(request))
  const probe=observePortraitNavigation(page,{origin,runtime:'isolated'})
  const requests=Array.from({length:80},()=>readRequest(page,'/api/app/bootstrap'))
  requests.forEach(request=>page.emit('request',request));requests.forEach(request=>page.emit('requestfinished',request))
  const result=probe.stop()
  assert.deepEqual(result.events.filter(event=>event.type==='portrait-read-request').map(event=>event.requestId),Array.from({length:64},(_,i)=>i+1))
  assert.equal(result.events.filter(event=>event.type==='portrait-read-limit').length,1)
  assert.equal(result.events.filter(event=>event.type==='portrait-read-finished').length,64)
  assert.equal(result.dropped,0);assert.equal(original.length,80);assert.deepEqual(page.eventNames(),['requestfinished'])
  page.emit('request',requests[0]);assert.deepEqual(probe.stop(),result)
  const second=fixture(), capped=observePortraitNavigation(second.page,{origin,runtime:'isolated'})
  for(let i=0;i<195;i++)second.page.emit('load')
  for(let i=0;i<4;i++){
    const request=readRequest(second.page,'/api/app/bootstrap');second.page.emit('request',request)
    second.page.emit('response',{request:()=>request,status:()=>200});second.page.emit('requestfinished',request)
  }
  assert.equal(capped.stop().events.length,200);assert.equal(capped.stop().dropped,7)
})

test('unchanged actual global pageerror gate rejects bootstrap errors even beside known dev overlay noise', options, async () => {
  const source=await readFile(sourceURL,'utf8'), start=source.indexOf('const devOverlayBlocked = ')
  const end=source.indexOf("console.log('PORTRAIT_QA_SUCCESS'",start)
  assert.ok(start>0&&end>start)
  const gate=source.slice(start,end)
  const bootstrap=nativeFetchError(origin+'/api/app/bootstrap').message
  for(const problems of [[bootstrap,bootstrap],['/__nextjs_original-stack-frames','[object Event]',bootstrap],['unrelated real script failure']])
    assert.throws(()=>runInNewContext(gate,{problems,assert},{timeout:1000}),error=>error.code==='ERR_ASSERTION'&&error.expected===0&&error.actual>0)
  assert.doesNotThrow(()=>runInNewContext(gate,{problems:[],assert},{timeout:1000}))
})
