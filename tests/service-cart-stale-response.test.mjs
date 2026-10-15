import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createCommerceAccountGuard } from '../lib/commerce/client-account.js'
import { installCheckoutResponseProbe } from '../scripts/service-cart-response-probe.mjs'

const source = readFileSync(new URL('../components/commerce/service-cart.tsx', import.meta.url), 'utf8')
const start = source.indexOf('  async function checkout(')
const end = source.indexOf('\n  return (', start)
assert.ok(start > 0 && end > start, 'execute the actual checkout function from the component')
const checkoutCode = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const accountId = '11111111-1111-4111-8111-111111111111'

for (const invalidation of ['unmount', 'invalidate']) test(`actual checkout discards unread response after ${invalidation}`, async () => {
  const guard = createCommerceAccountGuard(), generation = guard.mount()
  assert.equal(guard.bindInitial(accountId, generation), true)
  let release, jsonReads = 0, identityReads = 0, redirects = 0
  const updates = [], pendingResponse = new Promise(resolve => { release = resolve })
  const context = vm.createContext({
    accountGuard: { current: guard }, available: true, chosen: [{ id: 'personal-session-60' }],
    inFlight: { current: false }, operationId: { current: 'stable-operation' }, locale: 'en',
    setPending: value => updates.push(['pending', value]), setError: value => updates.push(['error', value]),
    setSignInRequired: value => updates.push(['signIn', value]),
    fetch: () => pendingResponse, commerceIdentityError: () => false,
    verifyCommerceIdentity: async () => { identityReads++; return true },
    window: { crypto: { randomUUID: () => 'unused' }, location: { assign: () => { redirects++ } } },
    URL, Error, t: { error: 'unavailable' },
  })
  vm.runInContext(checkoutCode, context)
  const pending = context.checkout()
  guard[invalidation]()
  const before = [...updates]
  release({ ok: true, status: 200, json() { jsonReads++; return new Promise(() => {}) } })
  let timer
  try { await Promise.race([pending, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('stale checkout tried to consume the unresolved body')), 1000) })]) }
  finally { clearTimeout(timer) }
  assert.equal(jsonReads, 0)
  assert.equal(identityReads, 0)
  assert.equal(redirects, 0)
  assert.deepEqual(updates, before)
})

test('browser probe observes application continuation without consuming the response body', async () => {
  const tasks = [], events = []
  const response = { json: async () => { events.push('json'); return {} } }
  const window = { location: { href: 'http://127.0.0.1:3100/en/services' }, fetch: async () => response }
  const context = vm.createContext({ window, URL, setTimeout: callback => tasks.push(callback) })
  vm.runInContext(`(${installCheckoutResponseProbe.toString()})()`, context)
  const result = await window.fetch('/api/app/commerce/checkout')
  events.push('application continuation')
  assert.equal(result, response)
  assert.equal(window.__serviceCartCheckoutProbe.settled, 0)
  assert.equal(window.__serviceCartCheckoutProbe.jsonReads, 0)
  tasks.shift()()
  assert.equal(window.__serviceCartCheckoutProbe.settled, 1)
  assert.deepEqual(events, ['application continuation'])
  await result.json()
  assert.equal(window.__serviceCartCheckoutProbe.jsonReads, 1, 'consumption is detected if a stale guard regresses')
})
