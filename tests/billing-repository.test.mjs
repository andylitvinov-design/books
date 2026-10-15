import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

if (!process.execArgv.includes('--conditions=react-server')) {
  test('Server-only billing suite with real module condition', () => {
    const run = spawnSync(process.execPath, ['--conditions=react-server', '--test', fileURLToPath(import.meta.url)], { encoding: 'utf8' })
    assert.equal(run.status, 0, run.stdout + run.stderr)
  })
} else {
const { createBillingRepository } = await import('../lib/billing/repository.js')
const OWNER = '7aa8bbc1-4455-4666-8777-889900aabbcc'
const OTHER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const SESSION = '11223344-5566-4777-8888-99aabbccddee'
const OPERATION = 'abcdef01-2345-4678-9abc-def012345678'
const NEXT_OPERATION = 'bcdef012-3456-4789-abcd-ef0123456789'
const actor = id => ({ id, claims: { sub: id, session_id: SESSION, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 } })
const settings = { provider: 'stripe', environment: 'sandbox' }
const appConfig = { origins: ['https://holistic.test'], test: true }
const checkoutContext = { locale: 'ru', origin: 'https://holistic.test', priceId: 'price_monthly' }
const event = extra => ({ provider: 'stripe', environment: 'sandbox', customerId: 'cus_owner', eventId: 'evt_1', eventType: 'invoice.paid', ...extra })
const snapshot = extra => ({ provider: 'stripe', environment: 'sandbox', customerId: 'cus_owner', subscriptionId: 'sub_1', planId: 'start', status: 'active', paidThroughAt: '2099-01-01T00:00:00.000Z', currentPeriodEnd: '2099-01-01T00:00:00.000Z', cancelAtPeriodEnd: false, revokedAt: null, ...extra })
const rowScope = row => [row.owner_id, row.provider, row.environment].join('|')

// A deterministic transaction/row-lock fixture, not a substitute for executing
// the UNAPPLIED proposal in an explicitly approved isolated PostgreSQL database.
function fixture({ ownerReady = true, unsafeRole = false, customers = [], subscriptions = [], checkouts = [], events = [], cancellations = [] } = {}) {
  let state = { customers, subscriptions, checkouts, events, cancellations }
  let lock = Promise.resolve()
  const calls = []
  let connects = 0
  const pool = {
    async connect() {
      connects++
      let transactionState, unlock, released = false
      const done = () => { if (unlock) { unlock(); unlock = null } }
      return {
        async query(sql, values = []) {
          sql = sql.replace(/\s+/g, ' ').trim()
          calls.push({ sql, values })
          const result = rows => ({ rows })
          if (sql === 'BEGIN') return result([])
          if (sql === 'ROLLBACK') { done(); return result([]) }
          if (sql === 'COMMIT') { if (transactionState) state = transactionState; done(); return result([]) }
          if (sql.startsWith('select rolsuper')) return result([{ rolsuper: unsafeRole, rolbypassrls: false }])
          if (sql.startsWith('SET LOCAL ROLE') || sql.includes('set_config(')) return result([])
          if (sql.includes('owner_ready')) return result([{ valid: ownerReady }])
          if (sql.includes('customer_owner')) return result([{ owner_id: state.customers.find(row => row.provider === values[0] && row.environment === values[1] && row.customer_id === values[2])?.owner_id || null }])
          if (sql.startsWith('select pg_advisory_xact_lock')) return result([])
          if (sql.startsWith('insert into billing_private.accounts')) return result([])
          if (sql.startsWith('select owner_id from billing_private.accounts')) {
            const previous = lock
            lock = new Promise(resolve => { unlock = resolve })
            await previous
            transactionState = structuredClone(state)
            return result([{ owner_id: values[0] }])
          }
          const data = transactionState || state
          const scoped = row => rowScope(row) === values.slice(0, 3).join('|')
          if (sql.startsWith('select customer_id from billing_private.customers')) return result(data.customers.filter(scoped))
          if (sql.startsWith('insert into billing_private.customers')) {
            let row = data.customers.find(scoped)
            if (!row) { row = { owner_id: values[0], provider: values[1], environment: values[2], customer_id: values[3] }; data.customers.push(row) }
            return result([row])
          }
          if (sql.startsWith('select event_id from billing_private.processed_events')) return result(data.events.filter(row => scoped(row) && row.event_id === values[3]))
          if (sql.startsWith('insert into billing_private.processed_events')) {
            data.events.push({ owner_id: values[0], provider: values[1], environment: values[2], event_id: values[3], event_type: values[4] }); return result([])
          }
          if (sql.startsWith('select * from billing_private.subscriptions') || sql.startsWith('select subscription_id from billing_private.subscriptions')) return result(data.subscriptions.filter(row => scoped(row) && (sql.includes('and is_current') ? row.is_current : row.subscription_id === values[3])))
          if (sql.startsWith('update billing_private.subscriptions set is_current=false')) { for (const row of data.subscriptions.filter(scoped)) row.is_current = false; return result([]) }
          if (sql.startsWith('insert into billing_private.subscriptions')) {
            const existing = data.subscriptions.find(row => scoped(row) && row.subscription_id === values[3])
            const row = { owner_id: values[0], provider: values[1], environment: values[2], subscription_id: values[3], customer_id: values[4], plan_id: values[5], status: values[6], paid_through_at: values[7], current_period_end: values[8], cancel_at_period_end: values[9], revoked_at: values[10], provider_version: values[11], is_current: existing ? existing.is_current : values[12], revision: existing ? existing.revision + 1 : 0 }
            if (existing) Object.assign(existing, row); else data.subscriptions.push(row)
            return result([row])
          }
          if (sql.startsWith('select * from billing_private.checkout_operations')) return result(data.checkouts.filter(row => scoped(row) && ['pending', 'open'].includes(row.status)))
          if (sql.startsWith('insert into billing_private.checkout_operations')) {
            if (data.checkouts.some(row => scoped(row) && row.operation_id === values[3])) return result([])
            const row = { owner_id: values[0], provider: values[1], environment: values[2], operation_id: values[3], plan_id: values[4], locale: values[5], return_origin: values[6], price_id: values[7], status: 'pending', created_at: new Date().toISOString(), provider_checkout_id: null, checkout_url: null, expires_at: null }
            data.checkouts.push(row); return result([row])
          }
          if (sql.startsWith('update billing_private.checkout_operations')) {
            const row = data.checkouts.find(row => scoped(row) && row.operation_id === values[3] && ['pending', 'open'].includes(row.status))
            if (!row) return result([])
            if (sql.includes('set provider_checkout_id')) {
              if (row.provider_checkout_id && row.provider_checkout_id !== values[4]) return result([])
              Object.assign(row, { provider_checkout_id: values[4], checkout_url: values[5], expires_at: values[6], status: 'open' })
            } else Object.assign(row, { status: values[4], checkout_url: null })
            return result([row])
          }
          if (sql.startsWith('select * from billing_private.cancellation_operations')) return result(data.cancellations.filter(row => scoped(row) && row.status === 'pending'))
          if (sql.startsWith('insert into billing_private.cancellation_operations')) {
            const row = { owner_id: values[0], provider: values[1], environment: values[2], operation_id: values[3], subscription_id: values[4], status: 'pending', created_at: new Date().toISOString() }
            data.cancellations.push(row); return result([row])
          }
          if (sql.startsWith('update billing_private.cancellation_operations')) {
            const row = data.cancellations.find(row => scoped(row) && row.operation_id === values[3] && row.status === 'pending')
            if (!row) return result([])
            row.status = 'completed'; return result([row])
          }
          throw new Error(`Unhandled fixture SQL: ${sql}`)
        },
        release() { assert.equal(released, false); released = true; calls.push({ sql: 'release', values: [] }); done() },
      }
    },
  }
  return { pool, calls, state: () => structuredClone(state), connects: () => connects, repository: config => createBillingRepository(appConfig, config || settings, { pool }) }
}
const customerRow = (environment = 'sandbox', ownerId = OWNER) => ({ owner_id: ownerId, provider: 'stripe', environment, customer_id: 'cus_owner' })
const seeded = extra => fixture({ customers: [customerRow()], ...extra })

test('requires verified actor claims before opening the database', async () => {
  const f = fixture(), repo = f.repository()
  await assert.rejects(repo.withOwner(actor(OWNER), async () => { throw new Error('expected callback') }), /expected callback/)
  const before = f.connects()
  assert.throws(() => repo.withOwner(null, () => {}), /SIGN_IN_REQUIRED/)
  await assert.rejects(repo.withOwner({ ...actor(OWNER), claims: actor(OTHER).claims }, () => {}), /SIGN_IN_REQUIRED/)
  await assert.rejects(repo.withOwner({ ...actor(OWNER), claims: { ...actor(OWNER).claims, exp: 1 } }, () => {}), /SIGN_IN_REQUIRED/)
  assert.equal(f.connects(), before)
})

test('rejects unsafe database roles and inactive or revoked owner/session', async () => {
  for (const options of [{ unsafeRole: true }, { ownerReady: false }]) {
    const f = fixture(options)
    await assert.rejects(f.repository().withOwner(actor(OWNER), () => assert.fail('must not run')), options.unsafeRole ? /DATABASE_ROLE_UNSAFE/ : /BILLING_ACCOUNT_REQUIRED/)
    assert.ok(f.calls.some(call => call.sql === 'ROLLBACK'))
    assert.equal(f.calls.at(-1).sql, 'release')
  }
})

test('uses only billing role and transaction-local owner/environment scope', async () => {
  const f = fixture()
  await f.repository().withOwner(actor(OWNER), async store => { assert.equal(store.ownerId, OWNER); assert.equal(await store.getSubscription(), null) })
  assert.ok(f.calls.some(call => call.sql === 'SET LOCAL ROLE hh_billing_backend'))
  assert.ok(f.calls.some(call => call.sql.includes("'hh.billing_environment'") && call.values[1] === 'sandbox'))
  assert.ok(f.calls.some(call => call.sql.includes("'hh.billing_owner'") && call.values[0] === OWNER))
  assert.ok(!f.calls.some(call => /from app\.|from auth\.|hh_app_backend/.test(call.sql)))
  assert.ok(f.calls.findIndex(call => call.sql.includes('owner_ready')) < f.calls.findIndex(call => call.sql.includes('accounts where') && call.sql.endsWith('for update')))
})

test('one durable pending checkout wins across different client operation IDs', async () => {
  const f = seeded(), repo = f.repository()
  const first = await repo.withOwner(actor(OWNER), store => store.prepareCheckout({ ...checkoutContext, operationId: OPERATION, planId: 'start' }))
  const second = await repo.withOwner(actor(OWNER), store => store.prepareCheckout({ ...checkoutContext, operationId: NEXT_OPERATION, planId: 'start' }))
  assert.equal(first.operationId, OPERATION)
  assert.ok(Number.isFinite(Date.parse(first.createdAt)))
  assert.deepEqual({ locale: first.locale, origin: first.origin, priceId: first.priceId }, checkoutContext)
  assert.deepEqual(second, first)
  assert.equal(f.state().checkouts.length, 1)
})

test('concurrent owner requests serialize before provider callbacks', async () => {
  const f = seeded(), repo = f.repository(), order = []
  let releaseFirst, firstStarted
  const started = new Promise(resolve => { firstStarted = resolve })
  const blocked = new Promise(resolve => { releaseFirst = resolve })
  const first = repo.withOwner(actor(OWNER), async store => {
    order.push('first-start'); firstStarted(); await blocked
    await store.prepareCheckout({ ...checkoutContext, operationId: OPERATION, planId: 'start' }); order.push('first-end')
  })
  await started
  const second = repo.withOwner(actor(OWNER), async store => { order.push('second-start'); return store.prepareCheckout({ ...checkoutContext, operationId: NEXT_OPERATION, planId: 'start' }) })
  await Promise.resolve(); assert.deepEqual(order, ['first-start'])
  releaseFirst(); await first
  assert.equal((await second).operationId, OPERATION)
  assert.deepEqual(order, ['first-start', 'first-end', 'second-start'])
})

test('provider timeout rolls back completion but preserves committed prepare', async () => {
  const f = seeded(), repo = f.repository()
  await repo.withOwner(actor(OWNER), store => store.prepareCheckout({ ...checkoutContext, operationId: OPERATION, planId: 'start' }))
  await assert.rejects(repo.withOwner(actor(OWNER), async store => {
    await store.saveCheckout({ operationId: OPERATION, providerCheckoutId: 'cs_1', url: 'https://checkout.stripe.com/c/1', expiresAt: '2099-01-01T00:00:00Z' })
    throw new Error('ambiguous provider timeout')
  }), /ambiguous provider timeout/)
  const checkout = await repo.withOwner(actor(OWNER), store => store.getCheckout())
  assert.equal(checkout.operationId, OPERATION); assert.equal(checkout.status, 'pending'); assert.equal(checkout.url, null)
})

test('expired wall-clock checkout stays unresolved until provider-confirmed close', async () => {
  const f = seeded(), repo = f.repository()
  await repo.withOwner(actor(OWNER), store => store.prepareCheckout({ ...checkoutContext, operationId: OPERATION, planId: 'start' }))
  await repo.withOwner(actor(OWNER), store => store.saveCheckout({ operationId: OPERATION, providerCheckoutId: 'cs_1', url: 'https://checkout.stripe.com/c/1', expiresAt: '2000-01-01T00:00:00Z' }))
  const open = await repo.withOwner(actor(OWNER), store => store.prepareCheckout({ ...checkoutContext, operationId: NEXT_OPERATION, planId: 'start' }))
  assert.equal(open.operationId, OPERATION); assert.equal(open.status, 'open')
  await repo.withOwner(actor(OWNER), store => store.closeCheckout({ operationId: OPERATION, status: 'expired' }))
  assert.equal((await repo.withOwner(actor(OWNER), store => store.prepareCheckout({ ...checkoutContext, operationId: NEXT_OPERATION, planId: 'start' }))).operationId, NEXT_OPERATION)
  assert.equal(f.state().checkouts[0].checkout_url, null)
})

test('customer mapping is immutable and environment mismatches fail closed', async () => {
  const f = seeded(), repo = f.repository()
  await assert.rejects(repo.withOwner(actor(OWNER), store => store.saveCustomer({ customerId: 'cus_attack' })), /BILLING_CUSTOMER_CONFLICT/)
  await assert.rejects(repo.withOwner(actor(OWNER), store => store.saveSubscription(snapshot({ environment: 'live' }))), /BILLING_INPUT_INVALID/)
  assert.throws(() => repo.withCustomer(event({ environment: 'live' }), () => {}), /BILLING_INPUT_INVALID/)
  await assert.rejects(f.repository({ ...settings, environment: 'live' }).withCustomer(event({ environment: 'live' }), () => {}), /BILLING_CUSTOMER_UNKNOWN/)
  assert.equal(f.state().customers[0].customer_id, 'cus_owner')
})

test('unknown webhook customer cannot assign itself through metadata or mark processed', async () => {
  const f = seeded()
  await assert.rejects(f.repository().withCustomer(event({ customerId: 'cus_unknown', metadata: { ownerId: OWNER } }), () => assert.fail('must not run')), /BILLING_CUSTOMER_UNKNOWN/)
  assert.equal(f.state().events.length, 0)
})

test('event marker commits atomically after successful reconciliation and deduplicates', async () => {
  const f = seeded(), repo = f.repository()
  const result = await repo.withCustomer(event(), async store => {
    assert.ok(f.calls.some(call => call.sql.includes('accounts where') && call.sql.endsWith('for update')))
    assert.ok(!f.calls.some(call => call.sql.startsWith('insert into billing_private.processed_events')))
    await store.saveSubscription(snapshot()); return 'reconciled'
  })
  assert.deepEqual(result, { duplicate: false, result: 'reconciled' })
  assert.equal(f.state().subscriptions.length, 1); assert.equal(f.state().events.length, 1)
  assert.deepEqual(await repo.withCustomer(event(), () => assert.fail('duplicate must not reconcile')), { duplicate: true, result: null })
})

test('failed reconciliation leaves neither entitlement state nor processed marker', async () => {
  const f = seeded(), repo = f.repository()
  await assert.rejects(repo.withCustomer(event(), async store => { await store.saveSubscription(snapshot()); throw new Error('provider graph incomplete') }), /provider graph incomplete/)
  assert.equal(f.state().subscriptions.length, 0); assert.equal(f.state().events.length, 0)
  assert.ok(!f.calls.some(call => call.sql.startsWith('insert into billing_private.processed_events')))
  await repo.withCustomer(event(), store => store.saveSubscription(snapshot()))
  assert.equal(f.state().events.length, 1)
})

test('older provider version cannot overwrite newer state', async () => {
  const f = seeded(), repo = f.repository()
  await repo.withOwner(actor(OWNER), store => store.saveSubscription(snapshot({ providerVersion: 10 })))
  const stale = await repo.withOwner(actor(OWNER), store => store.saveSubscription(snapshot({ providerVersion: 9, paidThroughAt: null, status: 'unpaid' })))
  assert.equal(stale.status, 'active'); assert.equal(stale.providerVersion, 10)
  const equal = await repo.withOwner(actor(OWNER), store => store.saveSubscription(snapshot({ providerVersion: 10, paidThroughAt: null, status: 'unpaid' })))
  assert.equal(equal.status, 'active')
  assert.equal(f.state().subscriptions[0].revision, 0)
})

test('historical subscription cannot displace current subscription', async () => {
  const f = seeded(), repo = f.repository()
  await repo.withOwner(actor(OWNER), store => store.saveSubscription(snapshot({ subscriptionId: 'sub_old', status: 'canceled', paidThroughAt: '2000-01-01T00:00:00Z' })))
  await repo.withOwner(actor(OWNER), store => store.saveSubscription(snapshot({ subscriptionId: 'sub_new' })))
  await repo.withOwner(actor(OWNER), store => store.saveSubscription(snapshot({ subscriptionId: 'sub_old', paidThroughAt: '2099-12-01T00:00:00Z' })))
  assert.equal((await repo.withOwner(actor(OWNER), store => store.getSubscription())).subscriptionId, 'sub_new')
  assert.equal(f.state().subscriptions.filter(row => row.is_current).length, 1)
})

test('end-of-period cancellation preserves paid-through and durable operation on failure', async () => {
  const f = seeded(), repo = f.repository()
  await repo.withOwner(actor(OWNER), store => store.saveSubscription(snapshot()))
  await repo.withOwner(actor(OWNER), store => store.prepareCancellation({ subscriptionId: 'sub_1', operationId: OPERATION }))
  await assert.rejects(repo.withOwner(actor(OWNER), async store => { await store.completeCancellation({ operationId: OPERATION }); throw new Error('reconcile timeout') }), /reconcile timeout/)
  assert.equal((await repo.withOwner(actor(OWNER), store => store.getCancellation())).operationId, OPERATION)
  await repo.withOwner(actor(OWNER), async store => {
    await store.saveSubscription(snapshot({ cancelAtPeriodEnd: true })); await store.completeCancellation({ operationId: OPERATION })
  })
  const subscription = await repo.withOwner(actor(OWNER), store => store.getSubscription())
  assert.equal(subscription.cancelAtPeriodEnd, true); assert.equal(subscription.paidThroughAt, '2099-01-01T00:00:00.000Z')
  assert.equal(await repo.withOwner(actor(OWNER), store => store.getCancellation()), null)
})

test('SQL proposal is explicitly unapplied and contains isolation/concurrency barriers', async () => {
  const sql = await readFile(new URL('../docs/billing/proposed-subscription-schema.sql', import.meta.url), 'utf8')
  assert.match(sql, /UNAPPLIED PROPOSAL ONLY/)
  assert.match(sql, /RAISE EXCEPTION 'UNAPPLIED BILLING PROPOSAL/)
  assert.match(sql, /NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS/)
  assert.match(sql, /billing_one_open_checkout[\s\S]*WHERE status IN \('pending','open'\)/)
  assert.match(sql, /PRIMARY KEY\(provider,environment,event_id\)/)
  assert.match(sql, /ON billing_private\.subscriptions\(owner_id,environment\) WHERE is_current/)
  assert.match(sql, /ON billing_private\.checkout_operations\(owner_id,environment\)/)
  assert.match(sql, /FORCE ROW LEVEL SECURITY/)
  assert.match(sql, /WHERE id=p_owner AND status='active' AND onboarding_state='active' FOR SHARE/)
  assert.match(sql, /BEFORE UPDATE OF status OR DELETE ON app\.accounts/)
  assert.match(sql, /MESSAGE='BILLING_CANCEL_REQUIRED'/)
  assert.match(sql, /ORDER BY provider,environment FOR UPDATE/)
  assert.match(sql, /status NOT IN \('canceled','incomplete_expired'\) AND NOT cancel_at_period_end/)
  assert.doesNotMatch(sql, /GRANT[^;]*ON (?:app\.|auth\.)/i)
  assert.doesNotMatch(sql, /REFERENCES (?:app\.accounts|auth\.users)/i)
})


test('commerce extension reuses scoped transaction without overriding ownership or methods', async () => {
  const f = seeded()
  const repo = createBillingRepository(appConfig, settings, { pool: f.pool, extendStore: (db, ownerId, provider, environment) => ({
    async commerceIdentity() { assert.equal(typeof db.query, 'function'); return { ownerId, provider, environment } },
  }) })
  assert.deepEqual(await repo.withOwner(actor(OWNER), store => store.commerceIdentity()), { ownerId: OWNER, ...settings })
  for (const extension of [{ ownerId: OTHER }, { saveSubscription() {} }, Promise.resolve({})]) {
    const bad = createBillingRepository(appConfig, settings, { pool: f.pool, extendStore: () => extension })
    await assert.rejects(bad.withOwner(actor(OWNER), () => assert.fail('unsafe extension must not run')), /BILLING_STORE_EXTENSION_INVALID/)
  }
})


test('durable checkout keeps original request parameters and rejects untrusted return origins', async () => {
  const f = seeded(), repo = f.repository()
  await repo.withOwner(actor(OWNER), store => store.prepareCheckout({ ...checkoutContext, operationId: OPERATION, planId: 'start' }))
  const repeated = await repo.withOwner(actor(OWNER), store => store.prepareCheckout({ ...checkoutContext, locale: 'en', operationId: NEXT_OPERATION, planId: 'start' }))
  assert.equal(repeated.locale, 'ru'); assert.equal(repeated.priceId, 'price_monthly')
  for (const origin of ['https://untrusted.test', 'https://holistic.test/private', 'https://user@holistic.test', 'http://holistic.test']) {
    await assert.rejects(repo.withOwner(actor(OWNER), store => store.prepareCheckout({ ...checkoutContext, origin, operationId: NEXT_OPERATION, planId: 'start' })), /BILLING_INPUT_INVALID/)
  }
})

}
