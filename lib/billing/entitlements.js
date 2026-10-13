import { SUBSCRIPTION_PLANS, getSubscriptionPlan } from './public-plan.js'

export function subscriptionEntitlement(subscription, { environment, now = Date.now() } = {}) {
  const paidThrough = subscription?.paidThroughAt || null, end = Date.parse(paidThrough || '')
  const selected = getSubscriptionPlan(subscription?.planId)
  const active = Boolean(subscription && selected && selected.key !== 'free' &&
    subscription.environment === environment && !subscription.revokedAt && Number.isFinite(end) && end > now)
  const plan = active ? selected : SUBSCRIPTION_PLANS.free
  // Status alone never grants access. Paid coverage survives cancellation/failed
  // renewal; expiry changes the allowance without deleting any course or result.
  return { active, tier: plan.key, paidThrough: active ? paidThrough : null,
    adFree: plan.adFree, activeCourseLimit: plan.activeCourseLimit, freeTests: plan.freeTests,
    monthlySessions: plan.monthlySessions, sessionMinutes: plan.sessionMinutes }
}

export function publicBillingStatus(config, subscription, { available = true, now } = {}) {
  const entitlement = subscriptionEntitlement(subscription, { environment: config.environment, now })
  return { available, enabled: Boolean(available && config.enabled), sandbox: config.environment === 'sandbox',
    plans: SUBSCRIPTION_PLANS, plan: SUBSCRIPTION_PLANS[entitlement.tier],
    enabledPlans: available && config.enabled ? config.enabledPlans || [] : [],
    provider: available ? config.provider : null, entitlement,
    subscription: subscription ? { status: subscription.status, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      periodEnd: subscription.currentPeriodEnd, paidThrough: subscription.paidThroughAt } : null }
}
