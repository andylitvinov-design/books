import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  PERSONAL_PAYPAL_ME_BASE, PERSONAL_PAYPAL_PAYEE,
  personalPayPalEnabled, buildPersonalPayPalServiceUrl,
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

test('EN/RU/ES service selectors retain fixed prices and route booking payment choices through the guarded cart', () => {
  const capture = file('components/consultation-choice-capture.tsx')
  const alchemy = file('components/alchemy-soul-lead-form.tsx')
  const main = file('app/[locale]/services/page.tsx')
  const spanish = file('app/es/services/page.tsx')
  const landing = file('components/alchemy-soul-landing.tsx')
  const cta = file('components/public-consultation-cta.tsx')
  const cartEntry = file('components/commerce/consultation-cart-entry.tsx')
  const cartPage = file('app/[locale]/cart/page.tsx')
  const cart = file('components/commerce/personal-cart.tsx')
  assert.match(capture, /isPaidRequest && paypalPersonalEnabled/)
  assert.match(capture, /\/api\/payments\/paypal\//)
  assert.match(alchemy, /selected !== "month" && \(wiseEnabled \|\| paypalPersonalEnabled \|\| Boolean\(zenInquiryUrl\)\)/)
  assert.match(alchemy, /\{paypalPersonalEnabled \? \(/)
  assert.match(alchemy, /"express-consultation-30" : "personal-session-60"/)
  assert.match(landing, /paypalPersonalEnabled=\{personalPayPalEnabled\(\)\}/)
  // #1167 deliberately moved service-booking payment selection into the cart.
  assert.match(cta, /if \(serviceBooking\) return <ConsultationCartEntry locale=\{locale\} id=\{id\} \/>/)
  assert.match(cartEntry, /publicServiceCatalog\(locale\)/)
  assert.match(cartEntry, /href=\{`\/\$\{locale\}\/cart/)
  assert.doesNotMatch(cartEntry, /paypal\.me|\/api\/payments\/paypal\//)
  assert.match(cartPage, /<PersonalCart locale=\{locale\} paypalEnabled=\{personalPayPalEnabled\(\)\}/)
  assert.match(cart, /const paypalUrl = paypalEnabled \? buildPersonalPayPalCartUrl\(chosen\.map\(product => product\.id\)\) : null/)
  assert.match(cart, /method === "paypal" && paypalUrl/)
  assert.match(cart, /href=\{paypalUrl\}[^>]*data-cart-paypal-personal/)
  assert.doesNotMatch(cart, /markAsPaid|paymentVerified:\s*true|orderStatus\s*=\s*"paid"|autoDebit/)
  assert.match(main, /paypalPersonalEnabled=\{personalPayPalEnabled\(\)\}/)
  assert.match(spanish, /paypalPersonalEnabled=\{personalPayPalEnabled\(\)\}/)
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
