import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { requestBilling, requestBillingStatus, verifiedBillingRedirect } from '../lib/billing/client-session.js'

test('billing requests bind expected bootstrap account for status and every mutation', async () => {
  for (const action of ['status', 'checkout', 'portal', 'cancel', 'reconcile', 'sessionRequest']) {
    let args
    await requestBilling('owner-A', action, action === 'status' ? undefined : {}, async (...value) => {
      args = value; return { ok: true, json: async () => ({ available: true }) }
    })
    assert.equal(args[1].headers['X-HH-Account-ID'], 'owner-A')
    assert.equal(args[1].credentials, 'same-origin')
  }
})
test('stale account server rejection is never treated as a successful action', async () => {
  await assert.rejects(requestBilling('owner-A', 'cancel', {}, async () => ({ ok: false, json: async () => ({ error: 'ACCOUNT_CHANGED' }) })), /ACCOUNT_CHANGED/)
})
test('unmounted or switched account ignores a delayed redirect before any navigation', async () => {
  let requests = 0
  const result = await verifiedBillingRedirect({ accountId: 'owner-A', value: 'https://billing.stripe.com/p/session/a', kind: 'portal', isCurrent: () => false,
    request: async () => { requests++ } })
  assert.equal(result, null); assert.equal(requests, 0)
})
test('account switches during final identity read suppress delayed portal navigation', async () => {
  let current = true
  const result = await verifiedBillingRedirect({ accountId: 'owner-A', value: 'https://billing.stripe.com/p/session/a', kind: 'portal', isCurrent: () => current,
    request: async (owner, action) => { assert.equal(owner, 'owner-A'); assert.equal(action, 'status'); current = false } })
  assert.equal(result, null)
})
test('cookie change in another tab is rejected by final expected-account read', async () => {
  await assert.rejects(verifiedBillingRedirect({ accountId: 'owner-A', value: 'https://checkout.stripe.com/c/pay/a', kind: 'checkout', isCurrent: () => true,
    request: async () => { throw Error('ACCOUNT_CHANGED') } }), /ACCOUNT_CHANGED/)
})
test('server account binding precedes every billing service dispatch', () => {
  const source = readFileSync('app/api/app/billing/[action]/route.js', 'utf8')
  assert.ok(source.indexOf("request.headers.get('x-hh-account-id') !== actor.id") < source.indexOf('const service = createBillingService'))
})

test('status read forwards owner cancellation without changing headers or credentials', async () => {
  const controller = new AbortController()
  const pending = requestBilling('owner-A', 'status', undefined, async (_url, options) => {
    assert.equal(options.signal, controller.signal)
    assert.equal(options.headers['X-HH-Account-ID'], 'owner-A')
    assert.equal(options.credentials, 'same-origin')
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('ABORTED')), { once: true }))
  }, { signal: controller.signal })
  controller.abort(); await assert.rejects(pending, /ABORTED/)
})
test('provider cancels status reads on supersession, page hide and unmount without filtering browser errors', () => {
  const source = readFileSync('components/app/subscription-access.jsx', 'utf8')
  const load = source.slice(source.indexOf('const loadStatus'), source.indexOf('const offerAfterCompletion'))
  assert.ok(load.indexOf('statusController.current?.abort()') < load.indexOf('const controller = new AbortController()'))
  assert.match(load, /requestVersion.current !== version \|\| controller.signal.aborted/)
  assert.match(load, /signal: controller.signal/)
  assert.match(load, /await requestBillingStatus\(accountId, \{ signal: controller.signal \}\)/)
  assert.match(load, /addEventListener\('pagehide', stopStatus\)/)
  assert.match(load, /removeEventListener\('pagehide', stopStatus\)/)
  assert.match(load, /mounted.current = false;[\s\S]*statusController.current\?\.abort\(\)/)
})

test('status deadline rejects a transport that ignores abort, including a late body', async () => {
  let finishBody, signal
  const result = requestBillingStatus('owner-A', { timeoutMs: 5, fetcher: async (_url, options) => {
    signal = options.signal
    return { ok: true, json: () => new Promise(resolve => { finishBody = resolve }) }
  } })
  await assert.rejects(result, /REQUEST_TIMEOUT/)
  assert.equal(signal.aborted, true)
  finishBody({ available: true })
  await assert.rejects(result, /REQUEST_TIMEOUT/)
})
test('status owner abort rejects independently and pre-aborted calls never fetch', async () => {
  const controller = new AbortController()
  let calls = 0
  const fetcher = async () => { calls++; return new Promise(() => {}) }
  const result = requestBillingStatus('owner-A', { signal: controller.signal, fetcher })
  controller.abort()
  await assert.rejects(result, /REQUEST_ABORTED/)
  await assert.rejects(requestBillingStatus('owner-A', { signal: controller.signal, fetcher }), /REQUEST_ABORTED/)
  assert.equal(calls, 1)
})
