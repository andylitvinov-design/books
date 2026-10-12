import assert from 'node:assert/strict'
import test from 'node:test'
import { appFetch } from '../lib/app/client-fetch.js'

const bootstrap = {
  account: { id: 'synthetic-account', displayName: '', onboardingState: 'active' },
  results: [], runs: [], requests: [], consents: [], services: [],
}

for (const cause of [new SyntaxError('Truncated JSON'), new DOMException('Body interrupted', 'AbortError')]) {
  test(`HTTP 200 with ${cause.name} rejects instead of returning successful bootstrap`, async t => {
    t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, json: async () => { throw cause } }))
    await assert.rejects(appFetch('bootstrap'), error =>
      error.code === 'SERVICE_UNAVAILABLE' && error.status === 200 && error.cause === cause)
  })
}

for (const value of [null, {}, { error: 'SERVICE_UNAVAILABLE' }, { ...bootstrap, account: null },
  { ...bootstrap, account: {} }, { ...bootstrap, results: null }]) {
  test(`invalid bootstrap ${JSON.stringify(value)} rejects before ready state`, async t => {
    t.mock.method(globalThis, 'fetch', async () => Response.json(value))
    await assert.rejects(appFetch('bootstrap'), { code: 'SERVICE_UNAVAILABLE', status: 200 })
  })
}

test('valid active and onboarding bootstrap responses preserve their data', async t => {
  for (const onboardingState of ['active', 'pending']) {
    const value = { ...bootstrap, account: { ...bootstrap.account, onboardingState } }
    t.mock.method(globalThis, 'fetch', async () => Response.json(value))
    assert.deepEqual(await appFetch('bootstrap'), value)
  }
})

test('HTTP errors preserve authentication and conflict handling', async t => {
  for (const [status, code] of [[401, 'SIGN_IN_REQUIRED'], [409, 'REVISION_CONFLICT'], [403, 'DELETION_REQUESTED']]) {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ error: code }, { status }))
    await assert.rejects(appFetch('bootstrap'), { status, code })
  }
  t.mock.method(globalThis, 'fetch', async () => new Response('not JSON', { status: 401 }))
  await assert.rejects(appFetch('bootstrap'), { status: 401, code: 'SERVICE_UNAVAILABLE' })
})

test('mutation transport and non-bootstrap response contracts are preserved', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/app/runs')
    assert.equal(options.method, 'POST')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.credentials, 'same-origin')
    assert.equal(options.headers['Content-Type'], 'application/json')
    assert.equal(options.body, '{"definitionKey":"example"}')
    return Response.json({ id: 'synthetic-run' })
  })
  assert.deepEqual(await appFetch('runs', { definitionKey: 'example' }), { id: 'synthetic-run' })
})
