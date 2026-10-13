import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PLUS_PLAN, normalizeBillingStatus, canShowHousePromotion, canStartCheckout, lessonCompletionKey, lessonOfferReducer, EMPTY_LESSON_OFFERS, safeBillingRedirect } from '../lib/billing/public-plan.js'
import { SUBSCRIPTION_COPY } from '../components/app/subscription-copy.js'

const freeStatus = (overrides = {}) => normalizeBillingStatus({
  available: true, enabled: true, plan: PLUS_PLAN,
  entitlement: { active: false, adFree: false, paidThrough: null },
  subscription: null, provider: 'stripe', ...overrides,
})
const key = day => lessonCompletionKey({ cycleId: 'synthetic-cycle', day, lessonId: 'synthetic-lesson-' + day })
const component = await readFile(new URL('../components/app/subscription-access.jsx', import.meta.url), 'utf8')
const daily = await readFile(new URL('../components/app/course-today.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../components/app/subscription-access.module.css', import.meta.url), 'utf8')

test('public plan is exactly 10 USD monthly; unknown or drifted prices cannot enable checkout', () => {
  assert.deepEqual(PLUS_PLAN, { key: 'plus', amount: 1000, currency: 'usd', interval: 'month' })
  assert.equal(canStartCheckout(freeStatus()), true)
  for (const plan of [null, { ...PLUS_PLAN, amount: 999 }, { ...PLUS_PLAN, currency: 'rub' }, { ...PLUS_PLAN, interval: 'year' }]) {
    const status = freeStatus({ plan })
    assert.equal(status.available, false)
    assert.equal(canStartCheckout(status), false)
  }
})

test('unknown/loading/error entitlements suppress every promotion', () => {
  assert.equal(canShowHousePromotion(null), false)
  for (const phase of ['loading', 'unavailable', 'error']) {
    assert.equal(canShowHousePromotion(freeStatus(), phase), false)
    assert.equal(canStartCheckout(freeStatus(), phase), false)
  }
  assert.throws(() => normalizeBillingStatus({ available: true, enabled: true }), /INVALID_BILLING_STATUS/)
})

test('paid entitlement and ad-free entitlement suppress offers, even if checkout is disabled', () => {
  for (const entitlement of [
    { active: true, adFree: true, paidThrough: '2026-11-13T12:00:00Z' },
    { active: true, adFree: false, paidThrough: null },
    { active: false, adFree: true, paidThrough: null },
  ]) {
    const status = freeStatus({ entitlement, available: false })
    assert.equal(canShowHousePromotion(status), false)
    assert.equal(canStartCheckout(status), false)
  }
})

test('unavailable configuration is truthful and does not enable payment', () => {
  for (const override of [{ available: false }, { enabled: false }, { provider: null }])
    assert.equal(canStartCheckout(freeStatus(override)), false)
  assert.equal(freeStatus({ sandbox: true }).sandbox, true)
  assert.equal(freeStatus().sandbox, false)
})

test('existing subscriptions needing attention cannot create a second checkout', () => {
  for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete'])
    assert.equal(canStartCheckout(freeStatus({ subscription: { status, cancelAtPeriodEnd: false, periodEnd: null } })), false)
  assert.equal(canStartCheckout(freeStatus({ subscription: { status: 'canceled' } })), true)
})

test('dismissal affects one completion; each next saved lesson can show a fresh offer', () => {
  let state = EMPTY_LESSON_OFFERS
  for (let day = 1; day <= 14; day++) {
    state = lessonOfferReducer(state, { type: 'saved', key: key(day) })
    assert.deepEqual(state.pending, [key(day)])
    state = lessonOfferReducer(state, { type: 'dismiss', key: key(day) })
    assert.deepEqual(state.pending, [])
    const same = lessonOfferReducer(state, { type: 'saved', key: key(day) })
    assert.equal(same, state, 'same completion never reopens the offer')
  }
  assert.equal(state.seen.length, 14)
})

test('rapid sequential completions queue independently and preserve the next offer', () => {
  let state = lessonOfferReducer(EMPTY_LESSON_OFFERS, { type: 'saved', key: key(1) })
  state = lessonOfferReducer(state, { type: 'saved', key: key(2) })
  assert.deepEqual(state.pending, [key(1), key(2)])
  state = lessonOfferReducer(state, { type: 'dismiss', key: key(1) })
  assert.deepEqual(state.pending, [key(2)])
})

test('subscribers are suppressed and past suppressed completions never resurface', () => {
  let state = lessonOfferReducer(EMPTY_LESSON_OFFERS, { type: 'saved', key: key(1), suppressed: true })
  assert.deepEqual(state.pending, [])
  assert.equal(lessonOfferReducer(state, { type: 'saved', key: key(1) }), state)
  state = lessonOfferReducer(state, { type: 'saved', key: key(2) })
  state = lessonOfferReducer(state, { type: 'suppress' })
  assert.deepEqual(state.pending, [])
  assert.equal(lessonOfferReducer(state, { type: 'saved', key: key(2) }), state)
  assert.deepEqual(lessonOfferReducer(state, { type: 'reset' }), { seen: [], pending: [] })
})

test('invalid completion keys and unrelated events cannot open an offer', () => {
  for (const value of [null, '', {}, 'x'.repeat(601)])
    assert.equal(lessonOfferReducer(EMPTY_LESSON_OFFERS, { type: 'saved', key: value }), EMPTY_LESSON_OFFERS)
  for (const event of [{ type: 'clicked' }, { type: 'failed' }, { type: 'loading' }])
    assert.equal(lessonOfferReducer(EMPTY_LESSON_OFFERS, event), EMPTY_LESSON_OFFERS)
  assert.equal(lessonCompletionKey(), null)
  assert.equal(lessonCompletionKey({ cycleId: 'a', day: 0, lessonId: 'b' }), null)
  assert.notEqual(key(1), lessonCompletionKey({ cycleId: 'new-cycle', day: 1, lessonId: 'synthetic-lesson-1' }))
})

test('only expected HTTPS Stripe checkout and portal destinations are accepted', () => {
  assert.equal(safeBillingRedirect('https://checkout.stripe.com/c/pay/cs_test_fixture', 'checkout'), 'https://checkout.stripe.com/c/pay/cs_test_fixture')
  assert.equal(safeBillingRedirect('https://billing.stripe.com/p/session/test_fixture', 'portal'), 'https://billing.stripe.com/p/session/test_fixture')
  for (const value of ['https://evil.example', 'https://checkout.stripe.com.evil.example', 'http://checkout.stripe.com', 'https://user:password@checkout.stripe.com', 'javascript:alert(1)', '//checkout.stripe.com', 'https://checkout.stripe.com:444'])
    assert.equal(safeBillingRedirect(value, 'checkout'), null)
  assert.equal(safeBillingRedirect('https://billing.stripe.com', 'checkout'), null)
})

test('EN/RU copy is complete and preserves optional access, retest, safety, cancellation, and price terms', () => {
  assert.deepEqual(Object.keys(SUBSCRIPTION_COPY.en).sort(), Object.keys(SUBSCRIPTION_COPY.ru).sort())
  for (const locale of ['en', 'ru']) {
    const copy = SUBSCRIPTION_COPY[locale]
    for (const value of Object.values(copy)) assert.ok(Array.isArray(value) ? value.length === 4 : value.length > 0)
    assert.match(copy.price, /10.*USD/)
    assert.match(copy.terms, /10.*USD/)
  }
  assert.match(SUBSCRIPTION_COPY.en.free, /existing free basic access stays/)
  assert.match(SUBSCRIPTION_COPY.en.confirmText, /keep access through the end/)
  assert.match(SUBSCRIPTION_COPY.ru.free, /бесплатный доступ сохраняется/)
  assert.match(SUBSCRIPTION_COPY.ru.safety, /не диагностика/)
})

test('daily-course completion hook runs only inside the successful session-save callback', () => {
  assert.match(daily, /const result=await api\(action,locale,body\)[\s\S]*?hydrate\(result\)[\s\S]*?if\(after\)after\(\)/)
  assert.match(daily, /submit\('session',[\s\S]*?notifyLessonSaved\(\{cycleId:cycle\.id,day:cycle\.day,lessonId:lesson\.id\}\)/)
  assert.equal((daily.match(/notifyLessonSaved\(\{/g) || []).length, 1)
  assert.match(daily, /if\(action==='session'&&result\?\.cycle\?\.id!==data\?\.cycle\?\.id\)throw/)
  assert.doesNotMatch(daily, /response\.json\(\)\.catch/)
})

test('provider keeps children rendered and stores no entitlement or health-targeted data in the browser', () => {
  assert.match(component, /<SubscriptionContext\.Provider[^>]*>\s*\{children\}/)
  assert.doesNotMatch(component, /localStorage|sessionStorage|sendBeacon|\b(?:gtag|fbq|posthog)\s*\(|<img|<iframe|<script/i)
  assert.match(component, /requestBilling\(accountId, 'checkout', \{ operationId: operationIds\.current\.checkout, locale: lang \}\)/)
  assert.match(component, /requestBilling\(accountId, 'cancel', \{ operationId: operationIds\.current\.cancel, confirmed: true \}\)/)
  assert.match(component, /requestBilling\(accountId, 'reconcile', \{\}\)/)
  assert.doesNotMatch(component, /entitlement:\s*\{\s*active:\s*true/)
})

test('keyboard and accessibility guards provide named controls, Escape, focus restoration, and explicit cancellation', () => {
  assert.match(component, /role="region" aria-labelledby=\{titleId\}/)
  assert.match(component, /aria-label=\{t\.close\}/)
  assert.match(component, /event\.key === 'Escape'/)
  assert.match(component, /previousFocus\.current\.focus\?\.\(\)/)
  assert.match(component, /role="group" aria-label=\{t\.confirmTitle\}/)
  assert.match(component, /aria-expanded=\{confirming\}/)
  assert.match(component, /keepRef\.current\?\.focus\(\)/)
  assert.doesNotMatch(component, /aria-modal="true"|document\.body\.style\.overflow/)
  assert.match(css, /:focus-visible/)
})

test('mobile style guards provide reflow, 44px controls, dynamic-height bounds, and reduced-motion support', () => {
  assert.match(css, /@media\(max-width:620px\)/)
  assert.match(css, /overflow-wrap:anywhere/)
  assert.match(css, /min-height:44px/)
  assert.match(css, /100dvh/)
  assert.match(css, /safe-area-inset-bottom/)
  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.match(css, /white-space:normal/)
})
