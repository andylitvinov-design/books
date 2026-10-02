import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { seal, openSealed, operationHash } from '../lib/app/crypto.js'
import { appEnabled, getAppConfig, requireSameOrigin, testRuntime } from '../lib/app/config.js'
import { readBody, safeError, PRIVATE_HEADERS } from '../lib/app/http.js'
const config = { encryptionKey: randomBytes(32), encryptionKeyId: 'test-v1' },
  context = {
    accountId: '10000000-0000-4000-8000-000000000001',
    recordId: '10000000-0000-4000-8000-000000000002',
    field: 'run.context',
  }
test('encryption binds owner, record and field', () => {
  const a = seal({ note: 'Private synthetic note' }, context, config),
    b = seal({ note: 'Private synthetic note' }, context, config)
  assert.notEqual(a, b)
  assert.deepEqual(openSealed(a, context, config), { note: 'Private synthetic note' })
  assert(!a.includes('Private synthetic'))
  for (const changed of [
    { ...context, field: 'request.message' },
    { ...context, accountId: '10000000-0000-4000-8000-000000000003' },
    { ...context, recordId: '10000000-0000-4000-8000-000000000004' },
  ])
    assert.throws(() => openSealed(a, changed, config))
  const e = JSON.parse(a)
  e.data = 'AAAA'
  assert.throws(() => openSealed(JSON.stringify(e), context, config))
  assert.throws(() => openSealed(a, context, { ...config, encryptionKeyId: 'other' }))
})
test('operation fingerprint is canonical and secret keyed', () => {
  assert.equal(operationHash({ b: 2, a: 1 }, config), operationHash({ a: 1, b: 2 }, config))
  assert.notEqual(operationHash({ a: 1 }, config), operationHash({ a: 2 }, config))
})
test('missing config and unapproved production fail closed', () => {
  assert.equal(appEnabled({}), false)
  assert.equal(appEnabled({ HH_APP_ENABLED: 'true', VERCEL_ENV: 'production' }), false)
  assert.throws(() => getAppConfig({ HH_APP_ENABLED: 'true' }))
  assert.equal(testRuntime({ CI: 'true', HH_APP_TEST_RUNTIME: 'isolated', VERCEL: '1' }), false)
  assert.equal(
    testRuntime({ CI: 'true', HH_APP_TEST_RUNTIME: 'isolated', NODE_ENV: 'production' }),
    false,
  )
})
test('mutation guard rejects missing/hostile origin and cross-site requests', () => {
  const cfg = { origins: ['https://test.example'] }
  assert.equal(
    requireSameOrigin(
      new Request('https://test.example/api/app/runs', {
        headers: { origin: 'https://test.example' },
      }),
      cfg,
    ),
    'https://test.example',
  )
  for (const headers of [
    {},
    { origin: 'https://evil.example' },
    { origin: 'https://test.example', 'sec-fetch-site': 'cross-site' },
  ])
    assert.throws(() =>
      requireSameOrigin(new Request('https://test.example/api/app/runs', { headers }), cfg),
    )
})
test('stream bounded JSON rejects invalid type, arrays, syntax and oversized payload', async () => {
  const req = (body, headers = {}) =>
    new Request('https://test.example', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body,
    })
  assert.deepEqual(await readBody(req('{"ok":true}')), { ok: true })
  await assert.rejects(readBody(req('[]')))
  await assert.rejects(readBody(req('{')))
  await assert.rejects(readBody(req('{}', { 'content-type': 'text/plain' })))
  await assert.rejects(readBody(req(JSON.stringify({ note: 'a'.repeat(100) })), 30))
})
test('unknown errors never expose credentials or SQL', () => {
  assert.deepEqual(safeError(new Error('password=private')), {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
  })
  assert.match(PRIVATE_HEADERS['Cache-Control'], /no-store/)
  assert.equal(PRIVATE_HEADERS['Referrer-Policy'], 'no-referrer')
})
