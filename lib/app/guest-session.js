import 'server-only'
import { createHash, randomBytes, randomUUID } from 'node:crypto'

export const guestTtlSeconds = 7 * 24 * 60 * 60
export const guestCookieName = (environment = process.env) =>
  environment.NODE_ENV === 'production' ? '__Host-hh_guest' : 'hh_guest_dev'

export function hashCapability(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function createGuestCredential() {
  const id = randomUUID()
  const secret = randomBytes(32).toString('base64url')
  return { id, secret, secretHash: hashCapability(secret) }
}

export function parseGuestCookie(value) {
  if (typeof value !== 'string' || value.length > 100) return undefined
  const [id, secret, extra] = value.split('.')
  if (
    extra !== undefined ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '') ||
    !/^[A-Za-z0-9_-]{43}$/.test(secret || '')
  )
    return undefined
  return { id, secret, secretHash: hashCapability(secret) }
}

export function setGuestCookie(response, credential, environment = process.env) {
  response.cookies.set(guestCookieName(environment), `${credential.id}.${credential.secret}`, {
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: guestTtlSeconds,
  })
  return response
}

export function clearGuestCookie(response, environment = process.env) {
  response.cookies.set(guestCookieName(environment), '', {
    httpOnly: true,
    secure: environment.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
