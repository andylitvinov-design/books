import test from 'node:test'
import assert from 'node:assert/strict'
import { boundedJsonFetch } from '../lib/crm/client-request.js'
const options = () => ({ cache: 'no-store', credentials: 'same-origin', headers: { 'X-HH-Account-Id': 'synthetic-owner' }, signal: new AbortController().signal })
test('optional settings consumes unavailable response JSON before status handling', async () => {
  let consumed = false
  const result = await boundedJsonFetch('/api/app/communication-preferences', options(), async (_url, input) => {
    assert.equal(input.headers['X-HH-Account-Id'], 'synthetic-owner'); assert.equal(input.cache, 'no-store')
    return { ok: false, status: 503, json: async () => { consumed = true; return { error: 'CRM_UNAVAILABLE' } } }
  })
  assert.equal(consumed, true); assert.equal(result.response.status, 503); assert.equal(result.data.error, 'CRM_UNAVAILABLE')
})
test('stalled response headers are aborted and optional request rejects within its deadline', async () => {
  let signal
  await assert.rejects(boundedJsonFetch('/fixed', options(), async (_url, input) => { signal = input.signal; return new Promise(() => {}) }, 5), /REQUEST_TIMEOUT/)
  assert.equal(signal.aborted, true)
})
test('stalled response body is also bounded without falsely confirming withdrawal', async () => {
  let signal
  await assert.rejects(boundedJsonFetch('/fixed', { ...options(), method: 'POST' }, async (_url, input) => {
    signal = input.signal; return { ok: true, json: () => new Promise(() => {}) }
  }, 5), /REQUEST_TIMEOUT/)
  assert.equal(signal.aborted, true)
})
test('account unmount cancellation rejects even if the transport ignores abort', async () => {
  const owner = new AbortController()
  const request = boundedJsonFetch('/fixed', { ...options(), signal: owner.signal }, async () => new Promise(() => {}), 1000)
  owner.abort(); await assert.rejects(request, /REQUEST_ABORTED/)
})
