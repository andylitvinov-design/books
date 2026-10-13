import { PLUS_PLAN } from './config.js'

export function subscriptionEntitlement(subscription, { environment, now = Date.now() } = {}) {
  const paidThrough = subscription?.paidThroughAt || null
  const end = Date.parse(paidThrough || '')
  const active = Boolean(subscription && subscription.planId === PLUS_PLAN.key &&
    subscription.environment === environment && !subscription.revokedAt &&
    Number.isFinite(end) && end > now)
  // Billing status and access are intentionally separate. Cancellation and failed
  // renewal cannot remove an already-paid period, and ACTIVE alone grants nothing.
  return { active, paidThrough: active ? paidThrough : null, adFree: active,
    unlimitedTests: active, wellbeingTracking: active, supportCourses: active }
}

export function publicBillingStatus(config, subscription, { available = true, now } = {}) {
  return { available, enabled: Boolean(available && config.enabled), sandbox: config.environment === 'sandbox',
    plan: PLUS_PLAN, provider: available ? config.provider : null,
    entitlement: subscriptionEntitlement(subscription, { environment: config.environment, now }),
    subscription: subscription ? { status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      periodEnd: subscription.currentPeriodEnd, paidThrough: subscription.paidThroughAt } : null }
}
