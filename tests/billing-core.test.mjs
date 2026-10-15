import test from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { getBillingConfig } from '../lib/billing/config.js'
import { subscriptionEntitlement } from '../lib/billing/entitlements.js'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

if (!process.execArgv.includes('--conditions=react-server')) {
  test('Server-only billing suite with real module condition', () => {
    const run = spawnSync(process.execPath, ['--conditions=react-server', '--test', fileURLToPath(import.meta.url)], { encoding: 'utf8' })
    assert.equal(run.status, 0, run.stdout + run.stderr)
  })
} else {
const { createStripeProvider } = await import('../lib/billing/stripe-provider.js')
const { createBillingService } = await import('../lib/billing/service.js')
const NOW = Date.parse('2026-10-13T12:00:00Z'), END = '2026-11-13T12:00:00.000Z'
const OP = '4b93bfbb-1ec2-4cc4-b7d0-4bd0a9265fcd'
const config = { configured: true, enabled: true, schemaApproved: true, provider: 'stripe', environment: 'sandbox',
  priceIds: { start: 'price_fixture', advanced: 'price_advanced', premium: 'price_premium' }, enabledPlans: ['start', 'advanced', 'premium'], accountId: 'acct_fixture', portalConfigurationId: 'bpc_fixture', webhookSecret: 'whsec_fixture' }
const paidSub = () => ({ provider: 'stripe', environment: 'sandbox', customerId: 'cus_fixture', subscriptionId: 'sub_fixture',
  planId: 'start', status: 'active', cancelAtPeriodEnd: false, paidThroughAt: END, currentPeriodEnd: END, revokedAt: null })
function stripeFixture() {
  const calls = [], price = { id: config.priceIds.start, active: true, currency: 'eur', unit_amount: 1000, livemode: false, type: 'recurring', billing_scheme: 'per_unit',
    recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' } }
  const subscription = { id: 'sub_fixture', customer: 'cus_fixture', livemode: false, created: 1,
    status: 'active', cancel_at_period_end: false, items: { data: [{ quantity: 1, price, current_period_end: Date.parse(END) / 1000 }], has_more: false } }
  const invoice = { id: 'in_fixture', customer: 'cus_fixture', livemode: false, status: 'paid', amount_paid: 1000,
    currency: 'eur', parent: { subscription_details: { subscription: subscription.id } } }
  const line = { pricing: { price_details: { price: price.id } }, parent: { subscription_item_details: { subscription: subscription.id, proration: false } },
    quantity: 1, amount: 1000, period: { start: NOW / 1000 - 100, end: Date.parse(END) / 1000 } }
  const payment = { id: 'inpay_fixture', invoice: invoice.id, livemode: false, currency: 'eur', status: 'paid', amount_paid: 1000,
    payment: { type: 'payment_intent', payment_intent: 'pi_fixture' } }
  const charge = { id: 'ch_fixture', customer: 'cus_fixture', livemode: false, paid: true, captured: true, status: 'succeeded', payment_intent: 'pi_fixture', amount: 1000, amount_captured: 1000,
    amount_refunded: 0, refunded: false, disputed: false, currency: 'eur' }
  const client = {
    accounts: { retrieve: async () => ({ id: config.accountId }) },
    prices: { retrieve: async () => price },
    customers: { create: async (...args) => { calls.push(['customer', ...args]); return { id: 'cus_fixture', livemode: false } } },
    subscriptions: { list: async () => ({ data: [subscription], has_more: false }), retrieve: async () => subscription,
      update: async (...args) => { calls.push(['cancel', ...args]); subscription.cancel_at_period_end = true; return subscription } },
    invoices: { list: async () => ({ data: [invoice], has_more: false }), listLineItems: async () => ({ data: [line], has_more: false }) },
    invoicePayments: { list: async () => ({ data: [payment], has_more: false }) },
    paymentIntents: { retrieve: async () => ({ id: 'pi_fixture', customer: 'cus_fixture', livemode: false, status: 'succeeded', currency: 'eur', latest_charge: charge }) },
    charges: { retrieve: async () => charge },
    disputes: {list:async()=>({data:[],has_more:false}),retrieve:async()=>null},
    checkout: { sessions: { create: async (...args) => { calls.push(['checkout', ...args]); return { id: 'cs_fixture', livemode: false, url: 'https://checkout.stripe.com/c/pay/fixture', expires_at: NOW / 1000 + 86400 } },
      retrieve: async () => ({ customer: 'cus_fixture', livemode: false, mode: 'subscription', status: 'open', url: 'https://checkout.stripe.com/c/pay/fixture' }) } },
    billingPortal: { sessions: { create: async (...args) => { calls.push(['portal', ...args]); return { url: 'https://billing.stripe.com/p/session/fixture' } } } },
    webhooks: new Stripe('rk_test_fixture_not_a_real_key').webhooks,
  }
  return { provider: createStripeProvider(config, { client, now: () => NOW }), client, calls, price, subscription, invoice, line, payment, charge }
}

test('configuration defaults fail closed and sandbox cannot enable production', () => {
  assert.equal(getBillingConfig({}).configured, false)
  assert.equal(getBillingConfig({ HH_BILLING_SCHEMA_APPROVED: 'true', VERCEL_ENV: 'production' }).schemaApproved, false)
  assert.equal(getBillingConfig({ HH_BILLING_ENABLED: 'true' }).enabled, false)
})
test('access requires trusted paid coverage, right environment and non-revoked period', () => {
  const sub = paidSub(), args = { environment: 'sandbox', now: NOW }
  assert.equal(subscriptionEntitlement(sub, args).active, true)
  for (const invalid of [null, { ...sub, paidThroughAt: null }, { ...sub, environment: 'live' }, { ...sub, revokedAt: END },
    { ...sub, paidThroughAt: new Date(NOW).toISOString() }, { ...sub, planId: 'unknown' }]) assert.equal(subscriptionEntitlement(invalid, args).active, false)
})
test('cancelled or past-due billing preserves already paid access, active alone grants nothing', () => {
  for (const status of ['canceled', 'past_due', 'unpaid']) assert.equal(subscriptionEntitlement({ ...paidSub(), status }, { environment: 'sandbox', now: NOW }).active, true)
  assert.equal(subscriptionEntitlement({ ...paidSub(), paidThroughAt: null }, { environment: 'sandbox', now: NOW }).active, false)
})
test('Stripe grant traces exact invoice, line, payment intent and charge', async () => {
  const { provider } = stripeFixture(), snapshot = await provider.reconcile('cus_fixture')
  assert.equal(snapshot.paidThroughAt, END)
  assert.equal(snapshot.planId, 'start')
})
test('unpaid/manual/foreign invoices and unsupported payment proof never grant', async () => {
  for (const alter of [f => { f.invoice.status = 'open' }, f => { f.invoice.paid_out_of_band = true },
    f => { f.invoice.customer = 'cus_other' }, f => { f.payment.payment.type = 'payment_record' },
    f => { f.charge.customer = 'cus_other' }, f => { f.line.pricing.price_details.price = 'price_other' },
    f => { f.line.parent.subscription_item_details.proration = true }]) {
    const f = stripeFixture(); alter(f)
    assert.equal((await f.provider.reconcile('cus_fixture')).paidThroughAt, null)
  }
})
test('full refund or dispute revokes affected coverage; partial refund retains paid period', async () => {
  for (const alter of [f => { f.charge.refunded = true }, f => { f.charge.disputed = true }]) {
    const f = stripeFixture(); alter(f); const snapshot = await f.provider.reconcile('cus_fixture')
    assert.equal(snapshot.paidThroughAt, null); assert.ok(snapshot.revokedAt)
  }
  const f = stripeFixture(); f.charge.amount_refunded = 100
  assert.equal((await f.provider.reconcile('cus_fixture')).paidThroughAt, END)
})
test('historically disputed charge restores coverage only for verified won or warning-closed outcomes',async()=>{
 for(const status of ['won','warning_closed','lost','needs_response','under_review','warning_needs_response','warning_under_review','unknown']){
  const f=stripeFixture();f.charge.disputed=true
  f.client.disputes.list=async input=>{assert.equal(input.charge,f.charge.id);return {data:[{id:'dp_fixture'}],has_more:false}}
  f.client.disputes.retrieve=async id=>({id,charge:f.charge.id,payment_intent:'pi_fixture',livemode:false,currency:'eur',amount:1000,status})
  const snapshot=await f.provider.reconcile('cus_fixture')
  assert.equal(snapshot.paidThroughAt,['won','warning_closed'].includes(status)?END:null,status)
 }
})
test('dispute recovery rejects foreign/mode/malformed/open evidence and never overrides full refunds',async()=>{
 for(const alter of [d=>({...d,charge:'ch_other'}),d=>({...d,livemode:true}),d=>({...d,payment_intent:'pi_other'}),d=>({...d,currency:'usd'}),d=>({...d,amount:1001}),d=>({...d,id:'dp_other'})]){
  const f=stripeFixture();f.charge.disputed=true
  f.client.disputes.list=async()=>({data:[{id:'dp_fixture'}],has_more:false})
  f.client.disputes.retrieve=async()=>alter({id:'dp_fixture',charge:f.charge.id,livemode:false,currency:'eur',amount:1000,status:'won'})
  assert.equal((await f.provider.reconcile('cus_fixture')).paidThroughAt,null)
 }
 const f=stripeFixture();f.charge.disputed=true;f.charge.refunded=true
 f.client.disputes.list=async()=>({data:[{id:'dp_fixture'}],has_more:false})
 f.client.disputes.retrieve=async()=>({id:'dp_fixture',charge:f.charge.id,livemode:false,currency:'eur',amount:1000,status:'won'})
 assert.equal((await f.provider.reconcile('cus_fixture')).paidThroughAt,null)
 f.charge.refunded=false;f.client.disputes.list=async()=>({data:[{id:'dp_fixture'},{id:'dp_open'}],has_more:false})
 f.client.disputes.retrieve=async id=>({id,charge:f.charge.id,livemode:false,currency:'eur',amount:1000,status:id==='dp_open'?'under_review':'won'})
 assert.equal((await f.provider.reconcile('cus_fixture')).paidThroughAt,null)
 f.client.disputes.list=async()=>{throw new Error('outage')}
 assert.equal((await f.provider.reconcile('cus_fixture')).paidThroughAt,null)
})
test('archiving an approved price does not revoke an already paid subscriber', async () => {
  const f = stripeFixture(); f.price.active = false
  assert.equal((await f.provider.reconcile('cus_fixture')).paidThroughAt, END)
  await assert.rejects(f.provider.checkout({ customerId: 'cus_fixture', operationId: OP, planId: 'start', origin: 'https://example.com', locale: 'en' }), /BILLING_PROVIDER_MISMATCH/)
})
test('wrong mode, amount, customer or multiple recurring contracts fail closed', async () => {
  for (const alter of [f => { f.subscription.livemode = true }, f => { f.price.unit_amount = 999 }, f => { f.subscription.customer = 'cus_other' },
    f => { f.client.subscriptions.list = async () => ({ data: [f.subscription, { ...f.subscription, id: 'sub_second' }], has_more: false }) }]) {
    const f = stripeFixture(); alter(f); await assert.rejects(f.provider.reconcile('cus_fixture'))
  }
})
test('checkout sends fixed monthly plan with stable key and no health or owner metadata', async () => {
  const f = stripeFixture()
  await f.provider.createCustomer('internal-owner')
  assert.deepEqual(f.calls[0][1], {})
  await f.provider.checkout({ customerId: 'cus_fixture', operationId: OP, planId: 'start', origin: 'https://example.com', locale: 'ru' })
  const args = f.calls.find(c => c[0] === 'checkout')
  assert.equal(args[1].mode, 'subscription'); assert.deepEqual(args[1].line_items, [{ price: config.priceIds.start, quantity: 1 }])
  assert.equal(args[1].metadata, undefined); assert.equal(args[1].payment_method_types, undefined)
  assert.match(args[1].integration_identifier, /_[a-z]{8}$/)
  assert.match(args[1].success_url, /settings\?billing=success$/)
})
test('portal uses owned customer and explicit approved configuration', async () => {
  const f = stripeFixture(); await f.provider.portal({ customerId: 'cus_fixture', origin: 'https://example.com', locale: 'en' })
  const args = f.calls.find(c => c[0] === 'portal')[1]
  assert.equal(args.customer, 'cus_fixture'); assert.equal(args.configuration, config.portalConfigurationId)
})
test('cancel renewal uses period-end without prorations, validates ownership and retains paid access', async () => {
  const f = stripeFixture(); const snapshot = await f.provider.cancelRenewal({ customerId: 'cus_fixture', subscriptionId: 'sub_fixture', operationId: OP })
  assert.equal(snapshot.cancelAtPeriodEnd, true); assert.equal(snapshot.paidThroughAt, END)
  assert.deepEqual(f.calls.find(c => c[0] === 'cancel')[2], { cancel_at_period_end: true, proration_behavior: 'none' })
  await assert.rejects(f.provider.cancelRenewal({ customerId: 'cus_other', subscriptionId: 'sub_fixture', operationId: OP }))
})
test('signature verifies exact raw body and rejects tampering, stale and wrong-mode events', () => {
  const f = stripeFixture(), body = JSON.stringify({ id: 'evt_fixture', type: 'invoice.paid', livemode: false, data: { object: f.invoice } })
  const header = f.client.webhooks.generateTestHeaderString({ payload: body, secret: config.webhookSecret })
  assert.equal(f.provider.verifyWebhook(Buffer.from(body), header).id, 'evt_fixture')
  assert.throws(() => f.provider.verifyWebhook(body + ' ', header), /BILLING_SIGNATURE_INVALID/)
  const stale = f.client.webhooks.generateTestHeaderString({ payload: body, secret: config.webhookSecret, timestamp: 1 })
  assert.throws(() => f.provider.verifyWebhook(body, stale), /BILLING_SIGNATURE_INVALID/)
})

function serviceFixture() {
  let state = { sub: null, customer: null, checkout: null, cancel: null }, chain = Promise.resolve()
  const history = [], provider = { createCustomer: async () => 'cus_fixture', reconcile: async () => state.sub,
    checkout: async args => { history.push(['remoteCheckout', structuredClone(state), args]); return { providerCheckoutId: 'cs_fixture', url: 'https://checkout.stripe.com/c/pay/fixture', expiresAt: END } },
    readCheckout: async () => ({ status: 'open' }), cancelRenewal: async () => ({ ...state.sub, cancelAtPeriodEnd: true }) }
  const repository = { withOwner: (_actor, callback) => {
    const result = chain.then(async () => {
      const draft = structuredClone(state)
      const store = { ownerId: 'owner', getCustomer: async () => draft.customer, saveCustomer: async c => (draft.customer = c),
        getSubscription: async () => draft.sub, saveSubscription: async sub => (draft.sub = sub), getCheckout: async () => draft.checkout,
        prepareCheckout: async input => draft.checkout ||= { ...input, createdAt: new Date(NOW).toISOString(), status: 'pending' },
        saveCheckout: async input => (draft.checkout = { ...draft.checkout, ...input, status: 'open' }), closeCheckout: async () => { draft.checkout = null },
        getCancellation: async () => draft.cancel, prepareCancellation: async input => (draft.cancel = input), completeCancellation: async () => { draft.cancel = null } }
      const value = await callback(store); state = draft; history.push(['commit', structuredClone(state)]); return value
    }); chain = result.catch(() => {}); return result
  } }
  const service = createBillingService({}, { config, repository, provider, now: () => NOW })
  return { service, provider, history, state: () => state, set: patch => Object.assign(state, patch) }
}
test('customer mapping commits before chargeable checkout, retry preserves original request context', async () => {
  const f = serviceFixture(); let attempts = 0
  f.provider.checkout = async args => { f.history.push(['attempt', structuredClone(f.state()), args]); if (++attempts === 1) throw Error('timeout'); return { providerCheckoutId: 'cs_fixture', url: 'https://checkout.stripe.com/c/pay/fixture', expiresAt: END } }
  await assert.rejects(f.service.checkout({}, { operationId: OP, planId: 'start', locale: 'ru' }, 'https://example.com'), /timeout/)
  assert.equal(f.state().customer.customerId, 'cus_fixture')
  await f.service.checkout({}, { operationId: 'second-client-op', planId: 'start', locale: 'en' }, 'https://example.net').catch(error => assert.match(error.message, /INVALID_ID/))
  await f.service.checkout({}, { operationId: OP, planId: 'start', locale: 'en' }, 'https://example.net')
  const attemptsArgs = f.history.filter(c => c[0] === 'attempt')
  assert.ok(attemptsArgs.every(c => c[1].customer.customerId === 'cus_fixture'))
  assert.deepEqual(attemptsArgs[0][2], attemptsArgs[1][2])
})
test('concurrent checkout requests reuse one remotely chargeable session', async () => {
  const f = serviceFixture()
  await Promise.all([f.service.checkout({}, { operationId: OP, planId: 'start', locale: 'en' }, 'https://example.com'),
    f.service.checkout({}, { operationId: 'ad2eecab-3a73-42f3-a4a0-15f70fdc5f5e', planId: 'start', locale: 'en' }, 'https://example.com')])
  assert.equal(f.history.filter(c => c[0] === 'remoteCheckout').length, 1)
})
test('existing subscription never creates a stranded pending checkout', async () => {
  const f = serviceFixture(); f.set({ sub: paidSub() })
  await assert.rejects(f.service.checkout({}, { operationId: OP, planId: 'start', locale: 'en' }, 'https://example.com'), /ALREADY_SUBSCRIBED/)
  assert.equal(f.state().checkout, null)
})
test('expired idempotency retention blocks recreation and preserves unresolved record', async () => {
  const f = serviceFixture(); f.set({ checkout: { operationId: OP, planId: 'start', createdAt: new Date(NOW - 86400000).toISOString(), status: 'pending' } })
  await assert.rejects(f.service.checkout({}, { operationId: OP, planId: 'start', locale: 'en' }, 'https://example.com'), /RECONCILIATION_REQUIRED/)
  assert.equal(f.history.filter(c => c[0] === 'remoteCheckout').length, 0)
})
test('account deletion requires renewal cancellation and unresolved checkout reconciliation', async () => {
  const f = serviceFixture(); f.set({ sub: paidSub() })
  await assert.rejects(f.service.guardAccountDeletion({}), /CANCEL_REQUIRED/)
  f.set({ sub: { ...paidSub(), cancelAtPeriodEnd: true } }); await f.service.guardAccountDeletion({})
  f.set({ checkout: { status: 'pending' } }); await assert.rejects(f.service.guardAccountDeletion({}), /CANCEL_REQUIRED/)
})

test('Stripe merchant binding rejects a different configured account', async () => {
  const f = stripeFixture(); f.client.accounts.retrieve = async () => ({ id: 'acct_other' })
  await assert.rejects(f.provider.createCustomer('internal-owner'), /PROVIDER_MISMATCH/)
  assert.equal(f.calls.length, 0)
})
test('dispute customer lookup verifies the merchant before retrieving a charge', async () => {
  const f = stripeFixture(); let read = false
  f.client.accounts.retrieve = async () => ({ id: 'acct_other' })
  f.client.charges.retrieve = async () => { read = true; return f.charge }
  await assert.rejects(f.provider.webhookCustomer({ type: 'charge.dispute.created', data: { object: { charge: 'ch_fixture' } } }), /PROVIDER_MISMATCH/)
  assert.equal(read, false)
})
test('uncaptured charges never grant a paid period', async () => {
  const f = stripeFixture(); f.charge.captured = false
  assert.equal((await f.provider.reconcile('cus_fixture')).paidThroughAt, null)
})
test('complete checkout retains deletion guard until its exact subscription is persisted', async () => {
  const f = serviceFixture(); f.set({ customer: { customerId: 'cus_fixture' }, checkout: { operationId: OP, planId: 'start', providerCheckoutId: 'cs_fixture' } })
  f.provider.readCheckout = async () => ({ status: 'complete', subscriptionId: 'sub_fixture' })
  await f.service.reconcile({}, {})
  assert.ok(f.state().checkout)
  f.set({ sub: paidSub() }); await f.service.reconcile({}, {})
  assert.equal(f.state().checkout, null)
})
test('a separate open checkout is not discarded when a subscription is discovered', async () => {
  const f = serviceFixture(); f.set({ customer: { customerId: 'cus_fixture' }, checkout: { operationId: OP, planId: 'start', providerCheckoutId: 'cs_fixture', createdAt: new Date(NOW).toISOString() } })
  f.provider.reconcile = async () => paidSub()
  await assert.rejects(f.service.checkout({}, { operationId: OP, planId: 'start', locale: 'en' }, 'https://example.com'), /ALREADY_SUBSCRIBED/)
  assert.ok(f.state().checkout)
  assert.equal(f.state().sub.subscriptionId, 'sub_fixture')
})


test('each EUR tier maps exact verified price/payment to its own account mode', async () => {
  for (const [planId, amount, courses, freeTests, sessions] of [
    ['start', 1000, 1, false, 0], ['advanced', 2000, 5, false, 0], ['premium', 10000, 5, true, 1],
  ]) {
    const f = stripeFixture()
    f.price.id = config.priceIds[planId]; f.price.unit_amount = amount
    f.invoice.amount_paid = amount; f.line.pricing.price_details.price = f.price.id; f.line.amount = amount
    f.payment.amount_paid = amount; f.charge.amount = amount; f.charge.amount_captured = amount
    await f.provider.checkout({ customerId: 'cus_fixture', operationId: OP, origin: 'https://example.com', locale: 'en', planId })
    assert.equal(f.calls.find(c => c[0] === 'checkout')[1].line_items[0].price, config.priceIds[planId])
    const snapshot = await f.provider.reconcile('cus_fixture'), access = subscriptionEntitlement(snapshot, { environment: 'sandbox', now: NOW })
    assert.equal(access.tier, planId); assert.equal(access.activeCourseLimit, courses)
    assert.equal(access.freeTests, freeTests); assert.equal(access.monthlySessions, sessions)
    assert.equal(access.sessionMinutes, sessions ? 60 : 0); assert.equal(access.adFree, true)
    f.charge.currency = 'usd'
    assert.equal(subscriptionEntitlement(await f.provider.reconcile('cus_fixture'), { environment: 'sandbox', now: NOW }).tier, 'free')
  }
})
test('USD legacy price and mismatched chosen tier fail closed', async () => {
  const f = stripeFixture(); f.price.currency = 'usd'
  await assert.rejects(f.provider.checkout({ customerId: 'cus_fixture', operationId: OP, origin: 'https://example.com', locale: 'en', planId: 'start' }), /PROVIDER_MISMATCH/)
  f.price.currency = 'eur'
  await assert.rejects(f.provider.checkout({ customerId: 'cus_fixture', operationId: OP, origin: 'https://example.com', locale: 'en', planId: 'premium' }), /PROVIDER_MISMATCH/)
  assert.equal(subscriptionEntitlement({ ...paidSub(), planId: 'plus' }, { environment: 'sandbox', now: NOW }).tier, 'free')
})
test('unpaid selected higher price never upgrades or removes the still-paid earlier tier', async () => {
  const f = stripeFixture()
  f.subscription.items.data[0].price = { ...f.price, id: config.priceIds.premium, unit_amount: 10000 }
  const snapshot = await f.provider.reconcile('cus_fixture')
  assert.equal(snapshot.planId, 'start'); assert.equal(snapshot.paidThroughAt, END)
})
test('tier expiry/downgrade returns one-course Free allowance without mutation', () => {
  const sub = { ...paidSub(), planId: 'premium' }, before = JSON.stringify(sub)
  const access = subscriptionEntitlement(sub, { environment: 'sandbox', now: Date.parse(END) })
  assert.equal(access.tier, 'free'); assert.equal(access.activeCourseLimit, 1)
  assert.equal(access.monthlySessions, 0); assert.equal(JSON.stringify(sub), before)
})
test('all prices are server-bound and advanced/premium operations are separately gated', () => {
  const env = { HH_BILLING_SCHEMA_APPROVED: 'true', HH_BILLING_ENABLED: 'true',
    HH_STRIPE_RESTRICTED_KEY: 'rk_test_fixture', HH_STRIPE_START_PRICE_ID: 'price_start',
    HH_STRIPE_ADVANCED_PRICE_ID: 'price_advanced', HH_STRIPE_PREMIUM_PRICE_ID: 'price_premium',
    HH_STRIPE_ACCOUNT_ID: 'acct_fixture', HH_STRIPE_WEBHOOK_SECRET: 'whsec_fixture', HH_STRIPE_PORTAL_CONFIGURATION_ID: 'bpc_fixture' }
  assert.deepEqual(getBillingConfig(env).enabledPlans, ['start'])
  assert.deepEqual(getBillingConfig({ ...env, HH_MULTICOURSE_SCHEMA_APPROVED: 'true' }).enabledPlans, ['start', 'advanced'])
  assert.deepEqual(getBillingConfig({ ...env, HH_MULTICOURSE_SCHEMA_APPROVED: 'true', HH_PREMIUM_SESSION_SCHEMA_APPROVED: 'true', HH_PREMIUM_SESSION_FULFILLMENT_APPROVED: 'true' }).enabledPlans, ['start', 'advanced', 'premium'])
  assert.equal(getBillingConfig({ ...env, HH_STRIPE_ADVANCED_PRICE_ID: env.HH_STRIPE_START_PRICE_ID }).configured, false)
  assert.equal(getBillingConfig({ ...env, HH_STRIPE_START_PRICE_ID: '', HH_STRIPE_PLUS_PRICE_ID: 'price_legacy' }).configured, false)
})
test('a different tier cannot reuse a pending checkout or mint another contract', async () => {
  const f = serviceFixture()
  await f.service.checkout({}, { operationId: OP, planId: 'start', locale: 'en' }, 'https://example.com')
  await assert.rejects(f.service.checkout({}, { operationId: 'ad2eecab-3a73-42f3-a4a0-15f70fdc5f5e', planId: 'premium', locale: 'en' }, 'https://example.com'), /BILLING_PLAN_CONFLICT/)
  assert.equal(f.history.filter(c => c[0] === 'remoteCheckout').length, 1)
  assert.equal(f.state().checkout.planId, 'start')
  for (const planId of ['free', 'plus', 'unknown', undefined])
    await assert.rejects(f.service.checkout({}, { operationId: OP, planId, locale: 'en' }, 'https://example.com'), /BILLING_PLAN_INVALID/)
})

}
