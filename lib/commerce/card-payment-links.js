import { SERVICE_PRODUCTS } from './catalog.js'

// These are externally hosted Stripe Payment Links, NOT our internal Stripe
// order ledger. A redirect is never proof of payment or entitlement.
const TOTAL_LINK_ENV = Object.freeze([
  [5000, 'HH_CARD_PAYMENT_LINK_50_EUR'],
  [10000, 'HH_CARD_PAYMENT_LINK_100_EUR'],
  [15000, 'HH_CARD_PAYMENT_LINK_150_EUR'],
])

export function normalizeStripePaymentLink(raw) {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 512) return null
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:' || url.hostname !== 'buy.stripe.com' ||
      url.username || url.password || url.port || url.search || url.hash ||
      !/^\/(?:test_)?[A-Za-z0-9_]{8,160}$/.test(url.pathname)) return null
    return 'https://buy.stripe.com' + url.pathname
  } catch { return null }
}

// Only an owner-confirmed set of merchant / exact EUR price links can go live.
// The public browser receives the approved URL only, never credentials.
export function configuredIndividualCardLinks(env = process.env) {
  if (env.HH_CARD_PAYMENT_LINKS_ENABLED !== 'true' ||
    env.HH_CARD_PAYMENT_LINKS_PAYEE_VERIFIED !== 'true' ||
    env.HH_CARD_PAYMENT_LINKS_PRICES_VERIFIED !== 'true') return Object.freeze({})
  const urls = {}
  for (const [amount, envKey] of TOTAL_LINK_ENV) {
    const link = normalizeStripePaymentLink(env[envKey])
    if (link) urls[amount] = link
  }
  // One link for multiple advertised amounts is almost certainly a setup error.
  if (new Set(Object.values(urls)).size !== Object.values(urls).length) return Object.freeze({})
  return Object.freeze(urls)
}

export function buildIndividualCardPaymentUrl(serviceIds, links) {
  if (!Array.isArray(serviceIds) || serviceIds.length < 1 ||
    serviceIds.length > SERVICE_PRODUCTS.length || new Set(serviceIds).size !== serviceIds.length) return null
  const products = serviceIds.map(id => SERVICE_PRODUCTS.find(product => product.id === id))
  if (products.some(product => !product || product.kind !== 'one_time' ||
    product.currency !== 'EUR' || !Number.isSafeInteger(product.amountMinor) ||
    product.amountMinor <= 0)) return null
  const totalMinor = products.reduce((sum, product) => sum + product.amountMinor, 0)
  if (!Number.isSafeInteger(totalMinor) || !Object.prototype.hasOwnProperty.call(links || {}, totalMinor)) return null
  return normalizeStripePaymentLink(links[totalMinor])
}
