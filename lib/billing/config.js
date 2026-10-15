import { AppError } from '../assessments/contracts.js'

import { SUBSCRIPTION_PLANS, PAID_PLAN_KEYS } from './public-plan.js'
export { SUBSCRIPTION_PLANS, PAID_PLAN_KEYS, getSubscriptionPlan } from './public-plan.js'
export const STRIPE_API_VERSION = '2026-09-30.endive'

// The browser may choose a known plan key, never prices, entitlements or URLs.
// Old USD/PLUS price configuration is deliberately not a fallback.
export function getBillingConfig(env = process.env) {
  const environment = env.HH_BILLING_ENVIRONMENT === 'live' ? 'live' : 'sandbox'
  const production = env.VERCEL_ENV === 'production'
  const schemaApproved = env.HH_BILLING_SCHEMA_APPROVED === 'true'
  const modeAllowed = !production || (environment === 'live' && env.HH_BILLING_PRODUCTION_APPROVED === 'true')
  const provider = env.HH_BILLING_PROVIDER || 'stripe'
  const apiKey = env.HH_STRIPE_RESTRICTED_KEY || ''
  const keyMatches = environment === 'live' ? /^rk_live_/.test(apiKey) : /^rk_test_/.test(apiKey)
  const priceIds = Object.freeze(Object.fromEntries(PAID_PLAN_KEYS.map(key => [key, env['HH_STRIPE_' + key.toUpperCase() + '_PRICE_ID'] || ''])))
  const multiCourseApproved = env.HH_MULTICOURSE_SCHEMA_APPROVED === 'true'
  const sessionBenefitsApproved = env.HH_PREMIUM_SESSION_SCHEMA_APPROVED === 'true' && env.HH_PREMIUM_SESSION_FULFILLMENT_APPROVED === 'true'
  const enabledPlans = Object.freeze(PAID_PLAN_KEYS.filter(key => key === 'start' || (multiCourseApproved && (key !== 'premium' || sessionBenefitsApproved))))
  const portalConfigurationId = env.HH_STRIPE_PORTAL_CONFIGURATION_ID || ''
  const webhookSecret = env.HH_STRIPE_WEBHOOK_SECRET || ''
  const accountId = env.HH_STRIPE_ACCOUNT_ID || ''
  const configured = schemaApproved && modeAllowed && provider === 'stripe' && keyMatches &&
    PAID_PLAN_KEYS.every(key => /^price_[A-Za-z0-9]+$/.test(priceIds[key])) && new Set(Object.values(priceIds)).size === PAID_PLAN_KEYS.length && /^bpc_[A-Za-z0-9]+$/.test(portalConfigurationId) &&
    /^acct_[A-Za-z0-9]+$/.test(accountId) && webhookSecret.startsWith('whsec_')
  return Object.freeze({ provider, environment, schemaApproved: schemaApproved && modeAllowed,
    configured: Boolean(configured), enabled: Boolean(configured && env.HH_BILLING_ENABLED === 'true' && (environment === 'sandbox' || (env.HH_BILLING_TAX_REVIEW_APPROVED === 'true' && env.HH_BILLING_TERMS_APPROVED === 'true'))),
    apiKey, priceIds, enabledPlans, multiCourseApproved, sessionBenefitsApproved, portalConfigurationId, webhookSecret, accountId,
    // Tax is deliberately not enabled by a boolean alone; production tax setup is a launch gate.
    liveApproved: env.HH_BILLING_PRODUCTION_APPROVED === 'true', plans: SUBSCRIPTION_PLANS })
}

export function requireBillingProvider(config, { checkout = false } = {}) {
  if (!config.configured || (checkout && !config.enabled)) throw new AppError('BILLING_UNAVAILABLE', 503)
}
