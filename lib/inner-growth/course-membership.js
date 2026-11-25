// Holistic House has two paid memberships: €20 Advanced and €100 Premium.
// The €10 introductory discount changes only Advanced's first invoice,
// not its recurring price and never the Premium price. Checkout and
// eligibility must be enforced by account-bound billing when it is enabled.
export const COURSE_MEMBERSHIP = Object.freeze({
  paidPlanId: 'advanced',
  regularMonthlyEUR: 20,
  introFirstMonthEUR: 10,
  introDiscountPercent: 50,
  premiumMonthlyEUR: 100,
})

export const COURSE_PUBLIC_PLANS = Object.freeze([
  Object.freeze({ id: 'free', price: 0, spots: 'one', items: ['ads'] }),
  Object.freeze({ id: COURSE_MEMBERSHIP.paidPlanId, price: COURSE_MEMBERSHIP.regularMonthlyEUR,
    spots: 'five', items: ['noAds'] }),
  Object.freeze({ id: 'premium', price: COURSE_MEMBERSHIP.premiumMonthlyEUR,
    spots: 'five', items: ['noAds', 'tests', 'session'] }),
])

// "show" comes from the private, account-bound billing status; never from a
// selected tier in the URL or a client-side preference.
export function shouldShowFreeCourseFinalOffer({
  day, durationDays, show = false, checking = false, alreadyDone = false,
} = {}) {
  return day === 14 && durationDays === 14 && show === true &&
    checking !== true && alreadyDone !== true
}
