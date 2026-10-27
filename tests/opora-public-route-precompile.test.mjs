import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { precompileOporaPublicRoutes } from '../scripts/helpers/opora-public-route-precompile.mjs'
import { assertIsolatedDatabaseEnvironment } from './helpers/app-db-fixture-policy.mjs'

// Inert response fixtures only: no server, browser, database or provider calls.
const ORIGIN = 'http://localhost:3100'
const TARGETS = ['en', 'ru'].map(locale => ORIGIN + '/' + locale + '/courses/antistress')
const FAIL = 'Isolated OPORA public-document precompile failed'
const fixtureEnv = () => ({
  CI: 'true', HH_APP_TEST_RUNTIME: 'isolated', NODE_ENV: 'development',
  HH_TEST_ADMIN_DATABASE_URL: 'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test',
  HH_APP_DATABASE_URL: 'postgres://hh_app_ci_login:synthetic-ci-only@127.0.0.1:5432/hh_app_test',
  HH_TEST_APP_ORIGIN: ORIGIN, HH_APP_ALLOWED_ORIGINS: ORIGIN,
  HH_APP_SUPABASE_URL: 'http://localhost:54329',
  HH_APP_SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key',
})
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }
function clock(t) {
  const timers = [], cleared = []
  t.mock.method(globalThis, 'setTimeout', (callback, delay) => {
    const id = { callback, delay }; timers.push(id); return id
  })
  t.mock.method(globalThis, 'clearTimeout', id => cleared.push(id))
  return { timers, cleared, fire() { assert.equal(timers.length, 1); timers[0].callback() },
    clean() { assert.deepEqual(timers.map(timer => timer.delay), [90000]); assert.deepEqual(cleared, timers) } }
}
function document(url, events = [], chunks = [new Uint8Array([60, 62])]) {
  let index = 0
  const counts = { cancelled: 0, released: 0, bodyCancelled: 0 }
  const reader = {
    async read() {
      const value = chunks[index++]
      events.push(value === undefined ? 'eof:' + url : 'chunk:' + url)
      return value === undefined ? { done: true } : { done: false, value }
    },
    async cancel() { counts.cancelled++ },
    releaseLock() { counts.released++ },
  }
  const response = { status: 200, redirected: false, url,
    headers: { get(name) { assert.equal(name, 'content-type'); return 'text/html; charset=utf-8' } },
    body: { getReader() { return reader }, async cancel() { counts.bodyCancelled++ } },
    text() { assert.fail('Never decode document') }, json() { assert.fail('Never parse document') },
    arrayBuffer() { assert.fail('Never retain entire document') },
  }
  return { response, reader, counts }
}
function requestFixture(events = []) {
  const calls = [], documents = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options }); events.push('fetch:' + url)
    const value = document(url, events); documents.push(value); return value.response
  }
  return { fetchImpl, calls, documents }
}
const invoke = (fetchImpl, extra = {}) => precompileOporaPublicRoutes({ origin: ORIGIN, env: fixtureEnv(), fetchImpl, ...extra })
const fixedFailure = error => { assert.equal(error.message, FAIL); return true }

test('exact two public documents are sequential, cookie-free, fully drained and quiet', async t => {
  const timer = clock(t), events = [], fixture = requestFixture(events), logs = []
  for (const method of ['log', 'warn', 'error']) t.mock.method(console, method, (...args) => logs.push(args))
  assert.equal(await invoke(fixture.fetchImpl, { targets: ['https://foreign.invalid/private'] }), undefined)
  assert.deepEqual(fixture.calls.map(call => call.url), TARGETS)
  for (const { options } of fixture.calls) {
    assert.deepEqual(Object.keys(options).sort(), ['credentials', 'headers', 'method', 'redirect', 'signal'])
    assert.deepEqual({ ...options, signal: undefined }, { method: 'GET', redirect: 'error', credentials: 'omit', headers: { Accept: 'text/html' }, signal: undefined })
    assert.equal(options.signal.aborted, true)
  }
  assert.equal(fixture.calls[0].options.signal, fixture.calls[1].options.signal)
  assert.deepEqual(events, TARGETS.flatMap(url => ['fetch:' + url, 'chunk:' + url, 'eof:' + url]))
  assert.deepEqual(fixture.documents.map(value => value.counts), [0, 1].map(() => ({ cancelled: 0, released: 1, bodyCancelled: 0 })))
  assert.deepEqual(logs, []); timer.clean()
})

for (const [key, value] of Object.entries({ CI: 'false', HH_APP_TEST_RUNTIME: 'live', NODE_ENV: 'production',
  VERCEL: '1', VERCEL_ENV: 'preview', PGOPTIONS: '-c role=postgres', PGREPLICATION: '1', PGCLIENT_ENCODING: 'SQL_ASCII',
  HH_TEST_ADMIN_DATABASE_URL: 'postgres://postgres:synthetic-ci-admin@foreign.invalid/hh_app_test',
  HH_APP_DATABASE_URL: 'postgres://hh_app_ci_login:synthetic-ci-only@127.0.0.1:5432/real',
  HH_TEST_APP_ORIGIN: 'http://127.0.0.1:3100', HH_APP_ALLOWED_ORIGINS: ORIGIN + ',https://foreign.invalid',
  HH_APP_SUPABASE_URL: 'https://foreign.invalid', HH_APP_SUPABASE_PUBLISHABLE_KEY: 'other',
})) test('isolation mismatch fails before fetch: ' + key, async t => {
  const timer = clock(t); let calls = 0
  await assert.rejects(invoke(() => { calls++; assert.fail('No fetch') }, { env: { ...fixtureEnv(), [key]: value } }))
  assert.equal(calls, 0); assert.deepEqual(timer.timers, []); assert.deepEqual(timer.cleared, [])
})
for (const origin of ['https://localhost:3100', 'http://127.0.0.1:3100', 'http://localhost:3101', 'http://foreign.invalid:3100', ORIGIN + '/en/courses/antistress', ORIGIN + '?secret=private', ORIGIN + '#private', 'http://user:password@localhost:3100'])
  test('noncanonical origin is rejected before fetch: ' + origin, async t => {
    const timer = clock(t); let calls = 0
    await assert.rejects(invoke(() => { calls++ }, { origin }), fixedFailure)
    assert.equal(calls, 0); assert.deepEqual(timer.timers, [])
  })
test('test mode is not accepted as development readiness', async t => {
  const timer = clock(t); let calls = 0
  await assert.rejects(invoke(() => { calls++ }, { env: { ...fixtureEnv(), NODE_ENV: 'test' } }), fixedFailure)
  assert.equal(calls, 0); assert.deepEqual(timer.timers, [])
})

for (const [name, modify] of [
  ['unauthorized status', value => { value.response.status = 401 }],
  ['server error', value => { value.response.status = 500 }],
  ['redirect status', value => { value.response.status = 302 }],
  ['redirected response', value => { value.response.redirected = true }],
  ['wrong final URL', value => { value.response.url = ORIGIN + '/en/app/course' }],
  ['missing MIME', value => { value.response.headers.get = () => null }],
  ['wrong MIME', value => { value.response.headers.get = () => 'application/json' }],
  ['MIME prefix confusion', value => { value.response.headers.get = () => 'text/htmlx' }],
  ['missing body', value => { value.response.body = null }],
  ['zero-byte EOF', value => { value.reader.read = async () => ({ done: true }) }],
  ['malformed chunk', value => { value.reader.read = async () => ({ done: false, value: 'private-body' }) }],
  ['malformed EOF', value => { value.reader.read = async () => ({}) }],
  ['stream error', value => { value.reader.read = async () => { throw new Error('private-body-cookie') } }],
]) test('invalid response fails closed without retry: ' + name, async t => {
  const timer = clock(t), value = document(TARGETS[0]); modify(value); let calls = 0
  await assert.rejects(invoke(async () => { calls++; return value.response }), fixedFailure)
  assert.equal(calls, 1); assert.equal(value.counts.cancelled + value.counts.bodyCancelled, name === 'missing body' ? 0 : 1)
  timer.clean()
})

test('exact byte/chunk bounds are accepted without retaining the body', async t => {
  const timer = clock(t), chunk = new Uint8Array(4096); let calls = 0
  await invoke(async url => { calls++; return document(url, [], Array(2048).fill(chunk)).response })
  assert.equal(calls, 2); timer.clean()
})
for (const [name, chunks] of [['byte limit', () => [new Uint8Array(8 * 1024 * 1024 + 1)]], ['chunk limit', () => Array(2049).fill(new Uint8Array([1]))]])
  test(name + ' fails closed and releases the reader', async t => {
    const timer = clock(t), value = document(TARGETS[0], [], chunks()); let calls = 0
    await assert.rejects(invoke(async () => { calls++; return value.response }), fixedFailure)
    assert.equal(calls, 1); assert.equal(value.counts.cancelled, 1); assert.equal(value.counts.released, 1); timer.clean()
  })
test('fetch errors are fixed/redacted and never retried', async t => {
  const timer = clock(t); let calls = 0
  await assert.rejects(invoke(async () => { calls++; throw new Error('private-cookie-provider-detail') }), fixedFailure)
  assert.equal(calls, 1); timer.clean()
})
test('body completion, not headers or first chunk, gates the next document', async t => {
  const timer = clock(t), gate = deferred(), value = document(TARGETS[0]); let reads = 0, calls = 0
  value.reader.read = () => ++reads === 1 ? Promise.resolve({ done: false, value: new Uint8Array([1]) }) : gate.promise
  const pending = invoke(async url => ++calls === 1 ? value.response : document(url).response)
  await flush(); assert.equal(calls, 1)
  gate.resolve({ done: true }); await pending
  assert.equal(calls, 2); timer.clean()
})
for (const phase of ['fetch', 'first body', 'second body', 'cancel']) test('one total deadline aborts and cleans up stalled ' + phase, async t => {
  const timer = clock(t), gate = deferred(), values = [], signals = []; let calls = 0
  const pending = invoke(async (url, options) => {
    calls++; signals.push(options.signal)
    if (phase === 'fetch') return gate.promise
    const value = document(url); values.push(value)
    if ((phase === 'first body' && calls === 1) || (phase === 'second body' && calls === 2)) value.reader.read = () => gate.promise
    if (phase === 'cancel') { value.response.status = 500; value.response.body.cancel = () => { value.counts.bodyCancelled++; return gate.promise } }
    return value.response
  })
  const rejected = assert.rejects(pending, fixedFailure)
  await flush(); assert.equal(calls, phase === 'second body' ? 2 : 1); assert.equal(timer.timers.length, 1)
  timer.fire(); await rejected
  assert.ok(signals.every(signal => signal.aborted)); timer.clean()
  assert.ok(values.every(value => value.counts.released === (phase === 'cancel' ? 0 : 1)))
  if (phase === 'fetch') {
    const late = document(TARGETS[0]); gate.resolve(late.response); await flush()
    assert.equal(late.counts.bodyCancelled, 1); assert.equal(calls, 1)
  } else { gate.resolve({ done: true }); await flush(); assert.equal(calls, phase === 'second body' ? 2 : 1) }
})
test('throwing cancel/release cannot replace the original fixed failure', async t => {
  const timer = clock(t), value = document(TARGETS[0]); let calls = 0
  value.reader.read = async () => { throw new Error('private-primary') }
  value.reader.cancel = () => { throw new Error('private-cancel') }
  value.reader.releaseLock = () => { throw new Error('private-release') }
  await assert.rejects(invoke(async () => { calls++; return value.response }), fixedFailure)
  assert.equal(calls, 1); timer.clean()
})

const verifierURL = new URL('../scripts/verify-app-r1.mjs', import.meta.url)
async function startup(fetchImpl, events, env = fixtureEnv()) {
  const source = await readFile(verifierURL, 'utf8')
  const start = source.indexOf('\nassertIsolated()\n'), end = source.indexOf('// Synthetic-only diagnostics preserve the readiness assertion.')
  assert.ok(start > 0 && end > start, 'Pinned startup extraction boundaries')
  const prefix = source.slice(start, end)
  const engine = { async launch() { events.push('launch'); return { async newContext(options) { events.push('context'); assert.deepEqual(options, { viewport: { width: 390, height: 844 } }); return {} } } } }
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  await new AsyncFunction('assertIsolated', 'process', 'precompileOporaPublicRoutes', 'mkdir', 'chromium', 'webkit', prefix)(
    () => { events.push('isolation'); assertIsolatedDatabaseEnvironment(env) }, { env },
    options => precompileOporaPublicRoutes({ ...options, env, fetchImpl }), async () => { events.push('mkdir') }, engine, engine)
}
test('actual verifier prefix completes both document bodies before browser/context creation', async t => {
  const timer = clock(t), events = [], fixture = requestFixture(events)
  await startup(fixture.fetchImpl, events)
  assert.deepEqual(events, ['isolation', ...TARGETS.flatMap(url => ['fetch:' + url, 'chunk:' + url, 'eof:' + url]), 'mkdir', 'launch', 'context'])
  timer.clean()
})
test('actual verifier prefix cannot launch after setup or isolation failure', async t => {
  const timer = clock(t), events = []
  await assert.rejects(startup(async () => { throw new Error('private-error') }, events), fixedFailure)
  assert.deepEqual(events, ['isolation']); timer.clean()
  const isolatedEvents = []
  await assert.rejects(startup(() => assert.fail('No fetch'), isolatedEvents, { ...fixtureEnv(), CI: 'false' }))
  assert.deepEqual(isolatedEvents, ['isolation'])
})
test('actual verifier prefix cannot launch after deadline, including a late response', async t => {
  const timer = clock(t), events = [], gate = deferred()
  const pending = startup(() => gate.promise, events)
  const rejected = assert.rejects(pending, fixedFailure)
  // Source loading is asynchronous; let it finish without a real timer/network.
  while (!timer.timers.length) await new Promise(resolve => setImmediate(resolve))
  timer.fire(); await rejected
  assert.deepEqual(events, ['isolation']); timer.clean()
  const late = document(TARGETS[0]); gate.resolve(late.response); await flush()
  assert.equal(late.counts.bodyCancelled, 1); assert.deepEqual(events, ['isolation'])
})
test('unchanged OPORA actions run first on the still-anonymous caller; other journeys retain order', async () => {
  const source = await readFile(verifierURL, 'utf8')
  assert.equal(source.split('await verifyOporaPublicEntry(page,expect,{origin,screenshotEvidence,output})').length, 2)
  const first = source.indexOf('\ntry {\n'), native = source.indexOf(' await assertNativeCompactChannelGestures(browser,expect,{origin})', first)
  assert.equal(source.slice(first, native), "\ntry {\n // Preserve the anonymous OPORA deep link, explicit consent boundary, and\n // all seven-skill/14-day checks through its real full-programme link.\n await verifyOporaPublicEntry(page,expect,{origin,screenshotEvidence,output})\n await page.setViewportSize({width:390,height:844})\n passed('anonymous EN/RU OPORA invitation and linked programme expose seven skills and all 14 days without account access')\n\n")
  assert.ok(source.indexOf(' await verifyPublicServiceConversionJourneys()', native) > native)
  assert.ok(source.indexOf(' const guestPickerContext=await browser.newContext', native) > source.indexOf(' await verifyPublicServiceConversionJourneys()', native))
  assert.ok(source.indexOf(" const response=await page.goto(origin+'/en/app')", native) > source.indexOf(' await guestPickerContext.close()', native))
  const beforeTry = source.slice(0, first)
  assert.match(beforeTry, /let page=await context\.newPage\(\)/)
  assert.doesNotMatch(beforeTry.slice(0, beforeTry.indexOf('async function')), /await page\.(?:goto|evaluate|click|setContent)|storageState\s*:/)
})
test('existing OPORA native click, exact URL and page-error gates remain required', async () => {
  const source = await readFile(new URL('../scripts/helpers/opora-public-entry-verifier.mjs', import.meta.url), 'utf8')
  assert.match(source, /await explore\.click\(\)/)
  assert.match(source, /await expect\(page\)\.toHaveURL\(origin \+ '\/' \+ locale \+ '\/courses\/antistress'\)/)
  assert.match(source, /assert\.equal\(pageErrors\.length, 0, 'OPORA preview pages and popups must not raise page errors'\)/)
})
