import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCommerceService } from '../lib/commerce/service.js'
import { getCommerceConfig } from '../lib/commerce/config.js'

const owner = { id: '11111111-1111-4111-8111-111111111111' }
const stranger = { id: '22222222-2222-4222-8222-222222222222' }
const orderId = '33333333-3333-4333-8333-333333333333'
const operationId = '44444444-4444-4444-8444-444444444444'
const request = () => ({ operationId, locale: 'ru', items: [{ serviceId: 'express-consultation-30', quantity: 1 }] })
const config = { configured: true, enabled: true, provider: 'stripe', environment: 'sandbox', prices: { 'express-consultation-30': 'price_30', 'personal-session-60': 'price_60' } }

function fixture() {
  let state = { customer: null, order: null, events: [], settled: [] }
  let tail = Promise.resolve()
  const calls = []
  let providerStatus = 'open', failAfterAccept = false, failBeforeCreate = false, attempts = 0, recovery = false, orderCount = 0
  const accepted = new Map()
  function scopedStore() {
    return {
      ownerId: owner.id,
      getCustomer: async () => state.customer,
      getLatestSettledServiceOrder: async cart => [...state.settled].reverse().find(order => JSON.stringify(order.items) === JSON.stringify(cart.items)) || null,
      saveCustomer: async (input) => (state.customer = input),
      prepareServiceOrder: async (cart, customerId, origin, prices) => {
        if (state.order && (state.order.operationId === cart.operationId || ['pending','open','processing'].includes(state.order.status))) {
          if (JSON.stringify(state.order.items.map(({serviceId,quantity})=>({serviceId,quantity}))) !== JSON.stringify(cart.items.map(({serviceId,quantity})=>({serviceId,quantity})))) throw Error('SERVICE_ORDER_ALREADY_OPEN')
          return state.order
        }
        orderCount++
        return (state.order = { id: orderCount === 1 ? orderId : '55555555-5555-4555-8555-555555555555', ...cart, origin, providerPrices: { ...prices }, customerId,
          status: 'pending', fulfillmentStatus: 'awaiting_payment', refundStatus: 'none', refundedMinor: 0,
          createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+3600000).toISOString() })
      },
      getOpenServiceOrder: async () => state.order && ['pending','open','processing'].includes(state.order.status) ? state.order : null,
      expireUncreatedServiceOrder: async (id) => {
        assert.equal(id,state.order.id)
        assert.equal(state.order.providerCheckoutId,undefined)
        assert.ok(Date.parse(state.order.expiresAt)+300000<=Date.now())
        state.order.status='expired';state.order.fulfillmentStatus='cancelled'
        return state.order
      },
      getServiceOrder: async (id) => state.order?.id === id ? state.order : null,
      findServiceOrder: async ({ orderId: target }) => target === state.order?.id ? state.order : null,
      saveServiceCheckout: async (id, session) => { assert.equal(id, state.order.id); return (state.order = { ...state.order, providerCheckoutId: session.providerCheckoutId, checkoutUrl: session.url, status: 'open' }) },
      saveServicePayment: async (id, snapshot) => { assert.equal(id, state.order.id); state.order = { ...state.order, ...snapshot,
        fulfillmentStatus: snapshot.status === 'paid' ? 'awaiting_schedule' : ['refunded','disputed','payment_review'].includes(snapshot.status) ? 'on_hold' : 'awaiting_payment' };
        if (['paid','refunded','disputed','payment_review'].includes(snapshot.status)) state.settled = [...state.settled.filter(order => order.id !== id), structuredClone(state.order)];
        return state.order },
    }
  }
  function run(actor, event, fn) {
    const next = tail.then(async () => {
      if (actor && actor.id !== owner.id) throw Error('BILLING_ACCOUNT_REQUIRED')
      if (event && event.customerId !== state.customer?.customerId) throw Error('BILLING_CUSTOMER_UNKNOWN')
      const before = structuredClone(state)
      try {
        if (event && state.events.includes(event.eventId)) return { duplicate: true }
        const result = await fn(scopedStore())
        if (event) state.events.push(event.eventId)
        return event ? { result, duplicate: false } : result
      } catch (error) { state = before; throw error }
    })
    tail = next.catch(() => {})
    return next
  }
  const repository = { withOwner: (actor, fn) => run(actor, null, fn), withCustomer: (event, fn) => run(null, event, fn) }
  const provider = {
    createCustomer: async () => { calls.push('customer'); return 'cus_owner' },
    checkout: async ({ order, origin }) => {
      attempts++
      if (failBeforeCreate) { failBeforeCreate=false; throw Error('crash before create') }
      assert.equal(state.customer.customerId, 'cus_owner')
      assert.equal(state.order.status, 'pending')
      assert.equal(origin, 'https://holistic.example')
      const record = JSON.stringify({ id: order.id, prices: order.providerPrices, origin, locale: order.locale, expires: order.expiresAt })
      if (accepted.has(order.id)) assert.equal(accepted.get(order.id), record)
      else { accepted.set(order.id, record); calls.push('payment-session') }
      if (failAfterAccept) { failAfterAccept = false; throw Error('ambiguous timeout') }
      return { providerCheckoutId: 'cs_test_service', url: 'https://checkout.stripe.com/c/pay/service' }
    },
    findCheckout: async () => recovery && accepted.size ? provider.reconcile() : null,
    reconcile: async () => ({ providerCheckoutId: 'cs_test_service', paymentIntentId: 'pi_service', status: providerStatus,
      refundedMinor: providerStatus === 'refunded' ? 5000 : 0, refundStatus: providerStatus === 'refunded' ? 'full' : 'none',
      url: providerStatus === 'open' ? 'https://checkout.stripe.com/c/pay/service' : null }),
    eventReference: async (event) => event.reference,
  }
  const service = createCommerceService({ config, repository, provider })
  return { service, provider, repository, calls, state: () => state, attempts: () => attempts, setStatus: (value) => { providerStatus = value },
    failOnce: () => { failAfterAccept = true }, crashBefore: () => { failBeforeCreate = true }, expire: () => { state.order.expiresAt = new Date(Date.now()-600000).toISOString() }, recover: () => { recovery = true }, age: () => { state.order.createdAt = '2020-01-01T00:00:00Z' },
    event: (id='evt_paid', target=orderId) => ({ id, type: 'checkout.session.completed', reference: { customerId:'cus_owner', checkoutId:'cs_test_service', orderId:target } }) }
}

test('concurrent checkout requests create one durable order and one remote session', async () => {
  const f = fixture()
  const results = await Promise.all(Array.from({length:8},()=>f.service.checkout(owner,request(),'https://holistic.example')))
  assert.equal(new Set(results.map((entry)=>entry.order.id)).size,1)
  assert.equal(f.calls.filter((value)=>value==='payment-session').length,1)
  assert.equal(f.state().order.fulfillmentStatus,'awaiting_payment')
})

test('timeout retry keeps persisted order, customer, origin, locale, prices and idempotency', async () => {
  const f = fixture(); f.failOnce()
  await assert.rejects(f.service.checkout(owner,request(),'https://holistic.example'), /ambiguous timeout/)
  assert.equal(f.state().customer.customerId,'cus_owner')
  assert.equal(f.state().order.status,'pending')
  await f.service.checkout(owner,{...request(),locale:'en'},'https://different-allowed.example')
  assert.equal(f.calls.filter((value)=>value==='payment-session').length,1)
  assert.equal(f.attempts(),2)
  assert.equal(f.state().order.locale,'ru')
})

test('old ambiguous operations cannot silently create a second payment session', async () => {
  const f = fixture(); f.failOnce()
  await assert.rejects(f.service.checkout(owner,request(),'https://holistic.example'))
  f.age()
  await assert.rejects(f.service.checkout(owner,request(),'https://holistic.example'), /SERVICE_RECONCILIATION_REQUIRED/)
  assert.equal(f.attempts(),1)
})

test('old timed-out checkout is recovered as paid/expired without creating a second charge', async () => {
  for (const status of ['paid', 'expired', 'open']) {
    const f = fixture(); f.failOnce()
    await assert.rejects(f.service.checkout(owner,request(),'https://holistic.example'))
    f.age(); f.recover(); f.setStatus(status)
    const recovered = await f.service.checkout(owner, request(), 'https://holistic.example')
    assert.equal(recovered.order.status, status)
    assert.equal(f.attempts(), 1)
    assert.equal(f.calls.filter((value)=>value==='payment-session').length, 1)
    assert.equal(Boolean(recovered.redirectUrl), status === 'open')
  }
})

test('fresh operation after reload returns recovered paid or held order without a second checkout', async () => {
  for (const status of ['paid', 'refunded', 'disputed', 'payment_review']) {
    for (const missingResponse of [false, true]) {
      const f = fixture()
      if (missingResponse) {
        f.failOnce()
        await assert.rejects(f.service.checkout(owner, request(), 'https://holistic.example'))
        f.recover()
      } else await f.service.checkout(owner, request(), 'https://holistic.example')
      f.setStatus(status)
      const result = await f.service.checkout(owner, { ...request(), operationId: '66666666-6666-4666-8666-666666666666' }, 'https://holistic.example')
      assert.equal(result.order.id, orderId)
      assert.equal(result.order.status, status)
      assert.equal(result.redirectUrl, null)
      assert.equal(f.calls.filter(value => value === 'payment-session').length, 1)
      assert.equal(f.attempts(), 1)
    }
  }
})

test('crash before provider create expires safely only after a complete absence read and frozen lifetime', async () => {
  const f = fixture(); f.crashBefore()
  await assert.rejects(f.service.checkout(owner,request(),'https://holistic.example'), /crash before create/)
  f.age(); f.expire()
  const closed=await f.service.checkout(owner,request(),'https://holistic.example')
  assert.equal(closed.order.status,'expired')
  assert.equal(closed.order.fulfillmentStatus,'cancelled')
  assert.equal(f.attempts(),1)
  const next=await f.service.checkout(owner,{...request(),operationId:'66666666-6666-4666-8666-666666666666'},'https://holistic.example')
  assert.equal(next.order.status,'open')
  assert.equal(f.calls.filter((value)=>value==='payment-session').length,1)
})

test('return/order reads cannot claim payment; verified paid webhook queues scheduling exactly once', async () => {
  const f = fixture(); await f.service.checkout(owner,request(),'https://holistic.example')
  f.setStatus('paid')
  assert.equal((await f.service.readOrder(owner,orderId)).status,'open')
  const paid=await f.service.handleVerifiedEvent(f.event())
  assert.equal(paid.handled,true)
  assert.equal((await f.service.readOrder(owner,orderId)).status,'paid')
  assert.equal(f.state().order.fulfillmentStatus,'awaiting_schedule')
  assert.equal((await f.service.handleVerifiedEvent(f.event())).duplicate,true)
  assert.equal(f.state().events.length,1)
})

test('refunds and disputes hold fulfilment and remain owner scoped', async () => {
  const f = fixture(); await f.service.checkout(owner,request(),'https://holistic.example')
  f.setStatus('paid'); await f.service.handleVerifiedEvent(f.event())
  f.setStatus('refunded'); await f.service.handleVerifiedEvent(f.event('evt_refund'))
  assert.equal(f.state().order.refundStatus,'full')
  assert.equal(f.state().order.fulfillmentStatus,'on_hold')
  await assert.rejects(f.service.readOrder(stranger,orderId), /BILLING_ACCOUNT_REQUIRED/)
  await assert.rejects(f.service.readOrder(owner,operationId), /SERVICE_ORDER_NOT_FOUND/)
})

test('unowned events roll back dedup markers so the subscription dispatcher can handle them', async () => {
  const f = fixture(); await f.service.checkout(owner,request(),'https://holistic.example')
  assert.equal((await f.service.handleVerifiedEvent(f.event('evt_subscription',operationId))).handled,false)
  assert.equal((await f.service.handleVerifiedEvent(f.event('evt_subscription',operationId))).handled,false)
  assert.equal(f.state().events.length,0)
})

test('checkout remains disabled without independent schema, prices, fulfilment and tax gates', () => {
  assert.equal(getCommerceConfig({}).enabled,false)
  const env={HH_BILLING_ENVIRONMENT:'sandbox',HH_BILLING_SCHEMA_APPROVED:'true',HH_COMMERCE_SCHEMA_APPROVED:'true',HH_STRIPE_RESTRICTED_KEY:'rk_test_synthetic',HH_STRIPE_ACCOUNT_ID:'acct_synthetic',HH_STRIPE_WEBHOOK_SECRET:'whsec_synthetic',HH_STRIPE_SERVICE_30_PRICE_ID:'price_30',HH_STRIPE_SERVICE_60_PRICE_ID:'price_60',HH_COMMERCE_ENABLED:'true',HH_COMMERCE_FULFILLMENT_APPROVED:'true',HH_COMMERCE_TAX_REVIEW_APPROVED:'true'}
  assert.equal(getCommerceConfig(env).enabled,true)
  for(const key of ['HH_COMMERCE_SCHEMA_APPROVED','HH_COMMERCE_FULFILLMENT_APPROVED','HH_COMMERCE_TAX_REVIEW_APPROVED']) assert.equal(getCommerceConfig({...env,[key]:'false'}).enabled,false)
  assert.equal(getCommerceConfig({...env,HH_STRIPE_SERVICE_60_PRICE_ID:'price_30'}).enabled,false)
  assert.equal(getCommerceConfig({...env,VERCEL_ENV:'production'}).enabled,false)
})


test('settled matching cart requires durable repeat confirmation across repeated lost responses and early webhooks', async () => {
  for (const settledViaWebhook of [false, true]) {
    const f = fixture()
    await f.service.checkout(owner, request(), 'https://holistic.example')
    f.setStatus('paid')
    if (settledViaWebhook) await f.service.handleVerifiedEvent(f.event())
    for (const id of ['66666666-6666-4666-8666-666666666666','77777777-7777-4777-8777-777777777777','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']) {
      const repeated = await f.service.checkout(owner, { ...request(), operationId: id }, 'https://holistic.example')
      assert.equal(repeated.order.id, orderId)
      assert.equal(repeated.repeatPurchaseRequired, true)
      assert.equal(repeated.redirectUrl, null)
      assert.equal(f.calls.filter(value => value === 'payment-session').length, 1)
    }
    f.setStatus('open')
    const explicit = await f.service.checkout(owner, { ...request(), operationId: '88888888-8888-4888-8888-888888888888', repeatOrderId: orderId }, 'https://holistic.example')
    assert.notEqual(explicit.order.id, orderId)
    assert.equal(f.calls.filter(value => value === 'payment-session').length, 2)
    f.setStatus('paid')
    const lostAgain = await f.service.checkout(owner, { ...request(), operationId: '99999999-9999-4999-8999-999999999999', repeatOrderId: orderId }, 'https://holistic.example')
    assert.equal(lostAgain.order.id, explicit.order.id)
    assert.equal(lostAgain.repeatPurchaseRequired, true)
    assert.equal(f.calls.filter(value => value === 'payment-session').length, 2)
  }
})

test('held orders cannot be duplicated using a forged repeat acknowledgment', async () => {
  for (const status of ['refunded','disputed','payment_review']) {
    const f = fixture(); await f.service.checkout(owner, request(), 'https://holistic.example')
    f.setStatus(status); await f.service.handleVerifiedEvent(f.event())
    const blocked = await f.service.checkout(owner, { ...request(), operationId: '66666666-6666-4666-8666-666666666666', repeatOrderId: orderId }, 'https://holistic.example')
    assert.equal(blocked.order.id, orderId); assert.equal(blocked.redirectUrl, null)
    assert.equal(blocked.repeatPurchaseRequired, false)
    assert.equal(f.calls.filter(value => value === 'payment-session').length, 1)
  }
})
