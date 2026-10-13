import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as billingPublic from '../lib/billing/public-plan.js'
import ts from 'typescript'
import vm from 'node:vm'
import { SUBSCRIPTION_PLANS, PAID_PLAN_KEYS, normalizeBillingStatus, canShowHousePromotion, canStartCheckout, lessonCompletionKey, lessonOfferReducer, EMPTY_LESSON_OFFERS, safeBillingRedirect } from '../lib/billing/public-plan.js'
import { SUBSCRIPTION_COPY } from '../components/app/subscription-copy.js'

const entitlementFor = (key = 'free') => ({ ...SUBSCRIPTION_PLANS[key], tier: key,
  active: key !== 'free', paidThrough: key === 'free' ? null : '2026-11-13T12:00:00Z' })
const freeStatus = (overrides = {}) => normalizeBillingStatus({
  available: true, enabled: true, plan: SUBSCRIPTION_PLANS.free, plans: SUBSCRIPTION_PLANS,
  enabledPlans: PAID_PLAN_KEYS, entitlement: entitlementFor(), subscription: null, provider: 'stripe', ...overrides,
})
const paidStatus = (tier = 'premium', overrides = {}) => freeStatus({
  plan: SUBSCRIPTION_PLANS[tier], entitlement: entitlementFor(tier),
  subscription: { status: 'active', cancelAtPeriodEnd: false, periodEnd: '2026-11-13T12:00:00Z' }, ...overrides,
})
const key = day => lessonCompletionKey({ cycleId: 'synthetic-cycle', day, lessonId: 'synthetic-lesson-' + day })
const component = await readFile(new URL('../components/app/subscription-access.jsx', import.meta.url), 'utf8')
const daily = await readFile(new URL('../components/app/course-today.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../components/app/subscription-access.module.css', import.meta.url), 'utf8')

test('public plans advertise exact EUR terms and require explicit supported checkout tiers', () => {
  assert.deepEqual(Object.keys(SUBSCRIPTION_PLANS), ['free', 'start', 'advanced', 'premium'])
  assert.deepEqual(Object.values(SUBSCRIPTION_PLANS).map(plan => plan.amount), [0, 1000, 2000, 10000])
  assert.deepEqual(Object.values(SUBSCRIPTION_PLANS).map(plan => plan.activeCourseLimit), [1, 1, 5, 5])
  for (const plan of Object.values(SUBSCRIPTION_PLANS)) {
    assert.equal(plan.currency, 'eur'); assert.equal(plan.interval, 'month')
  }
  assert.equal(SUBSCRIPTION_PLANS.premium.monthlySessions, 1)
  assert.equal(SUBSCRIPTION_PLANS.premium.sessionMinutes, 60)
  for (const tier of PAID_PLAN_KEYS) assert.equal(canStartCheckout(freeStatus(), 'ready', tier), true)
  for (const tier of ['free', 'plus', 'unknown']) assert.equal(canStartCheckout(freeStatus(), 'ready', tier), false)
  for (const field of ['amount', 'currency', 'interval', 'activeCourseLimit', 'monthlySessions']) {
    const plans = { ...SUBSCRIPTION_PLANS, premium: { ...SUBSCRIPTION_PLANS.premium, [field]: 'drifted' } }
    const status = freeStatus({ plans })
    assert.equal(status.available, false)
    assert.equal(canStartCheckout(status, 'ready', 'premium'), false)
  }
  const gated = freeStatus({ enabledPlans: ['start'] })
  assert.equal(canStartCheckout(gated, 'ready', 'start'), true)
  assert.equal(canStartCheckout(gated, 'ready', 'advanced'), false)
  assert.equal(canStartCheckout(gated, 'ready', 'premium'), false)
})

test('unknown/loading/error entitlements suppress every promotion', () => {
  assert.equal(canShowHousePromotion(null), false)
  for (const phase of ['loading', 'unavailable', 'error']) {
    assert.equal(canShowHousePromotion(freeStatus(), phase), false)
    assert.equal(canStartCheckout(freeStatus(), phase), false)
  }
  assert.throws(() => normalizeBillingStatus({ available: true, enabled: true }), /INVALID_BILLING_STATUS/)
})

test('all paid entitlements suppress offers, even if checkout is disabled', () => {
  for (const tier of PAID_PLAN_KEYS) {
    const status = paidStatus(tier, { available: false })
    assert.equal(canShowHousePromotion(status), false)
    assert.equal(canStartCheckout(status, 'ready', tier), false)
  }
  assert.throws(() => freeStatus({ entitlement: { ...entitlementFor(), adFree: true } }), /INVALID_BILLING_STATUS/)
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

test('EN/RU copy is complete with truthful EUR tiers, history, retest and separate session scheduling', () => {
  assert.deepEqual(Object.keys(SUBSCRIPTION_COPY.en).sort(), Object.keys(SUBSCRIPTION_COPY.ru).sort())
  for (const locale of ['en', 'ru']) {
    const copy = SUBSCRIPTION_COPY[locale]
    for (const [key, value] of Object.entries(copy)) if (!['plans', 'sessionStates'].includes(key)) assert.ok(value.length > 0)
    assert.deepEqual(Object.keys(copy.plans), Object.keys(SUBSCRIPTION_PLANS))
    for (const [key, plan] of Object.entries(copy.plans)) {
      assert.ok(plan.benefits.length > 0)
      assert.match(plan.price, /€/)
      assert.ok(plan.price.includes(String(SUBSCRIPTION_PLANS[key].amount / 100)))
    }
    assert.doesNotMatch(JSON.stringify(copy), /USD|Plus|unlimited|неограниченн/i)
    assert.match(copy.plans.premium.benefits.join(' '), /60/)
    assert.match(copy.plans.premium.benefits.join(' '), /1 /)
  }
  assert.match(SUBSCRIPTION_COPY.en.free, /existing free basic access stays/)
  assert.match(SUBSCRIPTION_COPY.en.history, /history and saved progress are preserved/)
  assert.match(SUBSCRIPTION_COPY.en.scheduling, /separate scheduling.*No session is booked automatically/)
  assert.match(SUBSCRIPTION_COPY.en.confirmText, /keep access through the end/)
  assert.match(SUBSCRIPTION_COPY.ru.free, /бесплатный доступ сохраняется/)
  assert.match(SUBSCRIPTION_COPY.ru.safety, /не диагностика/)
  assert.match(SUBSCRIPTION_COPY.ru.scheduling, /записаться отдельно.*Автоматической записи нет/)
})

test('daily-course completion hook runs only at the shared verified session-save boundary', () => {
  assert.match(daily, /const result=await api\(action,locale,body,\{accountId,courseId\}\)[\s\S]*?if\(!isCurrent\(\)\)return null[\s\S]*?hydrate\(result\)[\s\S]*?if\(after\)after\(\)/)
  assert.match(daily, /if\(action==='session'&&!data\.currentSession\)[\s\S]*?offeredCompletions\.current\.has\(completionKey\)[\s\S]*?notifyLessonSaved\(\{cycleId,day:body\.day,lessonId:body\.lessonId\}\)/)
  assert.equal((daily.match(/notifyLessonSaved\(\{/g) || []).length, 1)
  assert.match(daily, /if\(action==='session'&&result\?\.cycle\?\.id!==data\?\.cycle\?\.id\)throw/)
  assert.doesNotMatch(daily, /response\.json\(\)\.catch/)
})

test('provider keeps children rendered and stores no entitlement or health-targeted data in the browser', () => {
  assert.match(component, /<SubscriptionContext\.Provider[^>]*>\s*\{children\}/)
  assert.doesNotMatch(component, /localStorage|sessionStorage|sendBeacon|\b(?:gtag|fbq|posthog)\s*\(|<img|<iframe|<script/i)
  assert.match(component, /requestBilling\(accountId, 'checkout', \{ operationId: operationIds\.current\.checkout\[planId\], locale: lang, planId \}\)/)
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

// Exercise provider callbacks and effect lifecycles with deterministic hooks and
// timers. JSX is compiled from the real component; no browser or payment call is made.
const compiled = ts.transpileModule(component + '\nexport { PlanSelection, CheckoutAction, SessionBenefit, SubscriptionContext }', {
  fileName: 'subscription-access.jsx', compilerOptions: { allowJs: true, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
function harness({ initialStatus = freeStatus(), search = '', request, statusRequest, context } = {}) {
  const slots = [], timers = new Map(), windowListeners = new Map(), documentListeners = new Map()
  const calls = [], redirects = []
  let cursor = 0, due = [], dirty = false, now = 0, sequence = 0, root, props, currentStatus = initialStatus
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
  const hooks = {
    createContext: value => ({ value, Provider: 'TestContextProvider' }),
    useContext: target => target.value,
    useState(value) {
      const index = cursor++
      if (!slots[index]) slots[index] = { value: typeof value === 'function' ? value() : value }
      return [slots[index].value, value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; dirty = true }]
    },
    useReducer(reducer, initial) { const [value, set] = hooks.useState(initial); return [value, event => set(value => reducer(value, event))] },
    useRef(value) { const index = cursor++; return slots[index] ||= { current: value } },
    useId() { return hooks.useRef('id-' + sequence++).current },
    useMemo(fn, deps) {
      const index = cursor++
      if (!sameDeps(slots[index]?.deps, deps)) slots[index] = { value: fn(), deps }
      return slots[index].value
    },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps) },
    useEffect(fn, deps) {
      const index = cursor++
      if (!sameDeps(slots[index]?.deps, deps)) {
        due.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: fn(), effect: fn } })
      }
    },
  }
  const runtime = { jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props, key) => ({ type, props, key }), Fragment: 'TestFragment' }
  const doc = { visibilityState: 'visible', addEventListener: (name, fn) => documentListeners.set(name, fn), removeEventListener: name => documentListeners.delete(name) }
  const win = { location: { search, assign: url => redirects.push(url) }, addEventListener: (name, fn) => windowListeners.set(name, fn), removeEventListener: name => windowListeners.delete(name) }
  const modules = {
    react: hooks, 'react/jsx-runtime': runtime, 'lucide-react': {}, '@/lib/billing/public-plan': billingPublic,
    './subscription-copy': { SUBSCRIPTION_COPY }, './subscription-access.module.css': { default: new Proxy({}, { get: (_, key) => key }) },
    '@/lib/billing/client-session': {
      requestBilling: async (owner, action, body) => {
        calls.push({ owner, action, body })
        return request ? request(owner, action, body) : { redirectUrl: 'https://checkout.stripe.com/c/pay/test' }
      },
      requestBillingStatus: async (owner, options) => {
        calls.push({ owner, action: 'status', signal: options.signal })
        return statusRequest ? statusRequest(owner, options) : currentStatus
      },
      verifiedBillingRedirect: async ({ value, isCurrent }) => isCurrent() ? value : null,
    },
  }
  const sandbox = {
    exports: {}, require: name => { assert.ok(modules[name], 'Unexpected component import ' + name); return modules[name] },
    window: win, document: doc, URLSearchParams, AbortController, Intl,
    crypto: { randomUUID: () => 'operation-' + sequence++ },
    Date: class extends Date { static now() { return now } },
    setTimeout: (fn, delay) => { const id = sequence++; timers.set(id, { fn, at: now + delay }); return id },
    clearTimeout: id => timers.delete(id),
  }
  vm.runInNewContext(compiled, sandbox)
  const api = sandbox.exports
  if (context) api.SubscriptionContext.value = context
  const render = (name = root || 'SubscriptionProvider', nextProps = props || { accountId: 'owner-A', children: 'course-content' }) => {
    root = name; props = nextProps; cursor = 0; due = []; dirty = false
    const tree = api[name](props)
    if (name === 'SubscriptionProvider') api.SubscriptionContext.value = tree.props.value
    due.forEach(fn => fn())
    return tree
  }
  const settle = async () => { for (let i = 0; i < 12; i++) { await Promise.resolve(); if (dirty && root) render() } }
  return {
    render, settle, calls, redirects, timers, api,
    get value() { return api.SubscriptionContext.value },
    setStatus: value => { currentStatus = value },
    async advance(ms) {
      now += ms
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); void timer.fn() }
      await settle()
    },
    async event(name, hidden = false) {
      doc.visibilityState = hidden ? 'hidden' : 'visible'
      ;(windowListeners.get(name) || documentListeners.get(name))?.()
      await settle()
    },
    replayEffects() { slots.forEach(slot => { if (slot?.effect) { slot.cleanup?.(); slot.cleanup = slot.effect() } }) },
    unmount() { slots.forEach(slot => slot?.cleanup?.()) },
  }
}
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
const textOf = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(textOf).join(' ') : textOf(tree.props?.children)

test('real checkout callback binds planId and keeps independent stable operation IDs across failures', async () => {
  const h = harness({ request: async () => { throw Object.assign(new Error('pending'), { code: 'BILLING_PLAN_CONFLICT' }) } })
  h.render(); await h.settle()
  assert.equal(h.value.status.entitlement.tier, 'free')
  await h.value.startCheckout('start'); await h.settle()
  await h.value.startCheckout('advanced'); await h.settle()
  await h.value.startCheckout('start'); await h.settle()
  await h.value.startCheckout('premium'); await h.settle()
  for (const invalid of ['free', 'plus', undefined]) assert.equal(await h.value.startCheckout(invalid), false)
  const checkouts = h.calls.filter(call => call.action === 'checkout')
  assert.deepEqual(checkouts.map(call => call.body.planId), ['start', 'advanced', 'start', 'premium'])
  assert.equal(checkouts[0].body.operationId, checkouts[2].body.operationId)
  assert.notEqual(checkouts[0].body.operationId, checkouts[1].body.operationId)
  assert.notEqual(checkouts[1].body.operationId, checkouts[3].body.operationId)
  assert.ok(checkouts.every(call => call.owner === 'owner-A' && call.body.locale === 'en'))
  assert.equal(h.value.error, 'checkoutConflict')
  assert.equal(h.value.status.entitlement.active, false)
  h.unmount()
})

test('double click makes one checkout; delayed checkout cannot redirect after account switch', async () => {
  let finish
  const h = harness({ request: () => new Promise(resolve => { finish = resolve }) })
  h.render(); await h.settle()
  const pending = h.value.startCheckout('premium')
  assert.equal(await h.value.startCheckout('start'), false)
  h.render('SubscriptionProvider', { accountId: 'owner-B', locale: 'ru' }); await h.settle()
  finish({ redirectUrl: 'https://checkout.stripe.com/c/pay/stale' })
  assert.equal(await pending, false); await h.settle()
  assert.equal(h.redirects.length, 0)
  assert.equal(h.value.status.entitlement.tier, 'free')
  assert.equal(h.calls.filter(call => call.action === 'checkout').length, 1)
  h.unmount()
})

test('success URL never grants access; polling reads until the server confirms the paid tier', async () => {
  const h = harness({ search: '?billing=success' })
  h.render(); await h.settle()
  assert.equal(h.value.status.entitlement.active, false)
  assert.equal(h.calls.filter(call => call.action === 'reconcile').length, 1)
  assert.equal(h.timers.size, 1)
  await h.advance(2000)
  assert.equal(h.value.status.entitlement.active, false)
  h.setStatus(paidStatus('premium'))
  await h.advance(2000)
  assert.equal(h.value.status.entitlement.tier, 'premium')
  assert.equal(h.value.status.entitlement.monthlySessions, 1)
  assert.equal(h.timers.size, 0)
  assert.equal(h.calls.filter(call => call.action === 'reconcile').length, 1)
  assert.equal(h.calls.filter(call => call.action === 'checkout' || call.action === 'cancel').length, 0)
  h.unmount()
})

test('return polling is bounded, pauses on pagehide, and never retries a failed reconcile', async () => {
  const h = harness({ search: '?billing=returned', request: async () => { throw Error('unknown reconciliation outcome') } })
  h.render(); await h.settle()
  assert.equal(h.value.phase, 'error')
  await h.advance(2000)
  assert.equal(h.value.phase, 'ready')
  await h.event('pagehide')
  assert.equal(h.timers.size, 0)
  const readCount = h.calls.filter(call => call.action === 'status').length
  await h.advance(2000)
  assert.equal(h.calls.filter(call => call.action === 'status').length, readCount)
  await h.event('pageshow')
  assert.equal(h.timers.size, 1)
  await h.advance(60000)
  assert.equal(h.timers.size, 0)
  assert.equal(h.calls.filter(call => call.action === 'reconcile').length, 1)
  h.unmount()
})

test('cancellation retains paid access until a new server status confirms otherwise', async () => {
  const h = harness({ initialStatus: paidStatus('advanced') })
  h.render(); await h.settle()
  assert.equal(await h.value.startCheckout('premium'), false)
  assert.equal(await h.value.cancelRenewal(), true); await h.settle()
  assert.equal(h.value.status.entitlement.tier, 'advanced')
  assert.equal(h.value.status.entitlement.activeCourseLimit, 5)
  assert.equal(h.calls.filter(call => call.action === 'cancel').length, 1)
  assert.equal(h.calls.find(call => call.action === 'cancel').body.confirmed, true)
  h.unmount()
})

test('tier selector provides native labelled radio controls in both languages and Free never checks out', () => {
  for (const locale of ['en', 'ru']) {
    const context = { locale, status: freeStatus(), phase: 'ready', busy: '' }
    const h = harness({ context }), t = SUBSCRIPTION_COPY[locale]
    let tree = h.render('PlanSelection', { t })
    const inputs = nodes(tree).filter(node => node.type === 'input')
    assert.deepEqual(inputs.map(node => node.props.value), ['free', 'start', 'advanced', 'premium'])
    assert.ok(inputs.every(node => node.props.type === 'radio' && node.props.name && node.props['aria-describedby']))
    assert.equal(nodes(tree).find(node => node.type === 'legend').props.children, t.choosePlan)
    assert.ok(textOf(tree).includes(t.scheduling))
    assert.ok(textOf(tree).includes(t.plans.premium.price))
    inputs[0].props.onChange()
    tree = h.render('PlanSelection', { t })
    const action = nodes(tree).find(node => node.type === h.api.CheckoutAction)
    assert.equal(action.props.planId, 'free')
    const free = h.render('CheckoutAction', action.props)
    assert.equal(nodes(free).filter(node => node.type === 'button').length, 0)
    assert.equal(textOf(free), t.freeSelected)
  }
})

test('active-tier settings expose billing management without suggesting an immediate tier switch', () => {
  for (const locale of ['en', 'ru']) for (const tier of PAID_PLAN_KEYS) {
    const t = SUBSCRIPTION_COPY[locale]
    const h = harness({ context: { locale, status: paidStatus(tier), phase: 'ready', busy: '', error: '' } })
    const tree = h.render('SubscriptionSettings', {})
    assert.ok(textOf(tree).includes(t.plans[tier].name + ' ' + t.active))
    assert.ok(textOf(tree).includes(t.manage))
    assert.equal(nodes(tree).some(node => node.type === h.api.PlanSelection), false)
    assert.equal(nodes(tree).some(node => node.type === h.api.SessionBenefit), tier === 'premium')
    const prices = nodes(tree).filter(node => node.type?.name === 'Price')
    assert.equal(prices[0].props.planId, tier)
  }
})

test('Strict Mode effect replay does not repeat the return reconciliation mutation', async () => {
  const h = harness({ search: '?billing=success' })
  h.render(); h.replayEffects(); await h.settle()
  assert.equal(h.calls.filter(call => call.action === 'reconcile').length, 1)
  assert.equal(h.value.status.entitlement.active, false)
  assert.equal(h.timers.size, 1)
  h.unmount()
  assert.equal(h.timers.size, 0)
})

test('a read completed after pagehide cannot update status or restart return polling', async () => {
  let finish
  const h = harness({ search: '?billing=success', statusRequest: () => new Promise(resolve => { finish = resolve }) })
  h.render(); await h.settle()
  await h.event('pagehide')
  finish(paidStatus('premium')); await h.settle()
  assert.equal(h.value.status, null)
  assert.equal(h.timers.size, 0)
  assert.equal(h.calls.find(call => call.action === 'status').signal.aborted, true)
  h.unmount()
})

const premiumWithBenefit = (status = 'available', periodEnd = '2026-11-13T12:00:00Z') => paidStatus('premium', {
  entitlement: { ...entitlementFor('premium'), paidThrough: periodEnd },
  sessionBenefit: { periodEnd, minutes: 60, count: 1, status, scheduling: 'separate_confirmation_required' },
})

test('session request is explicit, stable per period, read-confirmed, and never schedules automatically', async () => {
  const h = harness({ initialStatus: premiumWithBenefit() })
  h.render(); await h.settle()
  assert.equal(h.calls.filter(call => call.action === 'sessionRequest').length, 0)
  await h.value.requestSession(); await h.settle()
  assert.equal(h.value.status.sessionBenefit.status, 'available', 'mutation response is never an optimistic grant or scheduling confirmation')
  h.setStatus(premiumWithBenefit('requested'))
  await h.value.requestSession(); await h.settle()
  const requests = h.calls.filter(call => call.action === 'sessionRequest')
  assert.equal(requests.length, 2)
  assert.equal(requests[0].body.confirmed, true)
  assert.equal(requests[0].body.periodEnd, '2026-11-13T12:00:00Z')
  assert.equal(requests[0].body.operationId, requests[1].body.operationId)
  assert.equal(h.value.status.sessionBenefit.status, 'requested')
  assert.equal(await h.value.requestSession(), false)
  assert.equal(h.redirects.length, 0)
  h.unmount()
})

test('unavailable, unconfirmed or already used session benefits cannot be requested', async () => {
  for (const initialStatus of [freeStatus(), paidStatus('start'), paidStatus('advanced'), paidStatus('premium'),
    ...['requested', 'fulfilled', 'expired', 'revoked'].map(value => premiumWithBenefit(value))]) {
    const h = harness({ initialStatus })
    h.render(); await h.settle()
    assert.equal(await h.value.requestSession(), false)
    assert.equal(h.calls.filter(call => call.action === 'sessionRequest').length, 0)
    h.unmount()
  }
})

test('monthly session UI requires separate confirmation and gives no booked-time promise', async () => {
  for (const locale of ['en', 'ru']) {
    const t = SUBSCRIPTION_COPY[locale]
    let requests = 0
    const h = harness({ context: { status: premiumWithBenefit(), busy: '', requestSession: async () => { requests++; return true } } })
    let tree = h.render('SessionBenefit', { t })
    assert.ok(textOf(tree).includes(t.scheduling))
    assert.equal(nodes(tree).some(node => node.props?.role === 'group'), false)
    const button = nodes(tree).find(node => node.type === 'button')
    button.props.onClick(); tree = h.render('SessionBenefit', { t })
    assert.equal(requests, 0)
    assert.ok(textOf(tree).includes(t.sessionConfirmText))
    assert.equal(nodes(tree).find(node => node.props?.role === 'group').props['aria-label'], t.sessionConfirmTitle)
    const confirm = nodes(tree).find(node => node.type === 'button' && node.props.children === t.sessionConfirm)
    await confirm.props.onClick()
    assert.equal(requests, 1)
  }
})
