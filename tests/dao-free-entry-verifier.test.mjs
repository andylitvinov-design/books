import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { assertDaoVerifierBoundary, createDaoCaptureRouteGuard, daoConsentDiagnostics } from '../scripts/helpers/dao-free-entry-verifier.mjs'

const origin = 'http://127.0.0.1:3100'
const env = { CI: 'true', HH_APP_TEST_RUNTIME: 'isolated',
  HH_TEST_ADMIN_DATABASE_URL: 'postgres://synthetic@127.0.0.1:5432/hh_app_test' }
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Dao verifier accepts only exact loopback plus the existing isolated database runtime', () => {
  assert.doesNotThrow(() => assertDaoVerifierBoundary(origin, env))
  assert.doesNotThrow(() => assertDaoVerifierBoundary('http://localhost:3100', env))
  for (const unsafe of ['https://holistichouse.vercel.app', 'http://127.0.0.1:3100/path',
    'http://127.0.0.1:3100?x=1', 'http://localhost:3100/', 'http://localhost:3100@evil.test',
    'http://localhost.evil.test:3100', 'http://127.0.0.1:99999'])
    assert.throws(() => assertDaoVerifierBoundary(unsafe, env), unsafe)
  for (const change of [{ CI: 'false' }, { HH_APP_TEST_RUNTIME: 'production' }, { VERCEL: '1' },
    { HH_TEST_ADMIN_DATABASE_URL: 'postgres://synthetic@db.example.test/hh_app_test' },
    { HH_TEST_ADMIN_DATABASE_URL: 'postgres://synthetic@127.0.0.1/production' }])
    assert.throws(() => assertDaoVerifierBoundary(origin, { ...env, ...change }))
})

async function dispatch(guard, url, method, payload = {}) {
  const actions = []
  await guard.route({ request: () => ({ url: () => url, method: () => method,
    postDataJSON: () => payload }),
  fulfill: async value => actions.push(['fulfill', value]),
  abort: async reason => actions.push(['abort', reason]),
  continue: async () => actions.push(['continue']),
  })
  assert.equal(actions.length, 1)
  return actions[0]
}

test('only the exact local enquiry POST receives an in-memory receipt, never pass-through', async () => {
  const guard = createDaoCaptureRouteGuard(origin, env)
  const payload = { contact: { email: 'dao-qa@example.test' }, contactConsent: true }
  const [action, response] = await dispatch(guard, origin + '/api/service-enquiries', 'POST', payload)
  assert.equal(action, 'fulfill')
  assert.equal(response.status, 201)
  assert.deepEqual(JSON.parse(response.body), { saved: true, referenceCode: 'HH-ABCD1234EF56' })
  assert.deepEqual(guard.submissions, [payload])
  assert.deepEqual(guard.blocked, [])
})

test('all external requests and unexpected writes are aborted including popup provider URLs', async () => {
  const guard = createDaoCaptureRouteGuard(origin, env)
  for (const [url, method] of [
    ['https://holistichouse.vercel.app/api/service-enquiries', 'POST'],
    ['https://wa.me/14376066502?text=synthetic', 'GET'],
    ['https://t.me/AndyTherapist?text=synthetic', 'GET'],
    [origin + '/api/service-enquiries?bypass=1', 'POST'],
    [origin + '/api/service-enquiries', 'DELETE'],
    [origin + '/api/app/guest/session', 'POST'],
    [origin + '/api/service-enquiries/other', 'POST'],
  ]) assert.deepEqual(await dispatch(guard, url, method), ['abort', 'blockedbyclient'])
  assert.equal(guard.blocked.length, 7)
  assert.deepEqual(guard.submissions, [])
  assert.ok(guard.blocked.every(row => !row.path.includes('?')), 'No query payload in diagnostics')
})

test('loopback static reads remain available to the hydrated page', async () => {
  const guard = createDaoCaptureRouteGuard(origin, env)
  for (const method of ['GET', 'HEAD'])
    assert.deepEqual(await dispatch(guard, origin + '/_next/static/chunk.js', method), ['continue'])
  assert.deepEqual(guard.submissions, [])
})

test('current public contracts retain exact locales, consent, geometry and isolated auth readiness', () => {
  const app = read('scripts/verify-app-r1.mjs'), mhc = read('scripts/verify-mhc-sf.mjs')
  assert.match(app, /const publicContext=await browser\.newContext\(\{viewport:\{width:390,height:844\},serviceWorkers:'block'\}\)/)
  assert.match(app, /main\[data-free-entry-landing="dao"\]/)
  assert.match(app, /Discover what gives you strength\./)
  assert.match(app, /Узнайте, что даёт вам внутреннюю опору\./)
  assert.match(app, /await assertDaoFreeEntryCapture\(servicePage,expect,\{origin,locale\}\)/)
  assert.match(app, /synthetic-receipt/)
  assert.match(mhc, /assertIsolated\(\)/)
  assert.match(mhc, /toHaveURL\(origin\+'\/en\/app\/portrait'\)/)
  assert.match(mhc, /data-cabinet-guest-overview="true"/)
  assert.match(mhc, /name:'Open my Cabinet with Google',exact:true/)
  assert.doesNotMatch(mhc, /name:'Continue with Google'/)
  assert.match(mhc, /toBeVisible\(\{timeout:60000\}\)/)
  const helper = read('scripts/helpers/dao-free-entry-verifier.mjs')
  assert.match(helper, /No request without explicit consent/)
  assert.match(helper, /context\.route\('\*\*\/\*', guard\.route\)/)
  assert.match(helper, /context\.unroute\('\*\*\/\*', guard\.route\)/)
  assert.match(helper, /window\.open = \(url, target\)/)
  assert.match(helper, /Contact never enters the messenger draft/)
})


test('consent diagnostics report only booleans and counts, never private field or alert text', () => {
  const nodes = {
    'input[name="contact"]': { value: 'synthetic-private@example.test', disabled: false },
    'input[type="checkbox"]': { checked: false, required: true, validity: { valueMissing: true } },
    'button[data-compact-channel="whatsapp"]': { type: 'button', disabled: false },
  }
  const form = { isConnected: true, ownerDocument: { readyState: 'complete' },
    querySelector: key => nodes[key],
    querySelectorAll: () => [{ textContent: 'Synthetic consent required' }],
  }
  const result = daoConsentDiagnostics(form, { contact: 'synthetic-private@example.test', required: 'Synthetic consent required' })
  assert.deepEqual(result, { formConnected: true, documentComplete: true, contactMatches: true,
    contactDisabled: false, consentChecked: false, consentRequired: true, consentMissing: true,
    buttonPresent: true, buttonTypeIsButton: true, buttonDisabled: false, alertCount: 1, expectedConsentAlert: true })
  assert.ok(Object.values(result).every(value => typeof value === 'boolean' || typeof value === 'number'))
  assert.doesNotMatch(JSON.stringify(result), /synthetic-private|Synthetic consent required/)
  nodes['input[name="contact"]'].value = ''
  nodes['input[type="checkbox"]'].checked = true
  nodes['button[data-compact-channel="whatsapp"]'].disabled = true
  assert.equal(daoConsentDiagnostics(form, { contact: 'expected', required: 'different' }).contactMatches, false)
  assert.equal(daoConsentDiagnostics(form, { contact: 'expected', required: 'different' }).expectedConsentAlert, false)
  assert.equal(daoConsentDiagnostics(form, {}).consentChecked, true)
  assert.equal(daoConsentDiagnostics(form, {}).buttonDisabled, true)
})

test('DAO failure diagnostics cannot skip, retry, waive or replace the original consent gate', () => {
  const helper = read('scripts/helpers/dao-free-entry-verifier.mjs')
  assert.match(helper, /try \{\s*await expect\(form.getByRole\('alert'\)\).toHaveText\(t.required\)/)
  assert.match(helper, /catch \(error\) \{[\s\S]*DAO_CONSENT_FAILURE[\s\S]*throw error\s*\}/)
  assert.doesNotMatch(helper, /waitForTimeout|test.skip|form.submit|requestSubmit|noValidate|force:\s*true/)
  assert.equal((helper.match(/await whatsapp.click\(\)/g) || []).length, 2)
  assert.match(helper, /assert.deepEqual\(guard.submissions, \[\], 'No request without explicit consent'\)/)
})
