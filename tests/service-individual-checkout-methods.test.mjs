import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { SERVICE_PRODUCTS } from '../lib/commerce/catalog.js'
import { configuredIndividualCardLinks, buildIndividualCardPaymentUrl, normalizeStripePaymentLink, buildIndividualCardLinkInquiry } from '../lib/commerce/card-payment-links.js'
import { buildInteracTransferInquiry } from '../lib/commerce/interac-transfer-inquiry.js'

const ids = SERVICE_PRODUCTS.map(item => item.id)
const approved = {
  HH_CARD_PAYMENT_LINKS_ENABLED: 'true',
  HH_CARD_PAYMENT_LINKS_PAYEE_VERIFIED: 'true',
  HH_CARD_PAYMENT_LINKS_PRICES_VERIFIED: 'true',
  HH_CARD_PAYMENT_LINK_50_EUR: 'https://buy.stripe.com/test_abcDEFGHIJK12',
  HH_CARD_PAYMENT_LINK_100_EUR: 'https://buy.stripe.com/abcDEFGHIJK1234',
  HH_CARD_PAYMENT_LINK_150_EUR: 'https://buy.stripe.com/abcDEFGHIJK12345',
}
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('individual card payments remain disabled without three merchant and price approvals', () => {
  assert.deepEqual(configuredIndividualCardLinks({}), {})
  for (const key of ['HH_CARD_PAYMENT_LINKS_ENABLED', 'HH_CARD_PAYMENT_LINKS_PAYEE_VERIFIED', 'HH_CARD_PAYMENT_LINKS_PRICES_VERIFIED']) {
    const env = { ...approved }
    delete env[key]
    assert.deepEqual(configuredIndividualCardLinks(env), {})
  }
})

test('only exact hosted Stripe links are accepted for catalog totals, never arbitrary price input', () => {
  const links = configuredIndividualCardLinks(approved)
  assert.ok(Object.isFrozen(links))
  assert.equal(buildIndividualCardPaymentUrl([ids[0]], links), approved.HH_CARD_PAYMENT_LINK_50_EUR)
  assert.equal(buildIndividualCardPaymentUrl([ids[1]], links), approved.HH_CARD_PAYMENT_LINK_100_EUR)
  assert.equal(buildIndividualCardPaymentUrl(ids, links), approved.HH_CARD_PAYMENT_LINK_150_EUR)
  for (const invalid of [[], ['fake'], [ids[0], ids[0]], [...ids, 'fake'], null, [{ id: ids[0], amountMinor: 1 }]]) {
    assert.equal(buildIndividualCardPaymentUrl(invalid, links), null)
  }
  for (const invalid of [
    'http://buy.stripe.com/abcDEFGHIJK1234',
    'https://buy.stripe.com.evil.test/abcDEFGHIJK1234',
    'https://evil.test@buy.stripe.com/abcDEFGHIJK1234',
    'https://buy.stripe.com/abcDEFGHIJK1234?client=1',
    'https://buy.stripe.com/abcDEFGHIJK1234#paid',
    'https://buy.stripe.com/../../fake',
    'https://checkout.stripe.com/abcDEFGHIJK1234',
  ]) assert.equal(normalizeStripePaymentLink(invalid), null)
  assert.deepEqual(configuredIndividualCardLinks({
    ...approved,
    HH_CARD_PAYMENT_LINK_100_EUR: approved.HH_CARD_PAYMENT_LINK_50_EUR,
  }), {})
})

test('card request is a safe fixed catalog inquiry and never collects card details', () => {
  const url = buildIndividualCardLinkInquiry(ids, 'ru')
  const text = new URL(url).searchParams.get('text')
  assert.match(text, /€150\.00/)
  assert.match(text, /карт/)
  assert.equal(buildIndividualCardLinkInquiry(['fake']), null)
})

test('Interac is a manual CAD quote for fixed EUR catalog items, not a paid status', () => {
  for (const lang of ['en', 'ru', 'es']) {
    const url = buildInteracTransferInquiry(ids, lang)
    assert.ok(url.startsWith('https://wa.me/'))
    const text = new URL(url).searchParams.get('text')
    assert.match(text, /€150\.00/)
    assert.match(text, /CAD/)
    assert.match(text, /Interac/)
  }
  assert.equal(buildInteracTransferInquiry(['fake'], 'en'), null)
  assert.equal(buildInteracTransferInquiry([ids[0], ids[0]], 'en'), null)
})

test('public cart exposes card and Interac without pretending a completed payment', () => {
  const page = read('app/[locale]/cart/page.tsx')
  const cart = read('components/commerce/personal-cart.tsx')
  const payments = read('app/[locale]/payments/page.tsx')
  assert.match(page, /configuredIndividualCardLinks/)
  assert.match(cart, /buildIndividualCardPaymentUrl/)
  assert.match(cart, /buildInteracTransferInquiry/)
  assert.match(cart, /data-cart-card-payment-link/)
  assert.match(cart, /data-cart-card-link-inquiry/)
  assert.match(cart, /data-interac-transfer-inquiry="cart"/)
  assert.match(cart, /no subscription|sin suscripción|без подписки/)
  assert.match(payments, /data-other-payment-methods/)
  assert.doesNotMatch(cart, /orderStatus\s*=\s*["']paid|autoCapture|setPaid\(/)
})
