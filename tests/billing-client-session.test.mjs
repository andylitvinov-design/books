import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { requestBilling, verifiedBillingRedirect } from '../lib/billing/client-session.js'

test('billing requests bind expected bootstrap account for status and every mutation', async () => {
  for (const action of ['status', 'checkout', 'portal', 'cancel', 'reconcile']) {
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
