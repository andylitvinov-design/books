import 'server-only'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { practitionerEmailAllowed } from '../app/practitioner-access.js'
import { getPrescriptionStore } from './store.js'

export const adminCookieName = 'prescriptions_admin'
// Keep owner credentials off public site requests while authorizing /api/admin.
export const adminApiCookieName = 'prescriptions_admin_api'
export const adminSessionOptions = Object.freeze({
  httpOnly: true,
  sameSite: 'strict',
  secure: true,
  path: '/admin',
  maxAge: 60 * 60 * 12,
})
export const adminApiSessionOptions = Object.freeze({ ...adminSessionOptions, path: '/api/admin' })

function sessionDigest(token) {
  if (typeof token !== 'string' || !/^v2\.[A-Za-z0-9_-]{43}$/.test(token)) return undefined
  return createHash('sha256').update(`prescriptions-admin-session-v2\0${token}`).digest('hex')
}
function credentialVersion(environment) {
  const credential = environment.PRESCRIPTIONS_ADMIN_TOKEN || environment.PRESCRIPTIONS_ADMIN_PIN
  if (!credential) return undefined
  // Changing either configured credential invalidates all existing admin sessions.
  return createHmac('sha256', credential).update(JSON.stringify([
    'prescriptions-admin-credential-v2', environment.PRESCRIPTIONS_ADMIN_TOKEN || '', environment.PRESCRIPTIONS_ADMIN_PIN || '',
  ])).digest('hex')
}
function equal(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const a = Buffer.from(left), b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}
function currentOwner(actor, nowMs) {
  return practitionerEmailAllowed(actor) && typeof actor?.id === 'string' &&
    typeof actor?.claims?.session_id === 'string' && Number.isSafeInteger(actor?.claims?.exp) &&
    actor.claims.exp * 1000 > nowMs
}

// Only the verified practitioner bridge issues sessions; possession of an old
// admin cookie or knowledge of a credential can never create a new session.
export async function issueTrustedAdminSession(response, {
  actor, environment = process.env, secure = true, store = getPrescriptionStore(), nowMs = Date.now(),
} = {}) {
  const version = credentialVersion(environment)
  if (!version || !store || !currentOwner(actor, nowMs)) return false
  const token = `v2.${randomBytes(32).toString('base64url')}`
  const session = {
    digest: sessionDigest(token),
    // Reuse the existing session store's persisted shape with a separate digest domain.
    recordId: actor.id,
    selector: actor.claims.session_id,
    accessVersion: version,
    expiresAt: nowMs + adminSessionOptions.maxAge * 1000,
  }
  await store.createAccessSession(session, adminSessionOptions.maxAge)
  response.cookies.set(adminCookieName, token, { ...adminSessionOptions, secure })
  response.cookies.set(adminApiCookieName, token, { ...adminApiSessionOptions, secure })
  return true
}

export async function authorizeAdminSession({ token, auth, repository, store, environment = process.env, nowMs = Date.now() }) {
  const digest = sessionDigest(token), version = credentialVersion(environment)
  if (!digest || !version || !store) return undefined
  try {
    const session = await store.findAccessSession(digest)
    if (!session || !Number.isSafeInteger(session.expiresAt) || session.expiresAt <= nowMs ||
      !equal(session.accessVersion, version)) return undefined
    const actor = await auth.verified()
    if (!currentOwner(actor, Math.max(nowMs, Date.now())) || session.recordId !== actor.id ||
      session.selector !== actor.claims.session_id || !await repository.isPractitioner(actor)) return undefined
    // Authentication/database checks may await remote services. Recheck revocation
    // afterward so logout during those checks cannot revive an in-flight session.
    const current = await store.findAccessSession(digest)
    if (!current || current.expiresAt <= Math.max(nowMs, Date.now()) ||
      current.recordId !== session.recordId || current.selector !== session.selector ||
      current.expiresAt !== session.expiresAt || !equal(current.accessVersion, version)) return undefined
    return { actor, session: current, token }
  } catch {
    // Auth, account, database and session-store outages deny protected requests.
    return undefined
  }
}

export async function revokeAdminSessions({ tokens, store }) {
  const digests = [...new Set(tokens.map(sessionDigest).filter(Boolean))]
  if (!digests.length) return
  if (!store) throw new Error('Admin session revocation unavailable')
  // A failed store operation must reach logout's caller; do not claim revocation.
  const results = await Promise.allSettled(digests.map(digest => store.deleteAccessSession(digest)))
  if (results.some(result => result.status === 'rejected')) throw new Error('Admin session revocation unavailable')
}
