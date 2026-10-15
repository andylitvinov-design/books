import { getBillingConfig } from './config.js'

// Standalone manual invoices are not Checkout sessions or recurring contracts.
// Every stage needs an explicit, independently verified rollout flag.
export function manualBillingConfig(env=process.env) {
  const billing=getBillingConfig(env)
  const requestsEnabled=env.HH_MANUAL_BILLING_REQUESTS_ENABLED==='true'
  const payeeApproved=env.HH_MANUAL_BILLING_PAYEE_APPROVED==='true'
  const adminReviewEnabled=requestsEnabled&&env.HH_MANUAL_BILLING_REVIEW_ENABLED==='true'
  const accessEnabled=adminReviewEnabled&&payeeApproved&&
    env.HH_MANUAL_BILLING_ACCESS_APPROVED==='true'&&
    billing.environment==='live'&&billing.schemaApproved&&billing.multiCourseApproved
  // Premium requires a separate manually paid monthly session-credit ledger.
  // Stripe's provider-only session credits cannot fulfill a manual payment.
  const premiumSessionEnabled=accessEnabled&&
    env.HH_MANUAL_PREMIUM_CREDIT_SCHEMA_APPROVED==='true'&&
    env.HH_MANUAL_PREMIUM_FULFILLMENT_APPROVED==='true'
  return Object.freeze({requestsEnabled,payeeApproved,adminReviewEnabled,accessEnabled,premiumSessionEnabled})
}
