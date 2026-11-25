import { SERVICE_PRODUCTS } from './catalog.js'

// Wise Business OPEN links support prefilled payment fields. WiseTag /pay/me/
// is a separate Wise-to-Wise transfer destination and has no documented
// URL parameter contract for checkout amounts.
function parseWiseLink(raw) {
  if (typeof raw !== 'string' || raw.length > 512) return null
  try {
    const parsed = new URL(raw.trim())
    if (parsed.protocol !== 'https:' ||
        !['wise.com', 'www.wise.com'].includes(parsed.hostname.toLowerCase()) ||
        parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) return null
    return parsed
  } catch {
    return null
  }
}

export function normalizeWiseOpenPaymentLink(raw) {
  const parsed = parseWiseLink(raw)
  if (!parsed || !/^\/pay\/business\/[A-Za-z0-9._-]+\/?$/.test(parsed.pathname)) return null
  return 'https://wise.com' + parsed.pathname.replace(/\/$/, '')
}

export function normalizeWiseTagLink(raw) {
  const parsed = parseWiseLink(raw)
  if (!parsed || !/^\/pay\/me\/[A-Za-z0-9][A-Za-z0-9._-]{2,79}\/?$/.test(parsed.pathname)) return null
  return 'https://wise.com' + parsed.pathname.replace(/\/$/, '')
}

// Unlike a Wise Business open payment link, a WiseTag alone does not establish
// that the recipient has a business account authorised to receive sales.
// Requiring a separate verified-business flag prevents accidentally directing
// commerce receipts to a personal Wise profile.
export function configuredWisePaymentMethod(env = process.env) {
  const businessOpen = normalizeWiseOpenPaymentLink(env.HH_WISE_PAYMENT_OPEN_LINK)
  if (businessOpen) return Object.freeze({ kind: 'business-open', link: businessOpen })
  const wisetag = normalizeWiseTagLink(env.HH_WISE_PAYMENT_WISETAG_LINK)
  if (wisetag && env.HH_WISE_WISETAG_BUSINESS_VERIFIED === 'true')
    return Object.freeze({ kind: 'wisetag', link: wisetag })
  return null
}

export function wisePaymentsEnabled(env = process.env) {
  return env.HH_WISE_PAYMENTS_ENABLED === 'true' &&
    env.HH_WISE_PAYEE_APPROVED === 'true' &&
    Boolean(configuredWisePaymentMethod(env))
}

function paidService(serviceId) {
  const product = SERVICE_PRODUCTS.find(item => item.id === serviceId)
  return product?.kind === 'one_time' && product.currency === 'EUR' &&
    Number.isSafeInteger(product.amountMinor) && product.amountMinor > 0 ? product : null
}

export function buildWiseServicePaymentUrl(openLink, serviceId) {
  const base = normalizeWiseOpenPaymentLink(openLink)
  const product = paidService(serviceId)
  if (!base || !product) return null
  const link = new URL(base)
  link.searchParams.set('amount', (product.amountMinor / 100).toFixed(2))
  link.searchParams.set('currency', product.currency)
  // Public service SKU only: never send customer data, booking time or PHI.
  link.searchParams.set('description', 'Holistic House - ' + product.id)
  return link.toString()
}

// Both modes are external transfers; a redirect is NOT proof of settlement.
// Wisetag has no supported prefill parameters, so return the URL unchanged
// and instruct the customer to enter/verify the exact EUR amount in Wise.
export function buildWiseConfiguredServiceUrl(env = process.env, serviceId) {
  if (!wisePaymentsEnabled(env) || !paidService(serviceId)) return null
  const payment = configuredWisePaymentMethod(env)
  return payment.kind === 'business-open'
    ? buildWiseServicePaymentUrl(payment.link, serviceId)
    : payment.link
}
