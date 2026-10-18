import { AppError } from '../assessments/contracts.js'

export function getCommerceConfig(env = process.env) {
  // Service payments can use ZEN independently of Stripe subscriptions.
  const environment = (env.HH_COMMERCE_ENVIRONMENT || env.HH_BILLING_ENVIRONMENT) === 'live' ? 'live' : 'sandbox'
  const provider = env.HH_COMMERCE_PROVIDER || env.HH_BILLING_PROVIDER || 'stripe'
  const apiKey = env.HH_STRIPE_RESTRICTED_KEY || ''
  const accountId = env.HH_STRIPE_ACCOUNT_ID || ''
  const webhookSecret = env.HH_STRIPE_WEBHOOK_SECRET || ''
  const zenTerminalUuid = env.HH_ZEN_TERMINAL_UUID || ''
  const zenPaywallSecret = env.HH_ZEN_PAYWALL_SECRET || ''
  const zenIpnSecret = env.HH_ZEN_IPN_SECRET || ''
  const zenApiKey = env.HH_ZEN_TERMINAL_API_KEY || ''
  const prices = Object.freeze(provider === 'zen' ? {
    'express-consultation-30': 'express-consultation-30',
    'personal-session-60': 'personal-session-60',
  } : {
    'express-consultation-30': env.HH_STRIPE_SERVICE_30_PRICE_ID || '',
    'personal-session-60': env.HH_STRIPE_SERVICE_60_PRICE_ID || '',
  })
  const approved = env.HH_COMMERCE_SCHEMA_APPROVED === 'true' && env.HH_BILLING_SCHEMA_APPROVED === 'true'
  const modeAllowed = env.VERCEL_ENV !== 'production' ||
    (environment === 'live' && env.HH_COMMERCE_PRODUCTION_APPROVED === 'true')
  const keyMatches = environment === 'live' ? /^rk_live_/.test(apiKey) : /^rk_test_/.test(apiKey)
  const stripeConfigured = provider === 'stripe' && keyMatches &&
    /^acct_[A-Za-z0-9]+$/.test(accountId) && webhookSecret.startsWith('whsec_') &&
    Object.values(prices).every(value => /^price_[A-Za-z0-9]+$/.test(value)) &&
    new Set(Object.values(prices)).size === 2
  // The service_orders proposal originally constrained IDs/URLs to Stripe.
  // Explicitly gate ZEN on the reviewed, provider-aware migration; never
  // infer readiness solely from the merchant credentials.
  const zenConfigured = provider === 'zen' && env.HH_ZEN_SCHEMA_APPROVED === 'true' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(zenTerminalUuid) &&
    zenPaywallSecret.length >= 16 && zenIpnSecret.length >= 16 && zenApiKey.length >= 16
  const configured = Boolean(approved && modeAllowed && (stripeConfigured || zenConfigured))
  return Object.freeze({ provider, environment, apiKey, accountId, webhookSecret, prices,
    zenTerminalUuid, zenPaywallSecret, zenIpnSecret, zenApiKey, configured,
    enabled: configured && env.HH_COMMERCE_ENABLED === 'true' &&
      env.HH_COMMERCE_FULFILLMENT_APPROVED === 'true' &&
      env.HH_COMMERCE_TAX_REVIEW_APPROVED === 'true',
  })
}

export function requireCommerce(config, { checkout = false } = {}) {
  if (!config?.configured || (checkout && !config.enabled))
    throw new AppError('SERVICE_CHECKOUT_UNAVAILABLE', 503)
}
