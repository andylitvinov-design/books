import { timingSafeEqual } from 'node:crypto'
import { operationHash } from '../app/crypto.js'

export const REIKI_CONSENT_COOKIE = 'hh-reiki-course-consent'
export const REIKI_CONSENT_SECONDS = 15 * 60

// Only a random flow ID travels through OAuth. After verified PKCE exchange,
// replace the initial proof with one scoped to the authenticated account.
export function reikiConsentProof(flow, account, config, now = Date.now()) {
  const expires = now + REIKI_CONSENT_SECONDS * 1000
  return expires + '.' + operationHash(['reiki-messenger-consent-v1', flow, account, expires], config)
}

export function validReikiConsent(proof, flow, account, config, now = Date.now()) {
  if (typeof proof !== 'string' || !/^\d{13}\.[0-9a-f]{64}$/.test(proof) ||
      typeof flow !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(flow)) return false
  const [value, signature] = proof.split('.')
  const expires = Number(value)
  if (expires <= now || expires > now + REIKI_CONSENT_SECONDS * 1000) return false
  const expected = operationHash(['reiki-messenger-consent-v1', flow, account, expires], config)
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export function reikiConsentCookieOptions(config, maxAge = REIKI_CONSENT_SECONDS) {
  return { httpOnly: true, secure: !config.test, sameSite: 'lax', path: '/api/app', maxAge }
}
