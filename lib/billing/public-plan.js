// Public display metadata only. Billing access always comes from the authenticated
// status endpoint; neither this plan nor a checkout return URL grants access.
export const PLUS_PLAN = Object.freeze({ key: 'plus', amount: 1000, currency: 'usd', interval: 'month' })

export function normalizeBillingStatus(value) {
  if (!value || typeof value.available !== 'boolean' || typeof value.enabled !== 'boolean' ||
      typeof value.entitlement?.active !== 'boolean' || typeof value.entitlement?.adFree !== 'boolean') {
    throw new Error('INVALID_BILLING_STATUS')
  }
  const planMatches = Object.entries(PLUS_PLAN).every(([key, expected]) => value.plan?.[key] === expected)
  return {
    available: value.available && planMatches,
    enabled: value.enabled && planMatches,
    plan: PLUS_PLAN,
    entitlement: {
      active: value.entitlement.active,
      adFree: value.entitlement.adFree,
      paidThrough: validDate(value.entitlement.paidThrough),
    },
    subscription: value.subscription && typeof value.subscription.status === 'string' ? {
      status: value.subscription.status,
      cancelAtPeriodEnd: value.subscription.cancelAtPeriodEnd === true,
      periodEnd: validDate(value.subscription.periodEnd),
    } : null,
    provider: value.provider === 'stripe' ? 'stripe' : null,
    sandbox: value.sandbox === true,
  }
}

function validDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null
}

export function canShowHousePromotion(status, phase = 'ready') {
  return phase === 'ready' && Boolean(status?.available) &&
    status.entitlement.active === false && status.entitlement.adFree === false
}

export function canStartCheckout(status, phase = 'ready') {
  return canShowHousePromotion(status, phase) && status.available && status.enabled && status.provider === 'stripe' &&
    (!status.subscription || ['canceled', 'incomplete_expired'].includes(status.subscription.status))
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
