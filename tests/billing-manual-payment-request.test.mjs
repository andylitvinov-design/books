import test from 'node:test'
import assert from 'node:assert/strict'
import { buildManualPaymentRequest, MANUAL_PAYMENT_CONTACT_URL, MANUAL_PAYMENT_METHODS } from '../lib/billing/manual-payment-request.js'
import { readFileSync } from 'node:fs'

test('Ezohata-inspired currency selection is an inquiry, not a paid entitlement', () => {
  assert.deepEqual(MANUAL_PAYMENT_METHODS.map(item => item.currency), ['EUR', 'USD', 'CAD', 'UAH'])
  assert.deepEqual(MANUAL_PAYMENT_METHODS.map(item => item.id), ['paypal-eur', 'paypal-usd', 'interac-cad', 'privatbank-uah'])
  assert.equal(MANUAL_PAYMENT_CONTACT_URL, 'https://t.me/AndyTherapist')
  for (const planId of ['advanced', 'premium']) {
    for (const item of MANUAL_PAYMENT_METHODS) {
      const message = buildManualPaymentRequest({ planId, methodId: item.id })
      assert.ok(message.includes(item.en))
      assert.match(message, /manual request for one month, not automatic renewal/)
      assert.match(message, /actual payment verification/)
      assert.doesNotMatch(message, /account_id|clientId|payment confirmed/i)
    }
  }
})

test('first-month half-price is only conditional Advanced, never recurring €10 nor Premium discount', () => {
  const a = buildManualPaymentRequest({ planId: 'advanced', methodId: 'paypal-eur' })
  const p = buildManualPaymentRequest({ planId: 'premium', methodId: 'paypal-eur' })
  assert.match(a, /€20\/month/)
  assert.match(a, /€10 \(50% off\)/)
  assert.match(a, /subject to confirmation/)
  assert.match(p, /€100\/month/)
  assert.doesNotMatch(p, /€10(?!\d)|50% off/)
})

test('RU requests and invalid choices stay bounded; no payment is ever performed', () => {
  const msg = buildManualPaymentRequest({ planId: 'advanced', methodId: 'interac-cad', locale: 'ru' })
  assert.match(msg, /€20\/мес/)
  assert.match(msg, /€10/)
  assert.match(msg, /не автосписание/)
  for (const planId of ['free', 'start', 'plus', '', null]) assert.equal(buildManualPaymentRequest({ planId, methodId: 'paypal-eur' }), null)
  for (const methodId of ['', 'stripe', 'fake-link', null]) assert.equal(buildManualPaymentRequest({ planId: 'advanced', methodId }), null)
  const component = readFileSync(new URL('../components/app/manual-billing-request.jsx', import.meta.url), 'utf8')
  assert.match(component, /navigator\.clipboard\.writeText\(message\)/)
  assert.match(component, /data-manual-billing-request/)
  assert.match(component, /\.contact/)
  assert.match(component, /\/api\/app\/manual-billing\/orders/)
  assert.match(component, /'X-HH-Account-ID':accountId/)
  assert.doesNotMatch(component, /paymentIntent|grantAccess|setEntitlement|checkout\.sessions/)
})
