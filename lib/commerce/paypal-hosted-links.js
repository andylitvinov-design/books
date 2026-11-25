import { SERVICE_PRODUCTS } from './catalog.js'

// Provider-hosted links start a payment, never prove a captured transaction.
// Automatic paid status is reserved for the separate verified Orders v2 ledger.
const FIELDS = Object.freeze([
  Object.freeze({ minor: 5000, key: 'HH_PAYPAL_HOSTED_50_EUR_LINK' }),
  Object.freeze({ minor: 10000, key: 'HH_PAYPAL_HOSTED_100_EUR_LINK' }),
  Object.freeze({ minor: 15000, key: 'HH_PAYPAL_HOSTED_150_EUR_LINK' }),
])

export function normalizePayPalHostedLink(raw) {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 512) return null
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:' || url.hostname !== 'www.paypal.com' ||
        url.username || url.password || url.port || url.search || url.hash ||
        !/^\/ncp\/payment\/[A-Za-z0-9-]{8,120}$/.test(url.pathname)) return null
    return 'https://www.paypal.com' + url.pathname
  } catch { return null }
}

export function configuredPayPalHostedLinks(env = process.env) {
  if (env.VERCEL_ENV !== 'production' ||
      env.HH_PAYPAL_HOSTED_LINKS_ENABLED !== 'true' ||
      env.HH_PAYPAL_HOSTED_PAYEE_APPROVED !== 'true' ||
      env.HH_PAYPAL_HOSTED_EUR_AMOUNTS_VERIFIED !== 'true') return Object.freeze({})
  const urls = {}
  for (const { minor, key } of FIELDS) {
    const raw = env[key]
    if (raw == null || raw === '') continue
    const url = normalizePayPalHostedLink(raw)
    if (!url) return Object.freeze({})
    urls[minor] = url
  }
  const links = Object.values(urls)
  if (new Set(links).size !== links.length) return Object.freeze({})
  return Object.freeze(urls)
}

export function buildPayPalHostedCartUrl(serviceIds, links) {
  if (!Array.isArray(serviceIds) || serviceIds.length < 1 ||
      serviceIds.length > SERVICE_PRODUCTS.length ||
      new Set(serviceIds).size !== serviceIds.length) return null
  const products = serviceIds.map(id => SERVICE_PRODUCTS.find(p => p.id === id))
  if (products.some(p => !p || p.kind !== 'one_time' || p.currency !== 'EUR' ||
      !Number.isSafeInteger(p.amountMinor) || p.amountMinor <= 0)) return null
  const total = products.reduce((sum, p) => sum + p.amountMinor, 0)
  if (!Number.isSafeInteger(total) || !Object.prototype.hasOwnProperty.call(links || {}, total)) return null
  return normalizePayPalHostedLink(links[total])
}
