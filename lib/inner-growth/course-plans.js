// Dashboard compatibility adapter. There is only one authoritative plan catalogue.
import { SUBSCRIPTION_PLANS, PAID_PLAN_KEYS } from '../billing/public-plan.js'
import { subscriptionEntitlement } from '../billing/entitlements.js'
export const COURSE_PLANS = Object.freeze(Object.fromEntries(Object.values(SUBSCRIPTION_PLANS).map(plan => [plan.key,
  Object.freeze({ id: plan.key, euroMonthly: plan.amount / 100, maxActiveCourses: plan.activeCourseLimit,
    adFree: plan.adFree, includedTests: plan.freeTests, personalSessionsMonthly: plan.monthlySessions,
    personalSessionMinutes: plan.sessionMinutes })])))
export const PAID_COURSE_TIERS = PAID_PLAN_KEYS
export const OCCUPIED_COURSE_STATUSES = Object.freeze(['active'])
export function isOccupiedCourse(row) { return Boolean(row && row.status === 'active') }
export function effectiveCourseTier(record, now = Date.now(), environment = 'sandbox') {
  return subscriptionEntitlement(record, { environment, now }).tier
}
export function courseEntitlements(record, now = Date.now(), environment = 'sandbox') {
  const access = subscriptionEntitlement(record, { environment, now })
  return { ...COURSE_PLANS[access.tier], tier: access.tier, paidThrough: access.paidThrough,
    subscriptionStatus: record?.status || 'none', cancelAtPeriodEnd: record?.cancelAtPeriodEnd === true }
}
