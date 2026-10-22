import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { getCommerceConfig } from '../lib/commerce/config.js'

if (!process.execArgv.includes('--conditions=react-server')) {
  test('PayPal checkout security tests (isolated fake PayPal gateway)', () => {
    const result = spawnSync(process.execPath, ['--conditions=react-server', '--test', fileURLToPath(import.meta.url)], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stdout + result.stderr)
  })
} else {
  const { createPayPalCommerceProvider, paypalCheckoutUrl } = await import('../lib/commerce/paypal-provider.js')
  const buyer = 'hhc_' + 'a'.repeat(32)
  const id = '33333333-3333-4333-8333-333333333333'
  const config = { configured: true, enabled: true, provider: 'paypal', environment: 'sandbox',
    merchantId: 'MERCHANT1234', clientId: 'sandbox_app_client_id', clientSecret: 'sandbox_secret_value', webhookId: 'WH-0123456789' }
  const order = { id, customerId: buyer, providerCheckoutId: '5O190127TN364715T',
    locale: 'en', currency: 'EUR', totalMinor: 5000,
    items: [{ serviceId: 'express-consultation-30', quantity: 1, currency: 'EUR', amountMinor: 5000 }],
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString() }
  const link = 'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T'
  const captureId = '1FE123456789'
  function fixture() {
    const requests = []
    const state = { approved: false, captured: false, total: '50.00', merchant: config.merchantId, verify: true, refunded: 0 }
    function remote() {
      return { id: order.providerCheckoutId, intent: 'CAPTURE', status: state.captured ? 'COMPLETED' : state.approved ? 'APPROVED' : 'CREATED',
        links: [{ rel: 'payer-action', href: link }],
        purchase_units: [{
          payee: { merchant_id: state.merchant }, reference_id: order.id,
          custom_id: buyer + ':' + order.id, invoice_id: 'HH-' + order.id,
          amount: { currency_code: 'EUR', value: state.total,
            breakdown: { item_total: { currency_code: 'EUR', value: state.total } } },
          items: [{ sku: 'express-consultation-30', unit_amount: { currency_code: 'EUR', value: state.total },
            quantity: '1' }],
          ...(state.captured ? { payments: { captures: [{ id: captureId }] } } : {}),
        }],
      }
    }
    const response = (data, ok = true) => ({
      ok, json: async () => data, text: async () => JSON.stringify(data),
    })
    async function fetcher(url, options) {
      requests.push({ url, options })
      const path = new URL(url).pathname
      if (path === '/v1/oauth2/token') return response({ token_type: 'Bearer', access_token: 'fake_token' })
      if (path === '/v2/checkout/orders' && options.method === 'POST') return response({
        id: order.providerCheckoutId, links: [{ rel: 'payer-action', href: link }],
      })
      if (path === '/v2/checkout/orders/' + order.providerCheckoutId && options.method === 'GET') return response(remote())
      if (path === '/v2/checkout/orders/' + order.providerCheckoutId + '/capture' && options.method === 'POST') {
        state.captured = true
        return response({ status: 'COMPLETED' })
      }
      if (path === '/v2/payments/captures/' + captureId && options.method === 'GET') return response({
        id: captureId, status: state.refunded === 5000 ? 'REFUNDED' : state.refunded > 0 ? 'PARTIALLY_REFUNDED' : 'COMPLETED',
        payee: { merchant_id: state.merchant }, amount: { currency_code: 'EUR', value: state.total },
        supplementary_data: { related_ids: { order_id: order.providerCheckoutId } },
        seller_receivable_breakdown: state.refunded ? { refunded_amount: { currency_code: 'EUR', value: (state.refunded / 100).toFixed(2) } } : {},
      })
      if (path === '/v1/notifications/verify-webhook-signature' && options.method === 'POST') return response({
        verification_status: state.verify ? 'SUCCESS' : 'FAILURE',
      })
      throw Error('Unexpected PayPal request ' + options.method + ' ' + path)
    }
    return { state, requests, provider: createPayPalCommerceProvider(config, { fetcher }) }
  }
  test('merchant, URL and return destinations are fixed, totals are server-derived', async () => {
    const f = fixture()
    const { providerCheckoutId, url } = await f.provider.checkout({ order, origin: 'https://holistichouse.vercel.app' })
    assert.equal(providerCheckoutId, order.providerCheckoutId)
    assert.equal(url, link)
    const sent = JSON.parse(f.requests.find(call => call.url.endsWith('/v2/checkout/orders') && call.options.method === 'POST').options.body)
    assert.deepEqual(sent.purchase_units[0].amount, { currency_code: 'EUR', value: '50.00',
      breakdown: { item_total: { currency_code: 'EUR', value: '50.00' } } })
    assert.equal(sent.purchase_units[0].custom_id, buyer + ':' + id)
    assert.equal(sent.purchase_units[0].items[0].sku, 'express-consultation-30')
    assert.match(sent.payment_source.paypal.experience_context.return_url, /\/en\/services\/checkout\?serviceOrder=/)
    assert.deepEqual(f.requests.filter(call => call.url.endsWith('/v2/checkout/orders')).map(call => call.options.headers['PayPal-Request-Id']), ['hh-create-' + id])
  })
  test('capture is forbidden before PayPal approval, then checked against merchant and exact amount', async () => {
    const f = fixture()
    await assert.rejects(f.provider.capture(order), /SERVICE_PAYMENT_NOT_APPROVED/)
    f.state.approved = true
    const capture = await f.provider.capture(order)
    assert.equal(capture.status, 'paid')
    assert.equal(capture.paymentIntentId, captureId)
    assert.deepEqual(f.requests.filter(call => call.url.endsWith('/capture')).map(call => call.options.headers['PayPal-Request-Id']), ['hh-capture-' + id])
    assert.equal((await f.provider.capture(order)).status, 'paid')
  })
  test('verified amount and payee mismatch must never grant paid status', async () => {
    for (const patch of [{ total: '1.00' }, { merchant: 'ANOTHERPAYEE' }]) {
      const f = fixture()
      Object.assign(f.state, { approved: true }, patch)
      await assert.rejects(f.provider.capture(order), /SERVICE_PROVIDER_MISMATCH/)
      assert.equal(f.state.captured, false)
    }
  })
  test('refunds are financial holds and cannot count as paid consultations', async () => {
    const f = fixture()
    f.state.approved = true
    await f.provider.capture(order)
    f.state.refunded = 2500
    assert.equal((await f.provider.reconcile(order)).status, 'payment_review')
    f.state.refunded = 5000
    assert.equal((await f.provider.reconcile(order)).status, 'refunded')
  })
  test('approved host only, not lookalike PayPal phishing redirect', () => {
    assert.equal(paypalCheckoutUrl(link, config), link)
    for (const url of ['https://www.paypal.com/checkoutnow?token=X', 'https://www.sandbox.paypal.com.evil.example/checkoutnow',
      'https://evil.example/checkoutnow', 'http://www.sandbox.paypal.com/checkoutnow',
      'https://www.sandbox.paypal.com@evil.example/checkoutnow', 'https://www.sandbox.paypal.com.evil/'])
      assert.throws(() => paypalCheckoutUrl(url, config), /SERVICE_PROVIDER_MISMATCH/)
  })
  test('webhook must be signature verified, then matched to opaque account mapping', async () => {
    const f = fixture()
    const event = { id: 'WH-12345-TEST', event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: { id: order.providerCheckoutId } }
    const headers = new Headers({
      'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api-m.sandbox.paypal.com/cert',
      'paypal-transmission-id': 'synthetic-id', 'paypal-transmission-sig': 'synthetic-signature',
      'paypal-transmission-time': new Date().toISOString(),
    })
    assert.equal((await f.provider.verifyWebhook(Buffer.from(JSON.stringify(event)), headers)).type, 'CHECKOUT.ORDER.APPROVED')
    const reference = await f.provider.eventReference({ ...event, type: event.event_type })
    assert.deepEqual(reference, { customerId: buyer, checkoutId: order.providerCheckoutId, orderId: order.id })
    f.state.verify = false
    await assert.rejects(f.provider.verifyWebhook(Buffer.from(JSON.stringify(event)), headers), /PAYPAL_WEBHOOK_INVALID/)
  })
  test('status defaults to disabled and production requires all approvals and secrets', () => {
    assert.equal(getCommerceConfig({ HH_COMMERCE_PROVIDER: 'paypal' }).enabled, false)
    const live = { HH_COMMERCE_PROVIDER: 'paypal', HH_PAYPAL_ENVIRONMENT: 'live',
      HH_PAYPAL_CLIENT_ID: config.clientId, HH_PAYPAL_CLIENT_SECRET: config.clientSecret,
      HH_PAYPAL_MERCHANT_ID: config.merchantId, HH_PAYPAL_WEBHOOK_ID: config.webhookId,
      HH_BILLING_SCHEMA_APPROVED: 'true', HH_COMMERCE_SCHEMA_APPROVED: 'true',
      HH_COMMERCE_ENABLED: 'true', HH_COMMERCE_FULFILLMENT_APPROVED: 'true',
      HH_COMMERCE_TAX_REVIEW_APPROVED: 'true', VERCEL_ENV: 'production',
      HH_COMMERCE_PRODUCTION_APPROVED: 'true', HH_PAYPAL_PRODUCTION_APPROVED: 'true' }
    assert.equal(getCommerceConfig(live).enabled, false)
    assert.equal(getCommerceConfig({ ...live, HH_PAYPAL_TAX_REVIEW_APPROVED: 'true' }).enabled, true)
  })
  test('route and UI keep auth, private headers and PayPal-return checks', () => {
    const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
    const capture = read('app/api/app/commerce/orders/[orderId]/capture/route.js')
    assert.match(capture, /auth\.verified\(\)/)
    assert.match(capture, /requireSameOrigin/)
    assert.match(capture, /requireCommerceAccount/)
    const webhook = read('app/api/billing/paypal/webhook/route.js')
    assert.match(webhook, /verifyWebhook/)
    assert.match(webhook, /SERVICE_PAYMENT_RECONCILIATION_REQUIRED/)
    const cart = read('components/commerce/service-cart.tsx')
    assert.match(cart, /paymentProvider === "paypal"/)
    assert.match(cart, /verifyCommerceIdentity/)
    assert.match(cart, /fetch\(route \+ "\/capture"/)
  })
}
