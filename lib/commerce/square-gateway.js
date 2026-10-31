import { createHmac, timingSafeEqual } from 'node:crypto'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { SERVICE_PRODUCTS } from './catalog.js'
import { normalizeSquareCheckoutRedirect } from './square-payment-links.js'

const VERSION = '2026-09-16'
const MONEY_ROWS = Object.freeze([[5000, 'HH_SQUARE_CAD_50_MINOR'], [10000, 'HH_SQUARE_CAD_100_MINOR'], [15000, 'HH_SQUARE_CAD_150_MINOR']])
const LIVE_WEBHOOK = 'https://holistichouse.vercel.app/api/payments/square/webhook'
const unavailable = () => { throw new AppError('SQUARE_CHECKOUT_UNAVAILABLE', 503) }

// A merchant is distinct from a service-price catalogue. Wallet top-ups must
// not require EUR/CAD consultation mappings (or their SQL schema).
function squareMerchantConfig(env) {
  const production = env.VERCEL_ENV === 'production'
  const sandbox = env.HH_SQUARE_API_MODE === 'sandbox'
  const modeAllowed = production ? env.HH_SQUARE_API_MODE === 'production' &&
    env.HH_SQUARE_API_PRODUCTION_APPROVED === 'true' : sandbox
  const token = env.HH_SQUARE_API_TOKEN || ''
  const merchantId = env.HH_SQUARE_MERCHANT_ID || ''
  const locationId = env.HH_SQUARE_LOCATION_ID || ''
  const webhookKey = env.HH_SQUARE_WEBHOOK_SIGNATURE_KEY || ''
  const webhookUrl = env.HH_SQUARE_WEBHOOK_URL || (production ? LIVE_WEBHOOK : '')
  let urlOk = false
  try {
    const url = new URL(webhookUrl)
    urlOk = url.protocol === 'https:' && url.username === '' && url.password === '' &&
      url.search === '' && url.hash === '' && url.pathname === '/api/payments/square/webhook' &&
      (production ? webhookUrl === LIVE_WEBHOOK : url.hostname.endsWith('.vercel.app'))
  } catch { /* fail closed */ }
  const enabled = env.HH_SQUARE_API_ENABLED === 'true' && modeAllowed &&
    env.HH_SQUARE_INDIVIDUAL_PAYEE_APPROVED === 'true' &&
    env.HH_SQUARE_TAX_REVIEW_APPROVED === 'true' &&
    env.HH_SQUARE_REFUND_TERMS_APPROVED === 'true' &&
    /^[A-Za-z0-9_-]{20,250}$/.test(token) &&
    /^[A-Z0-9]{7,80}$/.test(merchantId) &&
    /^[A-Z0-9]{7,80}$/.test(locationId) &&
    webhookKey.length >= 20 && webhookKey.length <= 256 && urlOk
  return {
    enabled: Boolean(enabled),
    environment: /** @type {'production' | 'sandbox'} */ (production ? 'production' : 'sandbox'),
    token, merchantId, locationId, webhookKey, webhookUrl,
    apiOrigin: production ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com',
  }
}

// Original fixed-price service orders remain gated on their OWN approved
// price mapping and schema; wallet-only approval does not activate them.
export function getSquareGatewayConfig(env = process.env) {
  const merchant = squareMerchantConfig(env)
  const prices = {}
  let priceOk = true
  for (const [eur, key] of MONEY_ROWS) {
    const value = env[key]
    if (typeof value !== 'string' || !/^[1-9][0-9]{2,7}$/.test(value)) priceOk = false
    else prices[eur] = Number(value)
  }
  const increasing = priceOk && prices[5000] < prices[10000] && prices[10000] < prices[15000]
  return Object.freeze({
    ...merchant,
    enabled: merchant.enabled &&
      env.HH_SQUARE_API_SCHEMA_APPROVED === 'true' &&
      env.HH_SQUARE_CAD_AMOUNTS_APPROVED === 'true' && increasing,
    prices: Object.freeze(prices),
  })
}

// Dynamic CAD wallet payments have independent merchant and prepaid-credit
// approval gates. No fixed-price consultation catalogue is consulted.
export function getSquareWalletGatewayConfig(env = process.env) {
  const merchant = squareMerchantConfig(env)
  return Object.freeze({
    ...merchant,
    enabled: merchant.enabled &&
      env.HH_WALLET_ENABLED === 'true' &&
      env.HH_WALLET_SCHEMA_APPROVED === 'true' &&
      env.HH_WALLET_SQUARE_ENABLED === 'true' &&
      env.HH_WALLET_SQUARE_TERMS_APPROVED === 'true' &&
      env.HH_APP_ENABLED === 'true' &&
      (env.VERCEL_ENV !== 'production' || env.HH_APP_PRODUCTION_APPROVED === 'true'),
  })
}

export function requireSquareGateway(config) {
  if (!config?.enabled) unavailable()
}

export function validateSquareCart(value, config) {
  onlyKeys(value, ['operationId', 'items', 'locale', 'repeatOf'])
  requireUUID(value.operationId)
  if (!['en', 'ru', 'es'].includes(value.locale) ||
    !Array.isArray(value.items) || value.items.length < 1 ||
    value.items.length > SERVICE_PRODUCTS.length ||
    value.items.some(id => typeof id !== 'string') ||
    new Set(value.items).size !== value.items.length) throw new AppError('INVALID_CART', 400)
  const products = value.items.map(id => SERVICE_PRODUCTS.find(row => row.id === id))
  if (products.some(row => !row || row.kind !== 'one_time' || row.currency !== 'EUR'))
    throw new AppError('INVALID_CART', 400)
  const eurMinor = products.reduce((total, row) => total + row.amountMinor, 0)
  const cadMinor = config?.prices?.[eurMinor]
  if (!Number.isSafeInteger(cadMinor) || cadMinor <= 0) unavailable()
  if (value.repeatOf !== undefined && value.repeatOf !== null) requireUUID(value.repeatOf)
  const items = products.map(row => row.id).sort()
  return Object.freeze({
    operationId: value.operationId,
    items, locale: value.locale, eurMinor, cadMinor,
    cartKey: items.join('+'),
    repeatOf: value.repeatOf || null,
  })
}

export function squareCheckoutPayload(order, locationId, siteOrigin) {
  requireUUID(order.id)
  const origin = new URL(siteOrigin)
  if (origin.protocol !== 'https:' || origin.username || origin.password ||
    origin.pathname !== '/' || origin.search || origin.hash ||
    !origin.hostname.endsWith('.vercel.app')) unavailable()
  if (!['en','ru','es'].includes(order.locale) ||
    !Number.isSafeInteger(order.cad_minor) || order.cad_minor < 100) unavailable()
  const path = `/${order.locale}/cart?squareOrder=${encodeURIComponent(order.id)}`
  return {
    idempotency_key: order.id,
    description: 'Holistic House one-time personal session',
    quick_pay: {
      name: 'Holistic House personal consultation',
      price_money: { amount: order.cad_minor, currency: 'CAD' },
      location_id: locationId,
    },
    payment_note: 'HH order ' + order.id,
    checkout_options: {
      allow_tipping: false, ask_for_shipping_address: false,
      enable_coupon: false, enable_loyalty: false,
      redirect_url: origin.origin + path,
    },
  }
}

export async function squareApiRequest(config, method, path, payload = undefined, fetcher = fetch) {
  requireSquareGateway(config)
  if (!/^(\/v2\/online-checkout\/payment-links|\/v2\/payments\/[A-Za-z0-9_-]{1,192}|\/v2\/orders\/[A-Za-z0-9_-]{1,192})$/.test(path)) unavailable()
  let response
  try {
    response = await fetcher(config.apiOrigin + path, {
      method, cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: 'Bearer ' + config.token,
        'Square-Version': VERSION,
        'Content-Type': 'application/json',
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    })
  } catch { unavailable() }
  if (!response?.ok) unavailable()
  try { return await response.json() } catch { unavailable() }
}

export async function createSquarePaymentLink(config, order, origin, fetcher = fetch) {
  const body = squareCheckoutPayload(order, config.locationId, origin)
  const data = await squareApiRequest(config, 'POST', '/v2/online-checkout/payment-links', body, fetcher)
  const link = data?.payment_link
  const url = normalizeSquareCheckoutRedirect(link?.url, config.environment)
  if (!url || !/^[A-Za-z0-9_-]{5,192}$/.test(link?.id || '') ||
    !/^[A-Za-z0-9_-]{5,192}$/.test(link?.order_id || '')) unavailable()
  return Object.freeze({ url, linkId: link.id, squareOrderId: link.order_id })
}

export function squareWebhookValid(rawBody, signature, config) {
  if (!config?.enabled || !Buffer.isBuffer(rawBody) || rawBody.length > 262144 ||
    typeof signature !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false
  const given = Buffer.from(signature, 'base64')
  if (given.length !== 32) return false
  const expected = createHmac('sha256', config.webhookKey).update(config.webhookUrl).update(rawBody).digest()
  return timingSafeEqual(given, expected)
}

export function paymentIdFromSquareEvent(event, config) {
  if (!event || typeof event !== 'object' || event.merchant_id !== config.merchantId ||
    !/^[A-Za-z0-9-]{8,100}$/.test(event.event_id || '')) throw new AppError('SQUARE_WEBHOOK_INVALID', 403)
  if (!['payment.updated', 'payment.created', 'refund.updated', 'refund.created'].includes(event.type)) return null
  const data = event.data?.object
  const id = event.type.startsWith('payment.') ? data?.payment?.id : data?.refund?.payment_id
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{5,192}$/.test(id))
    throw new AppError('SQUARE_WEBHOOK_INVALID', 403)
  return id
}

export function verifiedSquarePaymentSnapshot(payment, expected, config) {
  if (!payment || payment.order_id !== expected.square_order_id ||
    payment.location_id !== config.locationId ||
    payment.amount_money?.currency !== 'CAD' ||
    Number(payment.amount_money?.amount) !== Number(expected.cad_minor) ||
    !/^[A-Za-z0-9_-]{5,192}$/.test(payment.id || ''))
    throw new AppError('SQUARE_PAYMENT_MISMATCH', 409)
  const refunded = Number(payment.refunded_money?.amount || 0)
  if (!Number.isSafeInteger(refunded) || refunded < 0 || refunded > Number(expected.cad_minor))
    throw new AppError('SQUARE_PAYMENT_MISMATCH', 409)
  // The Square API readback, not a browser return or an unsigned event, decides status.
  const status = refunded > 0 ? 'payment_review' :
    payment.status === 'COMPLETED' ? 'paid' :
    // Failed attempts must not occupy the single payment ID: buyers may retry card on the same Square checkout.
    'checkout_ready'
  return Object.freeze({ status, refundedMinor: refunded, paymentId: payment.id })
}
