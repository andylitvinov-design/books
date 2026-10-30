import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { TEST_OWNER_EMAIL } from './helpers/app-owner-fixture.mjs'

if (!process.execArgv.includes('--conditions=react-server')) {
  test('server-only admin lifecycle regressions', () => {
    const run = spawnSync(process.execPath, ['--conditions=react-server', '--test', fileURLToPath(import.meta.url)], { encoding: 'utf8', timeout: 60000 })
    assert.ifError(run.error)
    assert.equal(run.status, 0, run.stdout + run.stderr)
  })
} else {
const sessions = await import('../lib/prescriptions/admin-session.js')
const { issueTrustedAdminSession, authorizeAdminSession, revokeAdminSessions, adminCookieName, adminApiCookieName } = sessions
const { createMemoryPrescriptionStore, createPrescriptionStore } = await import('../lib/prescriptions/store.js')

const environment = { PRESCRIPTIONS_ADMIN_TOKEN: 'synthetic-admin-credential' }
const owner = { id: '00000000-0000-4000-8000-000000000001', email: TEST_OWNER_EMAIL, claims: { session_id: '00000000-0000-4000-8000-000000000002', exp: Math.floor(Date.now() / 1000) + 3600 } }
function fixture() {
  const store = createMemoryPrescriptionStore()
  const written = new Map()
  const response = { cookies: { set(name, value, options) { written.set(name, { value, options }) } } }
  const auth = { async verified() { return owner } }
  const repository = { async isPractitioner() { return true } }
  return { store, response, written, auth, repository, environment }
}
async function issued(f = fixture()) {
  assert.equal(await issueTrustedAdminSession(f.response, { ...f, actor: owner }), true)
  return { ...f, token: f.written.get(adminCookieName).value }
}

test('issues independent random sessions and accepts a current verified owner', async () => {
  const first = await issued()
  const second = await issued(first)
  // Response is shared deliberately: capture its most recently written token.
  const secondToken = first.written.get(adminCookieName).value
  assert.notEqual(first.token, secondToken)
  assert.equal(first.written.get(adminApiCookieName).value, secondToken)
  assert.equal((await authorizeAdminSession(first)).actor.id, owner.id)
  assert.equal((await authorizeAdminSession({ ...first, token: secondToken })).actor.id, owner.id)
  assert.equal(first.written.get(adminCookieName).options.maxAge, 12 * 60 * 60)
  assert.equal(second.store, first.store)
})

test('copied cookie is rejected at server expiry even if retained by the client', async () => {
  const f = await issued()
  assert.equal(await authorizeAdminSession({ ...f, nowMs: Date.now() + 12 * 60 * 60_000 + 1 }), undefined)
})

test('logout revokes a copied cookie while another independent session remains valid', async () => {
  const f = await issued()
  await issueTrustedAdminSession(f.response, { ...f, actor: owner })
  const secondToken = f.written.get(adminCookieName).value
  await revokeAdminSessions({ tokens: [f.token], store: f.store })
  assert.equal(await authorizeAdminSession(f), undefined)
  assert.ok(await authorizeAdminSession({ ...f, token: secondToken }))
})

test('revoked app session, inactive account and lost practitioner authority fail closed', async () => {
  const f = await issued()
  for (const code of ['SIGN_IN_REQUIRED', 'ACCOUNT_UNAVAILABLE']) {
    const repository = { async isPractitioner() { throw new Error(code) } }
    assert.equal(await authorizeAdminSession({ ...f, repository }), undefined)
  }
  assert.equal(await authorizeAdminSession({ ...f, repository: { async isPractitioner() { return false } } }), undefined)
  assert.equal(await authorizeAdminSession({ ...f, auth: { async verified() { throw new Error('revoked') } } }), undefined)
})

test('owner and app session bindings reject a different actor, network member or new login session', async () => {
  const f = await issued()
  for (const actor of [
    { ...owner, id: '00000000-0000-4000-8000-000000000003' },
    { ...owner, email: 'synthetic-network-member@example.test' },
    { ...owner, claims: { ...owner.claims, session_id: '00000000-0000-4000-8000-000000000004' } },
    { ...owner, claims: { ...owner.claims, exp: Math.floor(Date.now() / 1000) - 1 } },
  ]) assert.equal(await authorizeAdminSession({ ...f, auth: { async verified() { return actor } } }), undefined)
})

test('old static tokens, tampered cookies and credential rotation cannot authorize', async () => {
  const f = await issued()
  const staticToken = createHmac('sha256', environment.PRESCRIPTIONS_ADMIN_TOKEN).update('prescriptions-admin-v1').digest('base64url')
  for (const token of [staticToken, f.token + 'x', f.token.slice(0, -1) + (f.token.endsWith('A') ? 'B' : 'A')])
    assert.equal(await authorizeAdminSession({ ...f, token }), undefined)
  assert.equal(await authorizeAdminSession({ ...f, environment: { PRESCRIPTIONS_ADMIN_TOKEN: 'rotated' } }), undefined)
})

test('unavailable store fails closed at issuance and authorization; logout reports revocation failure', async () => {
  const f = fixture()
  assert.equal(await issueTrustedAdminSession(f.response, { ...f, actor: owner, store: null }), false)
  assert.equal(f.written.size, 0)
  const active = await issued()
  assert.equal(await authorizeAdminSession({ ...active, store: null }), undefined)
  assert.equal(await authorizeAdminSession({ ...active, store: { async findAccessSession() { throw new Error('offline') } } }), undefined)
  await assert.rejects(revokeAdminSessions({ tokens: [active.token], store: null }))
  await assert.rejects(revokeAdminSessions({ tokens: [active.token], store: { async deleteAccessSession() { throw new Error('offline') } } }))
})

test('issuance rejects missing owner, expired identity and missing credential without setting cookies', async () => {
  for (const actor of [undefined, { ...owner, email: 'synthetic@example.test' }, { ...owner, claims: { ...owner.claims, exp: 1 } }]) {
    const f = fixture()
    assert.equal(await issueTrustedAdminSession(f.response, { ...f, actor }), false)
    assert.equal(f.written.size, 0)
  }
  const f = fixture()
  assert.equal(await issueTrustedAdminSession(f.response, { ...f, actor: owner, environment: {} }), false)
})


test('logout during remote authority checks rejects the in-flight copied cookie', async () => {
  const f = await issued()
  let checking, proceed
  const started = new Promise(resolve => { checking = resolve })
  const resume = new Promise(resolve => { proceed = resolve })
  const pending = authorizeAdminSession({ ...f, repository: { async isPractitioner() { checking(); await resume; return true } } })
  await started
  await revokeAdminSessions({ tokens: [f.token], store: f.store })
  proceed()
  assert.equal(await pending, undefined)
})

test('store write failure never issues cookies and rotating a secondary PIN also invalidates sessions', async () => {
  const f = fixture()
  await assert.rejects(issueTrustedAdminSession(f.response, { ...f, actor: owner, store: { async createAccessSession() { throw new Error('offline') } } }))
  assert.equal(f.written.size, 0)
  const active = await issued({ ...fixture(), environment: { ...environment, PRESCRIPTIONS_ADMIN_PIN: 'synthetic-pin' } })
  assert.equal(await authorizeAdminSession({ ...active, environment: { ...environment, PRESCRIPTIONS_ADMIN_PIN: 'rotated-pin' } }), undefined)
})

// Execute the actual Next request adapter; only Next's request cookie context
// and external app identity/database boundaries are synthetic.
async function requestAdapter(f, { readonly = false, refresh = false } = {}) {
  const jar = new Map([[adminCookieName, f.token], ['hh-app-auth', 'synthetic-app-cookie']])
  const changes = [], calls = []
  const cookieStore = {
    get(name) { return jar.has(name) ? { value: jar.get(name) } : undefined },
    getAll() { return [...jar].map(([name, value]) => ({ name, value })) },
    set(name, value, options) {
      if (readonly) throw new Error('Cookies can only be modified in a Server Action or Route Handler')
      changes.push({ name, value, options }); jar.set(name, value)
    },
  }
  const modules = {
    'next/headers.js': { async cookies() { return cookieStore } },
    '../app/config.js': { getAppConfig() { return {} } },
    '../app/session.js': { createRequestAuth(request) {
      assert.ok(request.cookies.getAll().some(item => item.name === 'hh-app-auth'))
      return { ...f.auth, apply(response) {
        if (refresh) response.cookies.set('hh-app-auth', 'synthetic-refreshed-cookie', { path: '/' })
        return response
      } }
    } },
    '../app/repository.js': { createAppRepository() { return { async isPractitioner(actor) {
      calls.push(actor.id); return f.repository.isPractitioner(actor)
    } } } },
    './store.js': { getPrescriptionStore() { return f.store } },
    './admin-session.js': { ...sessions, authorizeAdminSession(options) { return authorizeAdminSession({ ...options, environment: f.environment }) } },
  }
  const source = await readFile(new URL('../lib/prescriptions/admin.js', import.meta.url), 'utf8')
  const runtime = { exports: {}, Date, Boolean, Set, String, require(name) {
    assert.ok(Object.hasOwn(modules, name), 'Unexpected production dependency: ' + name)
    return modules[name]
  } }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, runtime)
  return { ...runtime.exports, changes, calls, jar }
}

test('protected Next page and API adapter revalidate authority and persist refreshes when permitted', async () => {
  const f = await issued()
  const api = await requestAdapter(f, { refresh: true })
  assert.equal(await api.requireAdminRequest(), true)
  assert.equal(await api.requireAdminRequest(), true)
  assert.equal(api.calls.length, 2)
  assert.equal(api.jar.get('hh-app-auth'), 'synthetic-refreshed-cookie')
  const page = await requestAdapter(f, { readonly: true, refresh: true })
  assert.equal(await page.requireAdminRequest(), true)
  f.repository.isPractitioner = async () => false
  assert.equal(await api.requireAdminRequest(), false)
  assert.equal(await page.requireAdminRequest(), false)
  assert.equal(await api.establishAdminSession(environment.PRESCRIPTIONS_ADMIN_TOKEN), false)
})

test('upload cookie restoration reuses the authorized token without issuing or extending a session', async () => {
  const f = await issued()
  f.store.createAccessSession = async () => assert.fail('restoration must never create or renew a session')
  const api = await requestAdapter(f)
  assert.equal(await api.restoreAdminApiSession(f.response), true)
  const restored = f.written.get(adminApiCookieName)
  assert.equal(restored.value, f.token)
  assert.ok(restored.options.maxAge > 0 && restored.options.maxAge <= 12 * 60 * 60)
  await revokeAdminSessions({ tokens: [f.token], store: f.store })
  assert.equal(await api.restoreAdminApiSession(f.response), false)
})

test('Next logout revokes before clearing cookies and never clears locally on storage failure', async () => {
  const f = await issued()
  const api = await requestAdapter(f)
  await api.clearAdminSession()
  assert.equal(await authorizeAdminSession(f), undefined)
  assert.equal(api.changes.filter(item => item.options.maxAge === 0).length, 2)
  const failed = await issued()
  failed.store.deleteAccessSession = async () => { throw new Error('offline') }
  const unavailable = await requestAdapter(failed)
  await assert.rejects(unavailable.clearAdminSession())
  assert.equal(unavailable.changes.length, 0)
})


test('production KV serialization preserves owner binding, credential version and fixed expiry', async () => {
  const values = new Map(), commands = []
  const store = createPrescriptionStore({ environment: {
    PRESCRIPTIONS_KV_REST_API_URL: 'https://synthetic-kv.example.test',
    PRESCRIPTIONS_KV_REST_API_TOKEN: 'synthetic-kv-token',
    PRESCRIPTIONS_DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  }, async fetchFn(_url, options) {
    const command = JSON.parse(options.body)
    commands.push(command)
    if (command[0] === 'SET') values.set(command[1], command[2])
    if (command[0] === 'DEL') values.delete(command[1])
    return Response.json({ result: command[0] === 'GET' ? values.get(command[1]) || null : 'OK' })
  } })
  const f = await issued({ ...fixture(), store })
  const set = commands.find(command => command[0] === 'SET')
  assert.equal(set[3], 'EX')
  assert.equal(set[4], 12 * 60 * 60)
  const saved = JSON.parse(set[2])
  assert.deepEqual(Object.keys(saved).sort(), ['accessVersion', 'expiresAt', 'recordId', 'selector'])
  assert.equal(saved.recordId, owner.id)
  assert.equal(saved.selector, owner.claims.session_id)
  assert.equal(set[2].includes(f.token), false)
  assert.ok(await authorizeAdminSession(f))
  const refreshedActor = { ...owner, claims: { ...owner.claims, exp: Math.ceil(saved.expiresAt / 1000) + 3600 } }
  const refreshed = { ...f, auth: { async verified() { return refreshedActor } } }
  assert.ok(await authorizeAdminSession({ ...refreshed, nowMs: saved.expiresAt - 1 }))
  assert.equal(await authorizeAdminSession({ ...refreshed, nowMs: saved.expiresAt }), undefined)
  assert.equal(commands.filter(command => command[0] === 'SET').length, 1)
  await revokeAdminSessions({ tokens: [f.token], store })
  assert.equal(await authorizeAdminSession(f), undefined)
})

}
