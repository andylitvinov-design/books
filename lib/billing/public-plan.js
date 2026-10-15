// Display metadata only. Entitlements are confirmed by the authenticated server.
const plan = (key, amount, activeCourseLimit, adFree, freeTests = false, monthlySessions = 0) => Object.freeze({
  key, amount, currency: 'eur', interval: 'month', activeCourseLimit, adFree,
  freeTests, monthlySessions, sessionMinutes: monthlySessions ? 60 : 0,
})
export const SUBSCRIPTION_PLANS = Object.freeze({
  free: plan('free', 0, 1, false), start: plan('start', 1000, 1, true),
  advanced: plan('advanced', 2000, 5, true), premium: plan('premium', 10000, 5, true, true, 1),
})
export const PAID_PLAN_KEYS = Object.freeze(['start', 'advanced', 'premium'])
export function getSubscriptionPlan(key) { return Object.hasOwn(SUBSCRIPTION_PLANS, key) ? SUBSCRIPTION_PLANS[key] : null }

export function normalizeBillingStatus(value) {
  if (!value || typeof value.available !== 'boolean' || typeof value.enabled !== 'boolean' ||
      typeof value.entitlement?.active !== 'boolean' || typeof value.entitlement?.adFree !== 'boolean') {
    throw new Error('INVALID_BILLING_STATUS')
  }
  const entitlement = value.entitlement, selected = getSubscriptionPlan(entitlement.tier)
  if (!selected || entitlement.active !== (selected.key !== 'free') ||
      ['adFree', 'activeCourseLimit', 'freeTests', 'monthlySessions', 'sessionMinutes'].some(key => entitlement[key] !== selected[key]) ||
      (entitlement.active && !validDate(entitlement.paidThrough))) throw new Error('INVALID_BILLING_STATUS')
  const matches = Object.entries(SUBSCRIPTION_PLANS).every(([key, expected]) =>
    Object.entries(expected).every(([field, target]) => value.plans?.[key]?.[field] === target)) &&
    Object.entries(selected).every(([field, target]) => value.plan?.[field] === target)
  return {
    available: value.available && matches, enabled: value.enabled && matches,
    plans: SUBSCRIPTION_PLANS, plan: selected,
    enabledPlans: matches && Array.isArray(value.enabledPlans) ? value.enabledPlans.filter(key => PAID_PLAN_KEYS.includes(key)) : [],
    entitlement: { active: entitlement.active, tier: selected.key, adFree: selected.adFree,
      activeCourseLimit: selected.activeCourseLimit, freeTests: selected.freeTests,
      monthlySessions: selected.monthlySessions, sessionMinutes: selected.sessionMinutes,
      paidThrough: validDate(entitlement.paidThrough) },
    subscription: value.subscription && typeof value.subscription.status === 'string' ? {
      status: value.subscription.status, cancelAtPeriodEnd: value.subscription.cancelAtPeriodEnd === true,
      periodEnd: validDate(value.subscription.periodEnd),
    } : null,
    sessionBenefit: entitlement.tier === 'premium' && value.sessionBenefit?.periodEnd === entitlement.paidThrough &&
      ['available', 'requested', 'fulfilled', 'revoked', 'expired'].includes(value.sessionBenefit.status) &&
      value.sessionBenefit.minutes === 60 && value.sessionBenefit.count === 1
      ? { periodEnd: entitlement.paidThrough, status: value.sessionBenefit.status, minutes: 60, count: 1, scheduling: 'separate_confirmation_required' } : null,
    provider: value.provider === 'stripe' ? 'stripe' : null, sandbox: value.sandbox === true,
  }
}
function validDate(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null }
export function canShowHousePromotion(status, phase = 'ready') {
  return phase === 'ready' && Boolean(status?.available) && status.entitlement.active === false && status.entitlement.adFree === false
}
export function canStartCheckout(status, phase = 'ready', planId = 'start') {
  return PAID_PLAN_KEYS.includes(planId) && canShowHousePromotion(status, phase) && status.enabled && status.provider === 'stripe' &&
    status.enabledPlans?.includes(planId) && (!status.subscription || ['canceled', 'incomplete_expired'].includes(status.subscription.status))
}

export function lessonCompletionKey({ cycleId, day, lessonId } = {}) {
  if (typeof cycleId !== 'string' || !cycleId || cycleId.length > 150 ||
      typeof lessonId !== 'string' || !lessonId || lessonId.length > 150 ||
      !Number.isInteger(day) || day < 1 || day > 366) return null
  return JSON.stringify(['lesson', cycleId, day, lessonId])
}

export const EMPTY_LESSON_OFFERS = Object.freeze({ seen: [], pending: [] })

// In-memory, account-scoped duplicate protection. Nothing here persists an
// entitlement or sends a course identifier, answer, or note to billing.
export function lessonOfferReducer(state, event) {
  if (event.type === 'saved') {
    if (typeof event.key !== 'string' || !event.key || event.key.length > 600 || state.seen.includes(event.key)) return state
    return {
      seen: [...state.seen, event.key],
      pending: event.suppressed ? state.pending : [...state.pending, event.key],
    }
  }
  if (event.type === 'dismiss') return { ...state, pending: state.pending.filter(key => key !== event.key) }
  if (event.type === 'suppress') return { ...state, pending: [] }
  if (event.type === 'reset') return { seen: [], pending: [] }
  return state
}

export function safeBillingRedirect(value, action) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    const host = action === 'checkout' ? 'checkout.stripe.com' : action === 'portal' ? 'billing.stripe.com' : null
    return host && url.protocol === 'https:' && url.hostname === host && !url.username && !url.password && !url.port
      ? url.href : null
  } catch { return null }
}
