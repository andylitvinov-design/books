import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { SERVICE_PRODUCTS, publicServiceCatalog, formatServiceAmount } from '../lib/commerce/catalog.js'
import { restoreServiceCart, validateServiceCheckout } from '../lib/commerce/cart.js'
import { serviceCheckoutStatus } from '../lib/commerce/checkout.js'

const operationId = '0a1b2c3d-1111-4111-8111-000000000001'
const request = (items = [{ serviceId: 'express-consultation-30', quantity: 1 }]) => ({ operationId, locale: 'ru', items })
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Russian free drawing offer remains a review rather than a diagnostic claim', () => {
  const source = read('components/commerce/service-cart.tsx')
  assert.match(source, /Бесплатный разбор рисунка \+ отчёт/)
  assert.doesNotMatch(source, /Бесплатная диагностика по рисунку/)
  assert.match(source, /services\/free-situation-review/)
})

test('catalog keeps existing published €50/30 min and €100/60 min rates', () => {
  assert.deepEqual(SERVICE_PRODUCTS.map((entry) => [entry.amountMinor, entry.currency, entry.durationMinutes]), [[5000, 'EUR', 30], [10000, 'EUR', 60]])
  assert.ok(SERVICE_PRODUCTS.every((entry) => entry.kind === 'one_time'))
  assert.ok(Object.isFrozen(SERVICE_PRODUCTS))
  const existing = read('components/consultation-choice-capture.tsx')
  assert.match(existing, /30-minute express consultation · €50/)
  assert.match(existing, /60-minute personal session · €100/)
})

test('all three languages carry the same product identifiers and prices', () => {
  for (const locale of ['ru', 'en', 'es']) {
    const catalog = publicServiceCatalog(locale)
    assert.deepEqual(catalog.map(({ id, amountMinor, currency }) => ({ id, amountMinor, currency })), SERVICE_PRODUCTS.map(({ id, amountMinor, currency }) => ({ id, amountMinor, currency })))
    assert.ok(catalog.every((entry) => entry.title && entry.description))
    assert.match(formatServiceAmount(15000, locale), /150/)
    assert.match(formatServiceAmount(15000, locale), /€/)
  }
})

test('the server totals only its own canonical one-time product prices', () => {
  const result = validateServiceCheckout(request(SERVICE_PRODUCTS.map(({ id }) => ({ serviceId: id, quantity: 1 }))))
  assert.equal(result.totalMinor, 15000)
  assert.equal(result.currency, 'EUR')
  assert.equal(result.operationId, operationId)
  assert.equal(result.items.length, 2)
})

test('client prices, provider IDs, discounts, recurrence and URLs cannot enter checkout', () => {
  for (const key of ['amount', 'price', 'priceId', 'currency', 'coupon', 'discount', 'mode', 'successUrl', 'accountId']) {
    assert.throws(() => validateServiceCheckout({ ...request(), [key]: key === 'amount' ? 1 : 'attacker' }), /UNKNOWN_FIELD/)
    assert.throws(() => validateServiceCheckout(request([{ serviceId: 'express-consultation-30', quantity: 1, [key]: 'attacker' }])), /UNKNOWN_FIELD/)
  }
})

test('unknown, free, recurring, contact and from-price products cannot be charged', () => {
  for (const serviceId of ['plus', 'free-wu-xing-diagnostic', 'dao', 'contact', 'from', 'hypnotherapy-course', 'price_test', '', null, 7])
    assert.throws(() => validateServiceCheckout(request([{ serviceId, quantity: 1 }])), /SERVICE_NOT_AVAILABLE/)
})

test('duplicate and malformed carts never multiply charges', () => {
  const line = { serviceId: 'express-consultation-30', quantity: 1 }
  for (const items of [[], null, {}, [line, line], [line, line, line], [null]])
    assert.throws(() => validateServiceCheckout(request(items)))
  for (const quantity of [0, -1, 2, 0.5, '1', null, Infinity])
    assert.throws(() => validateServiceCheckout(request([{ ...line, quantity }])), /INVALID_CART/)
})

test('operation IDs and supported locales are mandatory', () => {
  assert.throws(() => validateServiceCheckout({ ...request(), operationId: '' }), /INVALID_ID/)
  assert.throws(() => validateServiceCheckout({ ...request(), locale: 'fr' }), /INVALID_LOCALE/)
  assert.throws(() => validateServiceCheckout({ items: request().items }), /INVALID_ID/)
})

test('session storage restores only distinct known service IDs, never a stored amount', () => {
  assert.deepEqual(restoreServiceCart('["personal-session-60","express-consultation-30","personal-session-60","plus"]'), ['express-consultation-30', 'personal-session-60'])
  for (const value of [null, 'bad json', '{}', '{"price":1}', '[{"id":"personal-session-60","amountMinor":1}]'])
    assert.deepEqual(restoreServiceCart(value), [])
})

test('checkout stays unavailable until explicit service configuration is approved', () => {
  assert.deepEqual(serviceCheckoutStatus({enabled:false}), { available: false, reason: 'SERVICE_CHECKOUT_UNAVAILABLE' })
  assert.deepEqual(serviceCheckoutStatus({enabled:true}), { available: true, reason: null })
})

test('checkout route enforces verified session, same origin, bounded body and private errors', () => {
  const route = read('app/api/app/commerce/checkout/route.js')
  for (const expression of [/requireSameOrigin\(request, config\)/, /auth\.verified\(\)/, /readBody\(request, 4096\)/, /PRIVATE_HEADERS/, /safeError/]) assert.match(route, expression)
  assert.doesNotMatch(route, /export (?:async )?function GET|request\.json\(\)/)
})

test('oversized cart is absent from public Services in all languages; payment logic remains isolated', () => {
  const services = read('app/[locale]/services/page.tsx')
  const spanish = read('app/es/services/page.tsx')
  assert.doesNotMatch(services, /ServiceCart|service-cart/)
  assert.doesNotMatch(spanish, /ServiceCart|service-cart/)
  assert.match(services, /<ServicesConversionHero/)
  assert.match(services, /<ServicesStudioOffers/)
  assert.match(services, /<ServicesIntroMedia/)
  assert.match(services, /<PublicConsultationCta[\s\S]*serviceBooking/)
  assert.match(spanish, /<PublicConsultationCta/)
  assert.match(read('app/[locale]/services/page.tsx'), /<ServicesStudioOffers/)
  assert.match(read('app/[locale]/services/page.tsx'), /<ServicesIntroMedia/)
  const component = read('components/commerce/service-cart.tsx')
  assert.match(component, /services\/free-situation-review/)
  assert.match(component, /locale !== "es"[\s\S]*services\/dao-health-profile/)
  assert.match(component, /className=\{styles\.pay\} disabled=\{!available \|\| pending \|\| Boolean\(repeatOrderId\)\}/)
  assert.match(component, /aria-live="polite"/)
  assert.match(component, /aria-label=\{`\$\{t.remove\}: \$\{product.title\}`\}/)
  assert.doesNotMatch(component, /localStorage|amountMinor: product\.amountMinor/)
  assert.match(read('components/commerce/service-cart.module.css'), /:focus-visible/)
  assert.match(read('components/commerce/service-cart.module.css'), /@media\(max-width:600px\)/)
})
