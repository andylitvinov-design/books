import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_BOOKING_COOKIE = 'hh_alchemy_session_booking_v1'
export const SESSION_BOOKING_TTL = 30 * 24 * 60 * 60
export const BOOKABLE_SKUS = Object.freeze({
  'express-consultation-30': 30,
  'personal-session-60': 60,
})
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const hmac = (data, key) => createHmac('sha256', key)
  .update('hh-alchemy-booking:1:' + data).digest('base64url')

export function isAlchemyBooking(input) {
  return Boolean(input && Object.hasOwn(BOOKABLE_SKUS, input.bookingSku) &&
    ['en', 'ru', 'es'].includes(input.locale) &&
    input.sourcePath === '/' + input.locale + '/services/alchemy-of-soul' &&
    input.contact && input.contactConsent === true)
}

/** Signed HttpOnly same-browser proof; a public HH reference is not a credential. */
export function signSessionBooking({ id, operationId, createdAt }, config) {
  if (!UUID.test(id || '') || !UUID.test(operationId || '') ||
      !Number.isFinite(createdAt)) throw new Error('INVALID_BOOKING_PROOF')
  const payload = 'v1.' + id.toLowerCase() + '.' + operationId.toLowerCase() +
    '.' + Math.floor(createdAt / 1000)
  const encoded = Buffer.from(payload).toString('base64url')
  return encoded + '.' + hmac(encoded, config.encryptionKey)
}

export function verifySessionBooking(value, config, now = Date.now()) {
  if (typeof value !== 'string' || value.length > 350) return null
  const [encoded, signature, ...rest] = value.split('.')
  if (!encoded || !signature || rest.length ||
      !/^[A-Za-z0-9_-]+$/.test(encoded) ||
      !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null
  const expected = Buffer.from(hmac(encoded, config.encryptionKey))
  const supplied = Buffer.from(signature)
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null
  let parts
  try { parts = Buffer.from(encoded, 'base64url').toString('utf8').split('.') }
  catch { return null }
  if (parts.length !== 4 || parts[0] !== 'v1' || !UUID.test(parts[1]) ||
      !UUID.test(parts[2]) || !/^[0-9]{10}$/.test(parts[3])) return null
  const createdAt = Number(parts[3]) * 1000
  if (createdAt > now + 60000 || now - createdAt > SESSION_BOOKING_TTL * 1000) return null
  return { id: parts[1], operationId: parts[2], createdAt }
}

export function validConfirmedSlot(value, now = Date.now()) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?Z$/.test(value)) return null
  const time = Date.parse(value)
  if (!Number.isFinite(time) || time < now + 5 * 60 * 1000 ||
      time > now + 180 * 24 * 60 * 60 * 1000 ||
      new Date(time).toISOString() !== new Date(value).toISOString()) return null
  return new Date(time).toISOString()
}
