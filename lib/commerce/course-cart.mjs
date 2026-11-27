// Course SKUs are deliberately separate from consultation and video SKUs.
// A published preview price is NOT authority to accept funds.
import { getCoachProgramComparison } from '../coach-program-comparison.mjs'

export const COURSE_CART_STORAGE_KEY = 'hh-course-cart-v1'
export const COURSE_CART_MAX_ITEMS = 12
export const COURSE_CHECKOUT_NOTICE = 'course-checkout-v1'
// Add an entry only after the specific course price, delivery, entitlement,
// refund terms and purchase readiness have been reviewed. Preview prices
// from My Coach must never automatically become payable.
export const APPROVED_COURSE_SALES = Object.freeze([])

export function courseOffer(id, locale = 'en', catalog = APPROVED_COURSE_SALES) {
  if (typeof id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(id)) return null
  const item = catalog.find(entry => entry.id === id)
  if (!item || item.available !== true || item.currency !== 'EUR' ||
      !Number.isSafeInteger(item.amountMinor) || item.amountMinor <= 0 ||
      item.amountMinor > 1000000 || typeof item.title?.[locale] !== 'string' ||
      !item.title[locale].trim()) return null
  return {id:item.id,title:item.title[locale],amountMinor:item.amountMinor,currency:'EUR'}
}

export function coachCourseOffer(program, locale = 'en') {
  const entry = getCoachProgramComparison(locale).programs.find(p => p.id === program)
  if (!entry || !entry.available || entry.draft || entry.id === 'clarity') return null
  return courseOffer('coach-'+program, locale)
}

export function restoreCourseCart(value, catalog = APPROVED_COURSE_SALES) {
  try {
    const ids = JSON.parse(value || '[]')
    if (!Array.isArray(ids) || ids.length > 100) return []
    return [...new Set(ids.filter(id => courseOffer(id,'en',catalog)))].slice(0, COURSE_CART_MAX_ITEMS)
  } catch { return [] }
}

export function quoteCourseCart(ids, locale = 'en', catalog = APPROVED_COURSE_SALES) {
  if (!['en','ru','es'].includes(locale) || !Array.isArray(ids) || !ids.length ||
      ids.length > COURSE_CART_MAX_ITEMS || new Set(ids).size !== ids.length)
    throw new Error('INVALID_COURSE_CART')
  const items = ids.map(id => courseOffer(id,locale,catalog))
  if (items.some(item => !item)) throw new Error('COURSE_NOT_FOR_SALE')
  items.sort((a,b) => a.id.localeCompare(b.id))
  return {items,currency:'EUR',totalMinor:items.reduce((sum,item)=>sum+item.amountMinor,0)}
}

export function courseCartPath(locale, ids) {
  if (!['en','ru','es'].includes(locale)) throw new Error('INVALID_LOCALE')
  return '/'+locale+'/cart?courses='+encodeURIComponent(ids.join(','))
}

export function courseCheckoutEnabled(env = process.env, catalog = APPROVED_COURSE_SALES) {
  // Flags alone can never activate an empty/unreviewed catalogue.
  return catalog.some(item=>courseOffer(item.id,'en',catalog)) && env.HH_COURSE_CHECKOUT_ENABLED === 'true' &&
    env.HH_COURSE_CHECKOUT_SCHEMA_APPROVED === 'true' &&
    env.HH_COURSE_CHECKOUT_FULFILLMENT_APPROVED === 'true' &&
    env.HH_COURSE_PAYPAL_APPROVED === 'true' &&
    env.HH_COURSE_PAYPAL_REVIEW_APPROVED === 'true' &&
    env.HH_PAYPAL_PERSONAL_DISABLED !== 'true'
}
