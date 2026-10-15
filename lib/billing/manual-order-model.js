// Fixed, server-owned monetary catalogue for the Ezohata-style request workflow.
// This does not create a payment or an automatically renewing subscription.
import { COURSE_MEMBERSHIP } from '../inner-growth/course-membership.js'

export const MANUAL_ORDER_PLANS = Object.freeze({
  advanced: Object.freeze({ regularEuroCents: COURSE_MEMBERSHIP.regularMonthlyEUR * 100,
    firstMonthEuroCents: COURSE_MEMBERSHIP.introFirstMonthEUR * 100 }),
  premium: Object.freeze({ regularEuroCents: COURSE_MEMBERSHIP.premiumMonthlyEUR * 100,
    firstMonthEuroCents: COURSE_MEMBERSHIP.premiumMonthlyEUR * 100 }),
})

export const MANUAL_CHANNEL_CURRENCIES = Object.freeze({
  'paypal-eur': 'EUR',
  'paypal-usd': 'USD',
  'interac-cad': 'CAD',
  'privatbank-uah': 'UAH',
})

export function manualOrderQuote(planId, methodId, { firstMonthCandidate = false } = {}) {
  const plan = MANUAL_ORDER_PLANS[planId], currency = MANUAL_CHANNEL_CURRENCIES[methodId]
  if (!plan || !currency) return null
  return Object.freeze({
    planId, methodId, currency, euroReferenceCents: plan.regularEuroCents,
    firstMonthCandidate: Boolean(firstMonthCandidate && planId === 'advanced'),
    promotionalReferenceCents: firstMonthCandidate && planId === 'advanced' ? plan.firstMonthEuroCents : null,
    // Quotation is always confirmed by the owner before requesting any transfer.
    // Never invent FX rates, recipient accounts, taxes or processor surcharges.
    invoiceCurrency: null, invoiceAmountMinor: null, payable: false,
  })
}

export function validManualReceipt(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:\/-]{5,119}$/.test(value)
}

export function validInvoiceQuote(planId, methodId, amountMinor, { introduction = false } = {}) {
  const quote = manualOrderQuote(planId, methodId)
  if (!quote || !Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 50000000) return false
  if (quote.currency !== 'EUR') return true // Foreign amounts require separately verified FX/recipient review.
  return amountMinor === (introduction && planId === 'advanced'
    ? MANUAL_ORDER_PLANS.advanced.firstMonthEuroCents
    : MANUAL_ORDER_PLANS[planId].regularEuroCents)
}

export function manualOrderResponse(row) {
  if (!row) return null
  const iso = date => date ? (date instanceof Date ? date.toISOString() : String(date)) : null
  return {
    id: row.id, planId: row.plan_id, methodId: row.method_id, currency: row.currency,
    status: row.status, referenceEuroCents: row.reference_euro_cents,
    firstMonthCandidate: row.first_month_candidate === true,
    invoiceAmountMinor: row.invoice_amount_minor == null ? null : Number(row.invoice_amount_minor),
    invoiceCurrency: row.invoice_currency || null,
    expiresAt: iso(row.expires_at), paidThrough: iso(row.paid_through_at),
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  }
}
