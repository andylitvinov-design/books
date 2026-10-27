import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  PERSONAL_PAYPAL_ME_BASE, PERSONAL_PAYPAL_PAYEE,
  personalPayPalEnabled, buildPersonalPayPalServiceUrl, buildPersonalPayPalCartUrl,
} from '../lib/commerce/paypal-personal.js'

const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('personal PayPal.Me link is the independently checked owner payee, no Business credentials', () => {
  assert.equal(PERSONAL_PAYPAL_ME_BASE, 'https://paypal.me/psitrends')
  assert.equal(PERSONAL_PAYPAL_PAYEE, 'Andrii Litvinov')
  assert.equal(personalPayPalEnabled({}), true)
  assert.equal(personalPayPalEnabled({ HH_PAYPAL_PERSONAL_DISABLED: 'true' }), false)
  assert.equal(personalPayPalEnabled({ HH_PAYPAL_PERSONAL_DISABLED: 'false' }), true)
})

test('server-only product catalog fixes EUR amounts and disallows arbitrary products/amounts', () => {
  assert.equal(buildPersonalPayPalServiceUrl('express-consultation-30', {}), 'https://paypal.me/psitrends/50EUR')
  assert.equal(buildPersonalPayPalServiceUrl('personal-session-60', {}), 'https://paypal.me/psitrends/100EUR')
  for (const bad of ['0', '../50EUR', 'personal-session-60?amount=1', 'plus', 'free', 'from', '__proto__', null, 20])
    assert.equal(buildPersonalPayPalServiceUrl(bad, {}), null)
  assert.equal(buildPersonalPayPalServiceUrl('personal-session-60', { HH_PAYPAL_PERSONAL_DISABLED: 'true' }), null)
})

test('redirect always goes to owner-controlled PayPal.Me with no browser prices, client data or false paid status', () => {
  const route = file('app/api/payments/paypal/[productId]/route.ts')
  assert.match(route, /buildPersonalPayPalServiceUrl\(productId\)/)
  assert.match(route, /personalPayPalEnabled\(\)/)
  assert.match(route, /status: 303/)
  assert.match(route, /Cache-Control/)
  assert.match(route, /Referrer-Policy/)
  assert.doesNotMatch(route, /request\.json|searchParams|markAsPaid|payment_verified|grantEntitlement|PAYPAL_CLIENT_SECRET/)
})

test('Alchemy booking hides personal PayPal links until the confirmed session enters the existing cart', () => {
  const capture = file('components/consultation-choice-capture.tsx')
  const alchemy = file('components/alchemy-soul-lead-form.tsx')
  const landing = file('components/alchemy-soul-landing.tsx')
  const chooser = file('components/contact-channel-chooser.tsx')
  const cart = file('app/[locale]/cart/page.tsx')
  assert.match(capture, /isPaidRequest && paypalPersonalEnabled/)
  assert.match(capture, /\/api\/payments\/paypal\//)
  assert.match(alchemy, /bookingSku=\{selected === "30"/)
  assert.doesNotMatch(alchemy, /data-alchemy-payment-disclosure|\/api\/payments\/paypal/)
  assert.match(landing, /bookingSku="personal-session-60"/)
  assert.match(chooser, /paidReady && paymentExpanded/)
  assert.match(chooser, /data-booking-cart-link/)
  assert.match(cart, /<PersonalCart/)
})


test('existing consultation cart keeps its fixed catalog boundary and personal PayPal kill switch', () => {
  const cta = file('components/public-consultation-cta.tsx')
  const entry = file('components/commerce/consultation-cart-entry.tsx')
  const cartPage = file('app/[locale]/cart/page.tsx')
  const cart = file('components/commerce/personal-cart.tsx')
  assert.match(cta, /if \(serviceBooking\) return <ConsultationCartEntry locale=\{locale\} id=\{id\}/)
  assert.match(entry, /publicServiceCatalog\(locale\)/)
  assert.match(entry, /onClick=\{\(\) => toggle\(product\.id\)\}/)
  assert.match(entry, /Adding to cart does not charge or reserve a time/)
  assert.doesNotMatch(entry, /paypal\.me|\/api\/payments\/|fetch\(/)
  assert.match(cartPage, /paypalEnabled=\{personalPayPalEnabled\(\)\}/)
  assert.match(cart, /const paypalUrl = paypalEnabled \? buildPersonalPayPalCartUrl\(chosen\.map\(product => product\.id\)\) : null/)
  assert.match(cart, /\{paypalUrl \? <a[^>]+href=\{paypalUrl\}[^>]+data-cart-paypal-personal/)
})

test('cart personal PayPal totals stay fixed and disabled or malformed selections cannot pay', () => {
  const products = ['express-consultation-30', 'personal-session-60']
  assert.equal(buildPersonalPayPalCartUrl(products, {}), 'https://paypal.me/psitrends/150EUR')
  assert.equal(buildPersonalPayPalCartUrl(products, { HH_PAYPAL_PERSONAL_DISABLED: 'true' }), null)
  for (const products of [[], ['free'], ['personal-session-60', 'personal-session-60'],
    [{ id: 'express-consultation-30', amountMinor: 1 }]])
    assert.equal(buildPersonalPayPalCartUrl(products, {}), null)
})

test('payment page transparently requires Goods & Services and manual verification', () => {
  const page = file('app/[locale]/payments/page.tsx')
  for (const phrase of ['Goods & Services', 'Товары и услуги', 'Productos y servicios', 'PERSONAL_PAYPAL_PAYEE'])
    assert.match(page, new RegExp(phrase))
  assert.match(page, /data-paypal-manual-confirmation/)
  assert.match(page, /data-paypal-personal-link/)
  assert.match(page, /Transaction ID|ID транзакции|ID de transacción/)
  assert.match(page, /paypal-personal/)
  assert.doesNotMatch(page, /markAsPaid|paid: true|paymentVerified: true|granted: true/)
})
