import { AppError } from '../assessments/contracts.js'

import { PLUS_PLAN } from './public-plan.js'
export { PLUS_PLAN } from './public-plan.js'
export const STRIPE_API_VERSION = '2026-09-30.endive'

// No browser-provided price, provider, entitlement, or redirect URL is accepted.
export function getBillingConfig(env = process.env) {
  const environment = env.HH_BILLING_ENVIRONMENT === 'live' ? 'live' : 'sandbox'
  const production = env.VERCEL_ENV === 'production'
  const schemaApproved = env.HH_BILLING_SCHEMA_APPROVED === 'true'
  const modeAllowed = !production || (environment === 'live' && env.HH_BILLING_PRODUCTION_APPROVED === 'true')
  const provider = env.HH_BILLING_PROVIDER || 'stripe'
  const apiKey = env.HH_STRIPE_RESTRICTED_KEY || ''
  const keyMatches = environment === 'live' ? /^rk_live_/.test(apiKey) : /^rk_test_/.test(apiKey)
  const priceId = env.HH_STRIPE_PLUS_PRICE_ID || ''
  const portalConfigurationId = env.HH_STRIPE_PORTAL_CONFIGURATION_ID || ''
  const webhookSecret = env.HH_STRIPE_WEBHOOK_SECRET || ''
  const accountId = env.HH_STRIPE_ACCOUNT_ID || ''
  const configured = schemaApproved && modeAllowed && provider === 'stripe' && keyMatches &&
    /^price_[A-Za-z0-9]+$/.test(priceId) && /^bpc_[A-Za-z0-9]+$/.test(portalConfigurationId) &&
    /^acct_[A-Za-z0-9]+$/.test(accountId) && webhookSecret.startsWith('whsec_')
  return Object.freeze({ provider, environment, schemaApproved: schemaApproved && modeAllowed,
    configured: Boolean(configured), enabled: Boolean(configured && env.HH_BILLING_ENABLED === 'true' && (environment === 'sandbox' || (env.HH_BILLING_TAX_REVIEW_APPROVED === 'true' && env.HH_BILLING_TERMS_APPROVED === 'true'))),
    apiKey, priceId, portalConfigurationId, webhookSecret, accountId,
    // Tax is deliberately not enabled by a boolean alone; production tax setup is a launch gate.
    liveApproved: env.HH_BILLING_PRODUCTION_APPROVED === 'true', plan: PLUS_PLAN })
}

export function requireBillingProvider(config, { checkout = false } = {}) {
  if (!config.configured || (checkout && !config.enabled)) throw new AppError('BILLING_UNAVAILABLE', 503)
}
