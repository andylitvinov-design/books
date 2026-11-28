import { PERSONAL_PAYPAL_ME_BASE } from '../../lib/commerce/paypal-personal.js'

// Pure donation format and recipient link. No CRM IDs or payer data in URLs.
export function normalizeReikiDonationReference(value) {
  if (typeof value !== 'string') return null
  const ref = value.trim().toUpperCase()
  return /^[A-Z0-9][A-Z0-9_-]{5,79}$/.test(ref) ? ref : null
}
export function reikiDonationAmountMinor(value) {
  return Number.isSafeInteger(value) && value >= 1 && value <= 250 ? value * 100 : null
}
export function buildReikiDonationPayPalUrl(amountMinor, enabled) {
  if (!enabled || !Number.isSafeInteger(amountMinor) ||
      amountMinor < 100 || amountMinor > 25000 || amountMinor % 100) return null
  return PERSONAL_PAYPAL_ME_BASE + '/' + amountMinor / 100 + 'EUR'
}
