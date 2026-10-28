import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { precompilePortraitClaim } from '../scripts/helpers/portrait-claim-precompile.mjs'

const origin = 'http://127.0.0.1:3100'
const target = origin + '/api/free-express/claim'
const failure = 'Isolated portrait claim precompile requires one unauthenticated 401 response'
const env = Object.freeze({
  CI: 'true', NODE_ENV: 'development', HH_APP_TEST_RUNTIME: 'isolated',
  HH_TEST_ADMIN_DATABASE_URL: 'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test',
  HH_APP_DATABASE_URL: 'postgres://hh_app_ci_login:synthetic-ci-only@127.0.0.1:5432/hh_app_test',
  HH_TEST_APP_ORIGIN: origin, HH_APP_ALLOWED_ORIGINS: origin,
  HH_APP_SUPABASE_URL: 'http://127.0.0.1:54329',
  HH_APP_SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key',
  HH_APP_ENABLED: 'true', HH_APP_ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
})
const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8')
const response = (changes = {}, cancel = async () => {}) => ({
  status: 401, redirected: false, url: target, body: { cancel }, ...changes,
  get headers() { throw new Error('Response headers must not be read') },
  json() { throw new Error('Response body must not be read') },
  text() { throw new Error('Response body must not be read') },
})

test('one exact unauthenticated GET completes on 401 and discards data before returning', { timeout: 3000 }, async () => {
  let calls = 0, cancelled = 0, signal
  const result = await precompilePortraitClaim({ origin, env, fetchImpl: async (url, options) => {
    calls++
    assert.equal(url, target)
    assert.deepEqual(Object.keys(options).sort(), ['credentials', 'headers', 'method', 'redirect', 'signal'])
    assert.equal(options.method, 'GET')
    assert.equal(options.redirect, 'error')
    assert.equal(options.credentials, 'omit')
    assert.deepEqual(options.headers, {})
    signal = options.signal
    assert.equal(signal.aborted, false)
    return response({}, async () => { cancelled++ })
  } })
  assert.equal(result, undefined)
  assert.equal(calls, 1)
  assert.equal(cancelled, 1)
  assert.equal(signal.aborted, true)
})

test('rejects non-401, redirected and unexpected response URLs without retries or body reads', { timeout: 3000 }, async () => {
  const cases = [200, 204, 301, 302, 303, 307, 308, 400, 403, 404, 429, 500, 503]
    .map(status => ({ status }))
  cases.push({ redirected: true }, ...[
    '', origin, target + '?private=secret', target + '#secret', target + '/private',
    target.replace('127.0.0.1', 'localhost'), 'https://private.invalid/claim',
  ].map(url => ({ url })))
  for (const change of cases) {
    let calls = 0, cancelled = 0
    await assert.rejects(precompilePortraitClaim({ origin, env, fetchImpl: async () => {
      calls++
      return response(change, async () => { cancelled++ })
    } }), { message: failure })
    assert.equal(calls, 1)
    assert.equal(cancelled, 1)
  }
})

test('network and cancellation failures remain failures with fixed non-sensitive text', { timeout: 3000 }, async () => {
  for (const cancelFailure of [false, true]) {
    let calls = 0
    const privateError = new Error('https://private.invalid/account?token=SECRET')
    await assert.rejects(precompilePortraitClaim({ origin, env, fetchImpl: async () => {
      calls++
      if (!cancelFailure) throw privateError
      return response({}, async () => { throw privateError })
    } }), error => error.message === failure && error.cause === undefined && !error.stack.includes('SECRET'))
    assert.equal(calls, 1)
  }
  await precompilePortraitClaim({ origin, env, fetchImpl: async () => response({ body: null }) })
})

test('fixed deadline aborts both a stalled request and stalled discard; no retry', { timeout: 3000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  for (const stalledBody of [false, true]) {
    let calls = 0, signal
    const pending = precompilePortraitClaim({ origin, env, fetchImpl: async (_, options) => {
      calls++
      signal = options.signal
      if (stalledBody) return response({}, () => new Promise(() => {}))
      return new Promise(() => {})
    } })
    const rejected = assert.rejects(pending, { message: failure })
    await Promise.resolve()
    t.mock.timers.tick(89999)
    assert.equal(signal.aborted, false)
    t.mock.timers.tick(1)
    assert.equal(signal.aborted, true)
    await rejected
    assert.equal(calls, 1)
  }
})

test('success clears the upper-bound timer rather than waiting for it', { timeout: 3000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const clear = t.mock.method(globalThis, 'clearTimeout')
  let calls = 0
  await precompilePortraitClaim({ origin, env, fetchImpl: async () => { calls++; return response() } })
  assert.equal(clear.mock.callCount(), 1)
  t.mock.timers.tick(90000)
  assert.equal(calls, 1)
})

test('all isolation and exact-service guards run before any request', { timeout: 3000 }, async () => {
  const invalid = [
    { CI: 'false' }, { HH_APP_TEST_RUNTIME: 'live' }, { NODE_ENV: 'production' }, { NODE_ENV: 'test' },
    { VERCEL: '1' }, { VERCEL_ENV: 'preview' }, { PGOPTIONS: '-c anything' },
    { PGREPLICATION: 'true' }, { PGCLIENT_ENCODING: 'SQL_ASCII' },
    { HH_TEST_ADMIN_DATABASE_URL: env.HH_TEST_ADMIN_DATABASE_URL.replace('hh_app_test', 'real') },
    { HH_APP_DATABASE_URL: env.HH_APP_DATABASE_URL.replace('127.0.0.1', 'remote.invalid') },
    { HH_APP_DATABASE_URL: env.HH_APP_DATABASE_URL.replace('synthetic-ci-only', 'private') },
    { HH_APP_DATABASE_URL: env.HH_APP_DATABASE_URL + '?options=private' },
    { HH_TEST_APP_ORIGIN: 'http://localhost:3100' },
    { HH_APP_ALLOWED_ORIGINS: origin + ',https://private.invalid' },
    { HH_APP_SUPABASE_URL: 'https://private.invalid' },
    { HH_APP_SUPABASE_PUBLISHABLE_KEY: 'private' },
  ]
  for (const change of invalid) {
    let calls = 0
    await assert.rejects(precompilePortraitClaim({ origin, env: { ...env, ...change }, fetchImpl: async () => { calls++ } }))
    assert.equal(calls, 0)
  }
  for (const invalidOrigin of [undefined, 'https://127.0.0.1:3100', 'http://localhost:3100',
    'http://127.0.0.1:3101', origin + '/', origin + '?private', origin + '#private',
    'http://user:pass@127.0.0.1:3100', 'http://127.0.0.1.evil.invalid:3100',
    'http://2130706433:3100', 'http:\\127.0.0.1:3100']) {
    let calls = 0
    await assert.rejects(precompilePortraitClaim({ origin: invalidOrigin, env, fetchImpl: async () => { calls++ } }))
    assert.equal(calls, 0)
  }
})

// Execute the real handler/session/config/error code; substitute only imported
// infrastructure at its boundary. No Next server, SDK, provider or DB is started.
function extracted(text, dependencies, names) {
  const code = text.replace(/^import .*\n/gm, '').replace(/^export \{[^\n]+\}\n?/gm, '')
    .replace(/\bexport (?=(?:async )?(?:function|class|const)\b)/g, '')
  return new Function(...Object.keys(dependencies), code + '\nreturn {' + names.join(',') + '}')(...Object.values(dependencies))
}

async function claimHandler({ user = null, session = null, userError = null } = {}) {
  const calls = { getUser: 0, getSession: 0, cookies: 0, rate: 0, transaction: 0, other: 0 }
  const contracts = extracted(await source('lib/assessments/contracts.js'), {}, ['AppError', 'requireUUID', 'assertObject'])
  const config = extracted(await source('lib/app/config.js'), {
    ...contracts, process: { env }, getBillingConfig: () => ({}), manualBillingConfig: () => ({}),
  }, ['getAppConfig', 'requestOrigin', 'requireSameOrigin'])
  const auth = extracted(await source('lib/app/session.js'), {
    ...contracts, createServerClient: (url, key, options) => {
      assert.equal(url, env.HH_APP_SUPABASE_URL)
      assert.equal(key, env.HH_APP_SUPABASE_PUBLISHABLE_KEY)
      assert.deepEqual(options.cookies.getAll(), [])
      return { auth: {
        async getUser() { calls.getUser++; return { data: { user }, error: userError } },
        async getSession() { calls.getSession++; return { data: { session }, error: null } },
      } }
    },
  }, ['createRequestAuth'])
  const http = extracted(await source('lib/app/http.js'), { ...contracts, process: { env: {} } }, ['PRIVATE_HEADERS', 'safeError', 'readBody'])
  const deny = name => () => { calls[name]++; throw new Error('Forbidden fixture dependency: ' + name) }
  const { handle } = extracted(await source('app/api/free-express/claim/route.js'), {
    ...contracts, ...config, ...auth, ...http,
    NextResponse: { json: (body, options) => ({ ...options, body, cookies: { set: deny('cookies') } }) },
    consumeRate: deny('rate'), transaction: deny('transaction'), openSealed: deny('other'),
    freeExpressProof: deny('other'), withFreeExpressRequest: deny('other'), createDirectMessages: deny('other'),
  }, ['handle'])
  return { calls, handle }
}

const request = (headers = {}, method = 'GET') => ({
  url: target, method, headers: new Headers(headers), cookies: { getAll: () => [] },
  get body() { throw new Error('The unauthenticated body must not be read') },
})

test('real claim and session reject empty auth before rates, DB, body, messaging or cookies', { timeout: 3000 }, async () => {
  for (const userError of [null, new Error('AuthSessionMissing')]) {
    const { calls, handle } = await claimHandler({ userError })
    const result = await handle(request())
    assert.equal(result.status, 401)
    assert.deepEqual(result.body, { error: 'SIGN_IN_REQUIRED' })
    assert.equal(result.headers['Cache-Control'], 'private, no-store, max-age=0, must-revalidate')
    assert.deepEqual(calls, { getUser: 1, getSession: 0, cookies: 0, rate: 0, transaction: 0, other: 0 })
  }
})

test('real session also denies missing session after user validation without rates or DB', { timeout: 3000 }, async () => {
  const { calls, handle } = await claimHandler({ user: { id: '10000000-0000-4000-8000-000000000001' } })
  assert.equal((await handle(request())).status, 401)
  assert.deepEqual(calls, { getUser: 1, getSession: 1, cookies: 0, rate: 0, transaction: 0, other: 0 })
})

test('real handler retains origin and method protections; no auth call on denied origin', { timeout: 3000 }, async () => {
  for (const [headers, method] of [[{ host: 'private.invalid' }, 'GET'],
    [{ 'sec-fetch-site': 'cross-site' }, 'GET'], [{}, 'POST']]) {
    const { calls, handle } = await claimHandler()
    const result = await handle(request(headers, method))
    assert.equal(result.status, 403)
    assert.deepEqual(result.body, { error: 'ORIGIN_DENIED' })
    assert.deepEqual(calls, { getUser: 0, getSession: 0, cookies: 0, rate: 0, transaction: 0, other: 0 })
  }
})

test('fixture request options execute the real unauthenticated handler and discard its response', { timeout: 3000 }, async () => {
  const { calls, handle } = await claimHandler()
  let discarded = 0
  await precompilePortraitClaim({ origin, env, fetchImpl: async (url, options) => {
    assert.equal(url, target)
    assert.equal(options.credentials, 'omit')
    const result = await handle(request(options.headers, options.method))
    return response({ status: result.status }, async () => { discarded++ })
  } })
  assert.equal(discarded, 1)
  assert.deepEqual(calls, { getUser: 1, getSession: 0, cookies: 0, rate: 0, transaction: 0, other: 0 })
})

test('actual verifier awaits readiness after its isolation guard and before browser creation', { timeout: 3000 }, async () => {
  const verifier = await source('scripts/verify-portrait-mobile.mjs')
  const prefix = verifier.slice(verifier.indexOf('assertIsolated()'), verifier.indexOf('const context ='))
  const run = new Function('assertIsolated', 'process', 'precompilePortraitClaim', 'mkdir', 'chromium', 'webkit',
    'return (async () => {' + prefix + '})()')
  for (const status of [401, 503]) {
    const events = []
    const engine = { launch: async () => { events.push('launch'); return {} } }
    const task = run(() => events.push('guard'), { env }, async options => {
      events.push('precompile')
      await precompilePortraitClaim({ ...options, env, fetchImpl: async () => {
        events.push('request')
        return response({ status }, async () => { events.push('discard') })
      } })
      events.push('ready')
    }, async () => events.push('mkdir'), engine, engine)
    if (status === 401) {
      await task
      assert.deepEqual(events, ['guard', 'precompile', 'request', 'discard', 'ready', 'mkdir', 'launch'])
    } else {
      await assert.rejects(task, { message: failure })
      assert.deepEqual(events, ['guard', 'precompile', 'request', 'discard'])
    }
  }
})

test('native navigation rejection and existing pageerror gate are not suppressed by readiness', { timeout: 3000 }, async () => {
  const verifier = await source('scripts/verify-portrait-mobile.mjs')
  const openCode = verifier.slice(verifier.indexOf('const open ='), verifier.indexOf('const card ='))
  const marks = [], sentinel = new Error('native-navigation-failure')
  const open = new Function('navigationDiagnostics', 'page', 'origin', openCode + '\nreturn open')(
    { mark: (...args) => marks.push(args) }, { goto: async () => { throw sentinel } }, origin)
  await assert.rejects(open('/en/app/portfolio'), error => error === sentinel)
  assert.deepEqual(marks, [['goto-start', '/en/app/portfolio'], ['goto-failed', '/en/app/portfolio']])
  const gate = verifier.slice(verifier.indexOf('  const devOverlayBlocked ='), verifier.indexOf("  console.log('PORTRAIT_QA_SUCCESS'"))
  const check = new Function('problems', 'assert', gate)
  check([], assert)
  for (const error of ['application-error', 'Fetch API cannot load http://127.0.0.1:3100/_next/static/webpack/a.hot-update.json due to access control checks.',
    'Fetch API cannot load http://127.0.0.1:3100/api/app/journey due to access control checks.']) {
    assert.throws(() => check(['[object Event]', '/__nextjs_original-stack-frames', error], assert), /Browser script errors/)
  }
})

test('CI runs the regression before browser startup and watches both new files', { timeout: 3000 }, async () => {
  const workflow = await source('.github/workflows/hh-portrait-mobile-browser.yml')
  for (const path of ['scripts/helpers/portrait-claim-precompile.mjs', 'tests/portrait-claim-precompile.test.mjs'])
    assert.ok(workflow.includes("      - '" + path + "'"))
  const command = workflow.indexOf('run: node --test tests/portrait-frame-readiness.test.mjs')
  assert.ok(command > 0)
  assert.ok(workflow.slice(command, workflow.indexOf('\n', command)).includes('tests/portrait-claim-precompile.test.mjs'))
  assert.ok(command < workflow.indexOf('npm run dev --'))
  assert.ok(workflow.indexOf('npm run dev --') < workflow.indexOf('node scripts/verify-portrait-mobile.mjs'))
})


test('real middleware dependencies do not redirect or refresh auth on the fixed cookieless API route', { timeout: 3000 }, async () => {
  const redirects = extracted(await source('lib/canonical-redirect.js'), { canonicalSiteUrl: 'https://unused.invalid' },
    ['canonicalRedirectTarget', 'privateMigrationBridge'])
  assert.equal(redirects.canonicalRedirectTarget(target, 'GET'), undefined)
  assert.equal(redirects.privateMigrationBridge(target, 'synthetic'), undefined)
  let clients = 0
  const { refreshAdminAuth } = extracted(await source('lib/app/admin-auth-refresh.js'), {
    createServerClient: () => { clients++; throw new Error('Provider must not be constructed') },
  }, ['refreshAdminAuth'])
  assert.deepEqual(await refreshAdminAuth(request(), { environment: env }), [])
  assert.equal(clients, 0)
})
