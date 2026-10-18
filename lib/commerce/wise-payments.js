import { SERVICE_PRODUCTS } from './catalog.js'

// A Wise Business OPEN payment link is reusable. Single-use/request links,
// Wisetags and send-money links must not be converted into a public checkout.
export function normalizeWiseOpenPaymentLink(raw) {
  if (typeof raw !== 'string' || raw.length > 512) return null
  try {
    const parsed = new URL(raw.trim())
    if (parsed.protocol !== 'https:' ||
        !['wise.com', 'www.wise.com'].includes(parsed.hostname.toLowerCase()) ||
        parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash ||
        !/^\/pay\/business\/[A-Za-z0-9._-]+\/?$/.test(parsed.pathname)) return null
    return 'https://wise.com' + parsed.pathname.replace(/\/$/, '')
  } catch {
    return null
  }
}

// Configure only in server-side Vercel environment after independently
// confirming the account belongs to the intended Holistic House merchant.
export function wisePaymentsEnabled(env = process.env) {
  return env.HH_WISE_PAYMENTS_ENABLED === 'true' &&
    env.HH_WISE_PAYEE_APPROVED === 'true' &&
    Boolean(normalizeWiseOpenPaymentLink(env.HH_WISE_PAYMENT_OPEN_LINK))
}

export function buildWiseServicePaymentUrl(openLink, serviceId) {
  const base = normalizeWiseOpenPaymentLink(openLink)
  const product = SERVICE_PRODUCTS.find(item => item.id === serviceId)
  if (!base || !product || product.kind !== 'one_time' || product.currency !== 'EUR' ||
      !Number.isSafeInteger(product.amountMinor) || product.amountMinor <= 0) return null
  const link = new URL(base)
  link.searchParams.set('amount', (product.amountMinor / 100).toFixed(2))
  link.searchParams.set('currency', product.currency)
  // Never put customer names, health topics, bookings or client IDs in Wise URLs.
  link.searchParams.set('description', 'Holistic House - ' + product.id)
  return link.toString()
}
