import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { buildZenTransferInquiry } from '../lib/commerce/zen-transfer-inquiry.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const decoded = url => new URL(url).searchParams.get('text')

test('ZEN enquiry uses existing fixed-price server catalog and WhatsApp recipient', () => {
  const single = buildZenTransferInquiry(['express-consultation-30'], 'en')
  const combined = buildZenTransferInquiry(['express-consultation-30', 'personal-session-60'], 'en')
  assert.ok(single)
  assert.ok(combined)
  assert.equal(new URL(single).origin, 'https://wa.me')
  assert.equal(new URL(single).pathname, '/14376066502')
  assert.match(decoded(single), /€50\.00/)
  assert.match(decoded(combined), /€150\.00/)
  assert.match(decoded(combined), /60 min/)
  assert.match(decoded(combined), /30 min/)
  assert.match(decoded(single), /have not paid yet/i)
  assert.match(decoded(single), /confirm a convenient appointment time/i)
  assert.doesNotMatch(decoded(single), /bank account number:|password|CVV|payment successful/i)
})

test('ZEN enquiry has EN RU ES messages and explicitly says no payment has occurred', () => {
  const en = decoded(buildZenTransferInquiry(['personal-session-60'], 'en'))
  const ru = decoded(buildZenTransferInquiry(['personal-session-60'], 'ru'))
  const es = decoded(buildZenTransferInquiry(['personal-session-60'], 'es'))
  for (const message of [en, ru, es]) {
    assert.match(message, /€100\.00/)
    assert.match(message, /ZEN\.COM/)
    assert.ok(message.length < 800)
  }
  assert.match(en, /not paid yet/i)
  assert.match(ru, /Оплата ещё не отправлена/)
  assert.match(es, /Todavía no he pagado/)
  assert.notEqual(ru, en)
  assert.notEqual(es, en)
})

test('ZEN manual enquiry never accepts user-defined price, unknown service, or duplicate product', () => {
  for (const ids of [[], ['fake'], ['free'], ['personal-session-60?price=1'],
    ['express-consultation-30', 'express-consultation-30'], ['personal-session-60', 'unknown'],
    [null], [5], 'personal-session-60']) {
    assert.equal(buildZenTransferInquiry(ids), null, JSON.stringify(ids))
  }
})

test('ZEN is only an enquiry alongside existing PayPal; no API charge or receipt changes', () => {
  const paymentPage = read('app/[locale]/payments/page.tsx')
  const cart = read('components/commerce/service-cart.tsx')
  const library = read('lib/commerce/zen-transfer-inquiry.js')
  assert.match(paymentPage, /buildZenTransferInquiry\(\[product\.id\], locale\)/)
  assert.match(paymentPage, /data-zen-transfer-inquiry/)
  assert.match(cart, /buildZenTransferInquiry\(chosen\.map/)
  assert.match(cart, /data-zen-transfer-inquiry/)
  assert.match(read('components/consultation-choice-capture.tsx'), /data-zen-manual-request/)
  assert.match(read('components/alchemy-soul-lead-form.tsx'), /data-zen-manual-request/)
  assert.match(read('components/commerce/personal-cart.tsx'), /data-zen-transfer-inquiry="cart"/)
  assert.match(paymentPage, /data-paypal-personal-link/)
  assert.match(cart, /serviceCommerceRuntime|\/api\/app\/commerce\/checkout/)
  assert.doesNotMatch(library, /fetch\(|post\(|update |deposit|markPaid|paymentIntent|ZEN_TERMINAL|secret|redirectUrl|acceptFunds/i)
  assert.match(paymentPage, /No payment is collected here/i)
})

test('no card top-up or unverified ZEN payee link is exposed', () => {
  const page = read('app/[locale]/payments/page.tsx')
  const cart = read('components/commerce/service-cart.tsx')
  const helper = read('lib/commerce/zen-transfer-inquiry.js')
  assert.doesNotMatch(helper, /secure\.zen\.com|go\.zen\.com|cardNumber|IBAN|accountNumber/)
  assert.doesNotMatch(page, /HH_ZEN_PAYWALL_SECRET|HH_ZEN_IPN_SECRET/)
  assert.doesNotMatch(cart, /HH_ZEN_PAYWALL_SECRET|HH_ZEN_IPN_SECRET/)
})
