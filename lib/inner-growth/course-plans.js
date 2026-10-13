// Canonical, non-clinical product entitlements. A browser-selected tier never grants access.
export const COURSE_PLANS = Object.freeze({
  free: Object.freeze({ id: 'free', euroMonthly: 0, maxActiveCourses: 1, adFree: false, includedTests: false, personalSessionsMonthly: 0 }),
  start: Object.freeze({ id: 'start', euroMonthly: 10, maxActiveCourses: 1, adFree: true, includedTests: false, personalSessionsMonthly: 0 }),
  advanced: Object.freeze({ id: 'advanced', euroMonthly: 20, maxActiveCourses: 5, adFree: true, includedTests: false, personalSessionsMonthly: 0 }),
  premium: Object.freeze({ id: 'premium', euroMonthly: 100, maxActiveCourses: 5, adFree: true, includedTests: true, personalSessionsMonthly: 1 }),
})
export const PAID_COURSE_TIERS = Object.freeze(['start', 'advanced', 'premium'])
export const OCCUPIED_COURSE_STATUSES = Object.freeze(['active', 'paused'])
export function isOccupiedCourse(row) {
  return Boolean(row && OCCUPIED_COURSE_STATUSES.includes(row.status))
}
export function effectiveCourseTier(record, now = Date.now()) {
  if (!record || !PAID_COURSE_TIERS.includes(record.tier) ||
      !['active', 'trialing'].includes(record.stripe_status) ||
      !Number.isFinite(Date.parse(record.current_period_end)) ||
      Date.parse(record.current_period_end) <= now) return 'free'
  return record.tier
}
export function courseEntitlements(record, now = Date.now()) {
  const tier = effectiveCourseTier(record, now)
  return { ...COURSE_PLANS[tier], tier,
    subscriptionStatus: record?.stripe_status || 'none',
    currentPeriodEnd: record?.current_period_end || null,
    cancelAtPeriodEnd: record?.cancel_at_period_end === true,
  }
}
