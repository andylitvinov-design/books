import { SERVICE_PRODUCTS } from './catalog.js'

// Personal PayPal.Me destination supplied by the owner and checked against
// PayPal's public profile ("Pay Andrii Litvinov") on 2026-10-18.
// This is NOT the PayPal Business API, an authenticated capture, or a webhook.
// Public receiving link is not a secret; do not add personal login credentials.
export const PERSONAL_PAYPAL_ME_BASE = 'https://paypal.me/psitrends'
export const PERSONAL_PAYPAL_PAYEE = 'Andrii Litvinov'

// Emergency kill switch. This flow needs no Business REST credentials.
export function personalPayPalEnabled(env = process.env) {
  return env.HH_PAYPAL_PERSONAL_DISABLED !== 'true'
}

export function buildPersonalPayPalServiceUrl(serviceId, env = process.env) {
  if (!personalPayPalEnabled(env) || typeof serviceId !== 'string') return null
  const product = SERVICE_PRODUCTS.find(item => item.id === serviceId)
  if (!product || product.kind !== 'one_time' || product.currency !== 'EUR' ||
      !Number.isSafeInteger(product.amountMinor) || product.amountMinor <= 0 ||
      product.amountMinor % 100 !== 0) return null
  // Fixed exact amount and explicit EUR code follow PayPal.Me's documented
  // /YourHandle/50EUR pattern. No payer names, health data or order tokens.
  return PERSONAL_PAYPAL_ME_BASE + '/' + String(product.amountMinor / 100) + product.currency
}
