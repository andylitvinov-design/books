import { AppError } from '../assessments/contracts.js'

export function getCommerceConfig(env = process.env) {
  const environment = env.HH_BILLING_ENVIRONMENT === 'live' ? 'live' : 'sandbox'
  const provider = env.HH_BILLING_PROVIDER || 'stripe'
  const apiKey = env.HH_STRIPE_RESTRICTED_KEY || ''
  const accountId = env.HH_STRIPE_ACCOUNT_ID || ''
  const webhookSecret = env.HH_STRIPE_WEBHOOK_SECRET || ''
  const prices = Object.freeze({
    'express-consultation-30': env.HH_STRIPE_SERVICE_30_PRICE_ID || '',
    'personal-session-60': env.HH_STRIPE_SERVICE_60_PRICE_ID || '',
  })
  const approved = env.HH_COMMERCE_SCHEMA_APPROVED === 'true' && env.HH_BILLING_SCHEMA_APPROVED === 'true'
  const modeAllowed = env.VERCEL_ENV !== 'production' || (environment === 'live' && env.HH_COMMERCE_PRODUCTION_APPROVED === 'true')
  const keyMatches = environment === 'live' ? /^rk_live_/.test(apiKey) : /^rk_test_/.test(apiKey)
  const configured = Boolean(approved && modeAllowed && provider === 'stripe' && keyMatches &&
    /^acct_[A-Za-z0-9]+$/.test(accountId) && webhookSecret.startsWith('whsec_') &&
    Object.values(prices).every((value) => /^price_[A-Za-z0-9]+$/.test(value)) && new Set(Object.values(prices)).size === 2)
  return Object.freeze({ provider, environment, apiKey, accountId, webhookSecret, prices, configured,
    enabled: configured && env.HH_COMMERCE_ENABLED === 'true' && env.HH_COMMERCE_FULFILLMENT_APPROVED === 'true' && env.HH_COMMERCE_TAX_REVIEW_APPROVED === 'true',
  })
}

export function requireCommerce(config, { checkout = false } = {}) {
  if (!config?.configured || (checkout && !config.enabled)) throw new AppError('SERVICE_CHECKOUT_UNAVAILABLE', 503)
}
