import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { NextRequest, NextResponse } from 'next/server.js'
import * as redirects from '../lib/canonical-redirect.js'

function middlewareModule(refreshAdminAuth) {
  const source = readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8')
  const modules = {
    'next/server': { NextResponse },
    './lib/canonical-redirect': redirects,
    './lib/app/admin-auth-refresh': { refreshAdminAuth },
  }
  const runtime = { exports: {}, Headers, crypto: globalThis.crypto, process: { env: {} }, require(name) {
    assert.ok(Object.hasOwn(modules, name), name)
    return modules[name]
  } }
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, runtime)
  return runtime.exports
}

test('actual middleware forwards rotated app cookies and returns the same secure browser cookies with private CSP', async () => {
  for (const path of ['/admin/clients', '/api/admin']) {
    const request = new NextRequest('https://holistichouse.vercel.app' + path, { headers: { cookie: 'hh-app-auth=old; prescriptions_admin=v2.synthetic' } })
    const { middleware } = middlewareModule(async request => {
      request.cookies.set('hh-app-auth', 'rotated')
      return [{ name: 'hh-app-auth', value: 'rotated', options: { httpOnly: true, sameSite: 'lax', secure: true, path: '/' } }]
    })
    const response = await middleware(request)
    assert.match(response.headers.get('x-middleware-request-cookie'), /hh-app-auth=rotated/)
    assert.equal(response.cookies.get('hh-app-auth').value, 'rotated')
    assert.equal(response.cookies.get('prescriptions_admin'), undefined)
    assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0, must-revalidate')
    assert.equal(response.headers.get('x-frame-options'), 'DENY')
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive')
    assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/)
  }
})

const { refreshAdminAuth } = await import('../lib/app/admin-auth-refresh.js')
const environment = {
  HH_APP_ENABLED: 'true', HH_APP_SUPABASE_URL: 'https://synthetic-provider.example.test',
  HH_APP_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_' + 'x'.repeat(24),
}
const origin = 'https://holistichouse.vercel.app'
const authRequest = (path, cookie = 'hh-app-auth=synthetic; prescriptions_admin=v2.synthetic') =>
  new NextRequest(origin + path, { headers: { cookie } })

test('refresh is limited to admin routes with existing app session cookies and approved auth config', async () => {
  const createClient = () => assert.fail('No auth network/client for this request')
  for (const path of ['/', '/en/app', '/api/app/bootstrap', '/administrator', '/api/administrator'])
    assert.deepEqual(await refreshAdminAuth(authRequest(path), { environment, createClient }), [])
  for (const path of ['/admin', '/admin/clients', '/api/admin/videos']) {
    for (const cookie of ['', 'prescriptions_admin=v2.synthetic', 'hh-app-auth-code-verifier=synthetic'])
      assert.deepEqual(await refreshAdminAuth(authRequest(path, cookie), { environment, createClient }), [])
    for (const invalid of [
      { ...environment, HH_APP_ENABLED: 'false' },
      { ...environment, VERCEL_ENV: 'production' },
      { ...environment, HH_APP_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_synthetic' },
      { ...environment, HH_APP_SUPABASE_URL: 'http://untrusted.example.test' },
      { ...environment, HH_APP_SUPABASE_URL: 'https://synthetic-provider.example.test/other' },
    ]) assert.deepEqual(await refreshAdminAuth(authRequest(path), { environment: invalid, createClient }), [])
  }
})

test('real cookie adapter forwards all rotated chunks with forced server-only flags and leaves admin token unchanged', async () => {
  const request = authRequest('/api/admin/videos', 'hh-app-auth.0=old0; hh-app-auth.1=old1; prescriptions_admin=v2.synthetic')
  const changes = await refreshAdminAuth(request, { environment, createClient(_url, _key, options) {
    assert.equal(options.cookies.encode, 'tokens-only')
    assert.equal(options.cookieOptions.name, 'hh-app-auth')
    return { auth: { async getUser() {
      options.cookies.setAll([
        { name: 'hh-app-auth.0', value: 'rotated0', options: { maxAge: 3600, httpOnly: false, secure: false, sameSite: 'none', path: '/unsafe' } },
        { name: 'hh-app-auth.1', value: '', options: { maxAge: 0 } },
        { name: 'prescriptions_admin', value: 'unsafe-admin-renewal', options: { maxAge: 999999 } },
      ])
      return { data: { user: { id: 'synthetic-network-practitioner' } }, error: null }
    } } }
  } })
  assert.equal(request.cookies.get('hh-app-auth.0').value, 'rotated0')
  assert.equal(request.cookies.get('hh-app-auth.1').value, '')
  assert.equal(request.cookies.get('prescriptions_admin').value, 'v2.synthetic')
  assert.equal(changes.length, 2)
  for (const { options } of changes) {
    assert.equal(options.httpOnly, true); assert.equal(options.secure, true)
    assert.equal(options.sameSite, 'lax'); assert.equal(options.path, '/')
  }
  assert.equal(changes[1].options.maxAge, 0)
})

const user = { id: '10000000-0000-4000-8000-000000000001', aud: 'authenticated', email: 'synthetic@example.invalid', user_metadata: {} }
const jwt = exp => 'synthetic.' + Buffer.from(JSON.stringify({ sub: user.id, session_id: '20000000-0000-4000-8000-000000000001', exp })).toString('base64url') + '.signature'
const encoded = session => 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
function expiredRequest(path = '/admin/clients') {
  const expires_at = Math.floor(Date.now() / 1000) - 3600
  return authRequest(path, 'hh-app-auth=' + encoded({ access_token: jwt(expires_at), refresh_token: 'synthetic-old-refresh', expires_at, expires_in: 3600, token_type: 'bearer' }) + '; prescriptions_admin=v2.synthetic')
}

test('pinned SSR SDK rotates an expired token once, persists it to browser and passes it to downstream render', async t => {
  let refreshes = 0
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const target = new URL(url)
    assert.equal(target.origin, environment.HH_APP_SUPABASE_URL, 'External provider requests forbidden')
    if (target.pathname === '/auth/v1/user') return Response.json(user)
    assert.equal(target.pathname, '/auth/v1/token')
    assert.equal(target.searchParams.get('grant_type'), 'refresh_token')
    assert.equal(JSON.parse(options.body).refresh_token, 'synthetic-old-refresh')
    refreshes++
    const exp = Math.floor(Date.now() / 1000) + 3600
    return Response.json({ access_token: jwt(exp), refresh_token: 'synthetic-rotated-refresh', token_type: 'bearer', expires_in: 3600, user })
  })
  const request = expiredRequest()
  const { middleware } = middlewareModule(request => refreshAdminAuth(request, { environment }))
  const response = await middleware(request)
  assert.equal(refreshes, 1)
  const cookie = response.cookies.get('hh-app-auth')
  assert.ok(cookie?.value)
  assert.equal(cookie.httpOnly, true); assert.equal(cookie.secure, true)
  assert.equal(cookie.sameSite, 'lax'); assert.equal(cookie.path, '/')
  assert.ok(request.headers.get('cookie').includes(cookie.value))
  assert.ok(response.headers.get('x-middleware-request-cookie').includes(cookie.value))
  assert.equal(request.cookies.get('prescriptions_admin').value, 'v2.synthetic')
  assert.equal(response.cookies.get('prescriptions_admin'), undefined)
  // A downstream server render receives the updated cookie. A second pinned
  // SDK getUser must not consume the old refresh token again.
  const { createServerClient } = await import('@supabase/ssr')
  const downstream = createServerClient(environment.HH_APP_SUPABASE_URL, environment.HH_APP_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { name: 'hh-app-auth' },
    cookies: { encode: 'tokens-only', getAll: () => request.cookies.getAll(), setAll() { assert.fail('Downstream render attempted a second rotation') } },
  })
  assert.equal((await downstream.auth.getUser()).data.user.id, user.id)
  assert.equal(refreshes, 1)
  const browserRequest = authRequest('/api/admin/videos', 'hh-app-auth=' + cookie.value + '; prescriptions_admin_api=v2.synthetic')
  assert.deepEqual(await refreshAdminAuth(browserRequest, { environment }), [])
  assert.equal(refreshes, 1)
})

test('revoked pinned SDK refresh clears app cookies without issuing or renewing an admin session', async t => {
  t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'warn', () => {})
  t.mock.method(globalThis, 'fetch', async url => {
    const target = new URL(url)
    assert.equal(target.origin, environment.HH_APP_SUPABASE_URL)
    return Response.json({ error: 'invalid_grant', error_code: 'refresh_token_not_found', msg: 'Synthetic revoked refresh' }, { status: 400 })
  })
  const request = expiredRequest()
  const changes = await refreshAdminAuth(request, { environment })
  assert.ok(changes.length > 0)
  assert.ok(changes.every(item => item.name.startsWith('hh-app-auth') && item.value === '' && item.options.maxAge === 0))
  assert.equal(request.cookies.get('prescriptions_admin').value, 'v2.synthetic')
})

test('refresh failure after SDK cookie rotation still returns changes for browser persistence', async () => {
  const request = authRequest('/admin')
  const changes = await refreshAdminAuth(request, { environment, createClient(_url, _key, options) {
    return { auth: { async getUser() {
      options.cookies.setAll([{ name: 'hh-app-auth', value: 'already-rotated', options: {} }])
      throw new Error('Synthetic provider verification outage')
    } } }
  } })
  assert.equal(changes[0].value, 'already-rotated')
  assert.equal(request.cookies.get('hh-app-auth').value, 'already-rotated')
})
