import { SERVICE_PRODUCTS } from './catalog.js'

// Square Canada is CAD-only. Each manually approved fixed-price link MUST have
// its exact CAD charge amount set in the merchant dashboard; there is no FX
// calculation in the browser, no unverified checkout, and no "paid" state.
const LINK_ROWS = Object.freeze([
  Object.freeze({ eurMinor: 5000, url: 'HH_SQUARE_CAD_50_LINK', amount: 'HH_SQUARE_CAD_50_MINOR' }),
  Object.freeze({ eurMinor: 10000, url: 'HH_SQUARE_CAD_100_LINK', amount: 'HH_SQUARE_CAD_100_MINOR' }),
  Object.freeze({ eurMinor: 15000, url: 'HH_SQUARE_CAD_150_LINK', amount: 'HH_SQUARE_CAD_150_MINOR' }),
])

export function normalizeSquarePaymentLink(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 512) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' ||
      !['square.link', 'checkout.square.site'].includes(url.hostname) ||
      url.username || url.password || url.port || url.search || url.hash) return null
    if (url.hostname === 'square.link' && !/^\/u\/[A-Za-z0-9_-]{5,120}$/.test(url.pathname)) return null
    if (url.hostname === 'checkout.square.site' && !/^\/[A-Za-z0-9_-]{5,120}$/.test(url.pathname)) return null
    return url.origin + url.pathname
  } catch { return null }
}

export function configuredSquarePaymentLinks(env = process.env) {
  // No automatic Square charges can be activated from code or env URL alone.
  if (env.VERCEL_ENV !== 'production' ||
    env.HH_SQUARE_CAD_LINKS_ENABLED !== 'true' ||
    env.HH_SQUARE_INDIVIDUAL_PAYEE_APPROVED !== 'true' ||
    env.HH_SQUARE_CAD_AMOUNTS_APPROVED !== 'true') return Object.freeze({})
  const links = {}
  for (const row of LINK_ROWS) {
    const url = normalizeSquarePaymentLink(env[row.url])
    const rawAmount = env[row.amount]
    if (!url || typeof rawAmount !== 'string' || !/^[1-9][0-9]{2,7}$/.test(rawAmount)) return Object.freeze({})
    const amountMinor = Number(rawAmount)
    if (!Number.isSafeInteger(amountMinor) || amountMinor > 10_000_000) return Object.freeze({})
    links[row.eurMinor] = Object.freeze({ url, amountMinor, currency: 'CAD' })
  }
  const records = Object.values(links)
  // Fail closed on any duplicated link or obviously swapped service amounts.
  if (new Set(records.map(row => row.url)).size !== LINK_ROWS.length ||
    !(links[5000].amountMinor < links[10000].amountMinor &&
      links[10000].amountMinor < links[15000].amountMinor)) return Object.freeze({})
  return Object.freeze(links)
}

export function buildSquarePaymentForServices(serviceIds, links) {
  if (!Array.isArray(serviceIds) || serviceIds.length < 1 ||
    serviceIds.length > SERVICE_PRODUCTS.length ||
    new Set(serviceIds).size !== serviceIds.length) return null
  const products = serviceIds.map(id => SERVICE_PRODUCTS.find(product => product.id === id))
  if (products.some(product => !product || product.kind !== 'one_time' ||
    product.currency !== 'EUR' || !Number.isSafeInteger(product.amountMinor) ||
    product.amountMinor <= 0)) return null
  const eurMinor = products.reduce((sum, product) => sum + product.amountMinor, 0)
  const payment = links?.[eurMinor]
  if (!payment || payment.currency !== 'CAD' ||
    !Number.isSafeInteger(payment.amountMinor) || payment.amountMinor <= 0) return null
  const url = normalizeSquarePaymentLink(payment.url)
  if (!url) return null
  return Object.freeze({ url, amountMinor: payment.amountMinor, currency: 'CAD' })
}

export function formatSquareCadAmount(amountMinor, locale = 'en') {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null
  return new Intl.NumberFormat(['en', 'ru', 'es'].includes(locale) ? locale : 'en', {
    style: 'currency', currency: 'CAD', minimumFractionDigits: 2,
  }).format(amountMinor / 100)
}
