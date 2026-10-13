import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { requireCommerceAccount } from '../lib/commerce/account-binding.js'
import { createCommerceAccountGuard, verifyCommerceIdentity } from '../lib/commerce/client-account.js'

const a = '11111111-1111-4111-8111-111111111111'
const b = '22222222-2222-4222-8222-222222222222'
const response = (accountId, status = 200) => ({ status, ok: status === 200, json: async () => ({ accountId }) })
function bound() {
  const guard = createCommerceAccountGuard()
  const generation = guard.mount()
  assert.equal(guard.bindInitial(a, generation), true)
  return { guard, ticket: guard.capture() }
}

test('stale A header with verified B cookie is rejected before any order/payment call', () => {
  const request = (id) => new Request('https://example.test/api/app/commerce/checkout', { headers: id ? { 'X-HH-Account-ID': id } : {} })
  assert.equal(requireCommerceAccount(request(a), { id: a }), a)
  for (const [expected, actor] of [[a, b], [b, a], [null, a], [a, null]])
    assert.throws(() => requireCommerceAccount(request(expected), { id: actor }), (error) => error.code === 'ACCOUNT_CHANGED' && error.status === 409)
})

test('client owner binds once and cannot silently become another account', () => {
  const { guard, ticket } = bound()
  assert.equal(guard.bindInitial(b, ticket.generation), false)
  assert.equal(guard.current(ticket), false)
  assert.equal(guard.capture(), null)
  assert.equal(guard.bindInitial(b, guard.mount()), false)
})

test('fresh pre-redirect identity read sends the expected account header', async () => {
  const { guard, ticket } = bound()
  assert.equal(await verifyCommerceIdentity(guard, ticket, async (url, init) => {
    assert.equal(url, '/api/app/commerce/status')
    assert.equal(init.headers['X-HH-Account-ID'], a)
    assert.equal(init.cache, 'no-store')
    return response(a)
  }), true)
})

test('cookie switch or logout while checkout waits suppresses its redirect', async () => {
  for (const status of [401, 403, 409]) {
    const { guard, ticket } = bound()
    let navigated = false
    await assert.rejects(async () => {
      if (await verifyCommerceIdentity(guard, ticket, async () => response(b, status))) navigated = true
    }, /ACCOUNT_CHANGED/)
    assert.equal(navigated, false)
    assert.equal(guard.current(ticket), false)
  }
})

test('even a 200 identity response for B cannot authorize A redirect', async () => {
  const { guard, ticket } = bound()
  await assert.rejects(verifyCommerceIdentity(guard, ticket, async () => response(b)), /ACCOUNT_CHANGED/)
  assert.equal(guard.capture(), null)
})

test('delayed response after unmount never navigates or updates the old payment context', async () => {
  const { guard, ticket } = bound()
  let release
  const delayed = new Promise((resolve) => { release = resolve })
  const pending = verifyCommerceIdentity(guard, ticket, () => delayed)
  guard.unmount()
  release(response(a))
  assert.equal(await pending, false)
  guard.mount()
  assert.equal(guard.current(ticket), false)
})

test('identity invalidated while JSON parses cannot apply a stale order response', async () => {
  const { guard, ticket } = bound()
  let release
  const delayed = new Promise((resolve) => { release = resolve })
  const pending = verifyCommerceIdentity(guard, ticket, async () => ({ ok: true, status: 200, json: () => delayed }))
  await Promise.resolve()
  guard.invalidate()
  release({ accountId: a })
  assert.equal(await pending, false)
})

test('routes bind verified actors before mutation or private order lookup; status never reads health bootstrap', () => {
  const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  for (const path of ['app/api/app/commerce/checkout/route.js', 'app/api/app/commerce/orders/[orderId]/route.js']) {
    const source = read(path)
    assert.ok(source.indexOf('auth.verified()') < source.indexOf('requireCommerceAccount(request, actor)'))
    assert.ok(source.indexOf('requireCommerceAccount(request, actor)') < source.indexOf('await consumeRate'))
  }
  const status = read('app/api/app/commerce/status/route.js')
  assert.match(status, /accountId: actor.id/)
  assert.match(status, /request.headers.has\('x-hh-account-id'\)/)
  assert.doesNotMatch(status, /\.bootstrap\(|createAppRepository|from ['"][^'"]*(?:assessments|reports)/)
  const ui = read('components/commerce/service-cart.tsx')
  assert.match(ui, /"X-HH-Account-ID": ticket.accountId/)
  assert.match(ui, /setAvailable\(false\); setOrderId\(null\); setOrderStatus\(""\)/)
  assert.ok(ui.lastIndexOf('verifyCommerceIdentity(guard, ticket)') < ui.indexOf('window.location.assign'))
  assert.match(ui, /if \(guard.current\(ticket\)\) window.location.assign/)
})
