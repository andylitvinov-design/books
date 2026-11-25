/**
 * Master Network v3 commercial rule — proposed for future marketplace payments.
 *
 * A practitioner can publish free of charge. Holistic House earns 20% of the
 * service subtotal of every successfully paid order through onsite checkout,
 * including repeat orders. Orders paid externally and free requests are not
 * charged by this calculator. Taxes and processor costs are NOT part of the
 * service subtotal and are not included in either share.
 *
 * This pure function is not a payment gateway. It must only receive amounts
 * read back from a trusted, verified payment/partial-refund record. Enabling
 * actual checkout, transfers and payouts requires separate legal and provider
 * approval, accounting reconciliation and idempotent server-side settlement.
 */

export const MARKETPLACE_PLATFORM_COMMISSION_BPS = 2000
export const MARKETPLACE_COMMISSION_POLICY_VERSION = 'master-network-v3-2026-10-16'

const safeMinor = (value, field) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(field + ' must be a non-negative safe integer in currency minor units')
  }
  return value
}

export function calculateMarketplaceCommission({
  serviceSubtotalMinor,
  refundedServiceMinor = 0,
  paymentCaptured = false,
  checkoutChannel = 'website',
}) {
  const subtotal = safeMinor(serviceSubtotalMinor, 'serviceSubtotalMinor')
  const refunded = safeMinor(refundedServiceMinor, 'refundedServiceMinor')
  if (refunded > subtotal) throw new RangeError('refundedServiceMinor exceeds serviceSubtotalMinor')
  if (!['website', 'external'].includes(checkoutChannel)) throw new RangeError('Unknown checkoutChannel')
  if (typeof paymentCaptured !== 'boolean') throw new TypeError('paymentCaptured must be boolean')

  const eligible = checkoutChannel === 'website' && paymentCaptured && subtotal > 0
  const remainingServiceMinor = subtotal - refunded
  // BigInt avoids floating point errors when rounding a percentage of cents.
  const platformCommissionMinor = eligible
    ? Number((BigInt(remainingServiceMinor) * BigInt(MARKETPLACE_PLATFORM_COMMISSION_BPS) + 5000n) / 10000n)
    : 0
  return Object.freeze({
    policyVersion: MARKETPLACE_COMMISSION_POLICY_VERSION,
    commissionBps: MARKETPLACE_PLATFORM_COMMISSION_BPS,
    eligible,
    remainingServiceMinor,
    platformCommissionMinor,
    practitionerShareMinor: remainingServiceMinor - platformCommissionMinor,
  })
}
