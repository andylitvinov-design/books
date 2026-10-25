import { createHmac, timingSafeEqual } from 'node:crypto'

const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
export const FREE_EXPRESS_COOKIE = 'hh_free_express_v2'
export const FREE_EXPRESS_TTL_SECONDS = 3600
export const FREE_EXPRESS_SERVICE = Object.freeze({
  en: 'Free personal express review',
  ru: 'Бесплатная личная экспресс-диагностика',
  es: 'Revisión personal exprés gratuita',
})
export const FREE_EXPRESS_CONTEXT_MARK = '\n\n--- Holistic House · free express details (visitor consent) ---\n'
export const FREE_EXPRESS_MEDIA_BUCKET = 'hh-client-private-media'
const MAX_SKEW = 60

export function isFreeExpressRequest(value) {
  return value && ['en', 'ru', 'es'].includes(value.locale)
    && value.sourcePath === '/' + value.locale + '/services/free-situation-review'
    && value.serviceTitle === FREE_EXPRESS_SERVICE[value.locale]
    && value.contactConsent === true && value.contact
}
const mac = (payload, key) => createHmac('sha256', key)
  .update('hh-free-express-continuation:2:' + payload).digest('base64url')

/** The public HH receipt is deliberately NOT a bearer credential. */
export function createFreeExpressToken({ id, operationId, createdAt }, config) {
  if (!ID.test(id || '') || !ID.test(operationId || '') || !Number.isFinite(createdAt))
    throw new Error('INVALID_CONTINUATION')
  const payload = 'v2.' + id.toLowerCase() + '.' + operationId.toLowerCase()
    + '.' + Math.floor(createdAt / 1000)
  const encoded = Buffer.from(payload).toString('base64url')
  return encoded + '.' + mac(encoded, config.encryptionKey)
}
export function verifyFreeExpressToken(token, config, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 350) return null
  const [encoded, signature, ...rest] = token.split('.')
  if (!encoded || !signature || rest.length || !/^[A-Za-z0-9_-]+$/.test(encoded)
    || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null
  const expected = Buffer.from(mac(encoded, config.encryptionKey))
  const received = Buffer.from(signature)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null
  let parts
  try { parts = Buffer.from(encoded, 'base64url').toString('utf8').split('.') }
  catch { return null }
  if (parts.length !== 4 || parts[0] !== 'v2' || !ID.test(parts[1])
    || !ID.test(parts[2]) || !/^[0-9]{10}$/.test(parts[3])) return null
  const createdAt = Number(parts[3]) * 1000
  if (createdAt > now + MAX_SKEW * 1000 || now - createdAt > FREE_EXPRESS_TTL_SECONDS * 1000)
    return null
  return { id: parts[1], operationId: parts[2], createdAt }
}
export function freeExpressMediaPath(id, kind) {
  if (!ID.test(id || '') || !['portrait', 'drawing'].includes(kind))
    throw new Error('INVALID_FREE_EXPRESS_MEDIA')
  return 'free-express/' + id.toLowerCase() + '/' + kind + '.jpg'
}
