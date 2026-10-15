// One paid Holistic House membership. The introductory discount changes the
// first invoice amount, not the plan or recurring price. Checkout and
// eligibility must be enforced by account-bound billing when it is enabled.
export const COURSE_MEMBERSHIP = Object.freeze({
  paidPlanId: 'advanced',
  regularMonthlyEUR: 20,
  introFirstMonthEUR: 10,
  introDiscountPercent: 50,
})

export const COURSE_PUBLIC_PLANS = Object.freeze([
  Object.freeze({ id: 'free', price: 0, spots: 'one', items: ['ads'] }),
  Object.freeze({ id: COURSE_MEMBERSHIP.paidPlanId, price: COURSE_MEMBERSHIP.regularMonthlyEUR,
    spots: 'five', items: ['noAds'] }),
])

// "show" comes from the private, account-bound billing status; never from a
// selected tier in the URL or a client-side preference.
export function shouldShowFreeCourseFinalOffer({
  day, durationDays, show = false, checking = false, alreadyDone = false,
} = {}) {
  return day === 14 && durationDays === 14 && show === true &&
    checking !== true && alreadyDone !== true
}
