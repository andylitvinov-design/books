import { createHash, timingSafeEqual } from 'node:crypto'
import { AppError, requireUUID } from '../assessments/contracts.js'

// ZEN Checkout signs lower-cased, sorted flattened name=value pairs followed
// immediately by the paywall secret. Never include the signature itself.
export function zenCheckoutSignature(payload, paywallSecret) {
  if (typeof paywallSecret !== 'string' || !paywallSecret) throw new AppError('SERVICE_CHECKOUT_UNAVAILABLE', 503)
  const pairs = []
  function flatten(value, prefix = '') {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((entry, index) => flatten(entry, `${prefix}[${index}]`))
    } else if (typeof value === 'object') {
      for (const key of Object.keys(value)) {
        if (key === 'signature') continue
        flatten(value[key], prefix ? `${prefix}.${key}` : key)
      }
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      pairs.push(`${prefix}=${value}`.toLowerCase())
    } else throw new AppError('SERVICE_PAYMENT_INVALID', 400)
  }
  flatten(payload)
  pairs.sort()
  return createHash('sha256').update(pairs.join('&') + paywallSecret, 'utf8').digest('hex') + ';sha256'
}

export function zenMinorUnits(value) {
  const text = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
  const match = typeof text === 'string' && /^(0|[1-9]\d{0,8})(?:\.(\d{1,2}))?$/.exec(text)
  if (!match) throw new AppError('SERVICE_PROVIDER_MISMATCH', 503)
  const minor = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'))
  if (!Number.isSafeInteger(minor)) throw new AppError('SERVICE_PROVIDER_MISMATCH', 503)
  return minor
}

export function zenDecimal(minor) {
  if (!Number.isSafeInteger(minor) || minor < 0 || minor > 99999999999)
    throw new AppError('SERVICE_PAYMENT_INVALID', 400)
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`
}

export function zenCheckoutReference(orderId) {
  requireUUID(orderId)
  return 'zc_' + orderId.replaceAll('-', '').toLowerCase()
}

// Redirect only to the hosted ZEN.COM checkout. Merchant-provided callback
// URLs belong in the *request*; never trust a URL returned by the browser.
export function zenCheckoutUrl(value, environment = 'live') {
  let url
  try { url = new URL(value) } catch { throw new AppError('SERVICE_PROVIDER_MISMATCH', 503) }
  const host = environment === 'live' ? 'secure.zen.com' : 'secure.zen-test.com'
  if (url.protocol !== 'https:' || url.hostname !== host || url.port || url.username || url.password ||
      !url.pathname.startsWith('/') || url.href.length > 4096)
    throw new AppError('SERVICE_PROVIDER_MISMATCH', 503)
  return url.href
}

// ZEN IPN verification: uppercase SHA256 of merchantTransactionId + currency +
// amount (as *received*) + status + IPN API secret. Only after this can the
// notification trigger an authoritative API readback; IPN state is never paid proof.
export function verifyZenIpnPayload(raw, ipnSecret) {
  if (typeof ipnSecret !== 'string' || !ipnSecret) throw new AppError('SERVICE_CHECKOUT_UNAVAILABLE', 503)
  const bytes = typeof raw === 'string' ? Buffer.from(raw) : raw
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 32768)
    throw new AppError('SERVICE_PAYMENT_INVALID', 400)
  let payload
  try { payload = JSON.parse(bytes.toString('utf8')) } catch { throw new AppError('SERVICE_PAYMENT_INVALID', 400) }
  if (!payload || Array.isArray(payload) || typeof payload !== 'object' ||
      !['TRT_PURCHASE', 'TRT_REFUND'].includes(payload.type) ||
      typeof payload.merchantTransactionId !== 'string' ||
      typeof payload.currency !== 'string' || !/^[A-Z]{3}$/.test(payload.currency) ||
      typeof payload.amount !== 'string' ||
      typeof payload.status !== 'string' || !/^[A-Z_]{3,40}$/.test(payload.status) ||
      typeof payload.hash !== 'string' || !/^[A-Fa-f0-9]{64}$/.test(payload.hash))
    throw new AppError('SERVICE_PAYMENT_INVALID', 400)
  if (payload.type === 'TRT_PURCHASE') requireUUID(payload.merchantTransactionId)
  else {
    // Refunds started in ZEN's merchant portal can have their own, non-UUID
    // reference; link them to the original immutable order ID only.
    if (!/^[!-~]{1,128}$/.test(payload.merchantTransactionId))
      throw new AppError('SERVICE_PAYMENT_INVALID', 400)
    requireUUID(payload.originMerchantTransactionId)
  }
  const amountMinor = zenMinorUnits(payload.amount)
  const expected = createHash('sha256').update(
    payload.merchantTransactionId + payload.currency + payload.amount + payload.status + ipnSecret, 'utf8'
  ).digest('hex')
  const actual = Buffer.from(payload.hash.toLowerCase(), 'hex')
  if (!timingSafeEqual(actual, Buffer.from(expected, 'hex'))) throw new AppError('SERVICE_PAYMENT_INVALID', 400)
  if (payload.type === 'TRT_REFUND') requireUUID(payload.originMerchantTransactionId)
  return Object.freeze({
    id: 'zen_' + createHash('sha256').update(bytes).digest('hex'),
    type: 'zen.' + payload.type.toLowerCase() + '.' + payload.status.toLowerCase(),
    merchantTransactionId: payload.merchantTransactionId,
    originMerchantTransactionId: payload.type === 'TRT_REFUND' ? payload.originMerchantTransactionId : null,
    currency: payload.currency,
    amountMinor,
    status: payload.status,
  })
}
