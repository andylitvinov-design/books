import { createHash, timingSafeEqual } from 'node:crypto'

import { cookies, headers } from 'next/headers'

import { createLoginRateLimiter } from '@/lib/security/login-rate-limit'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { adminCookieName, adminSessionOptions, adminSessionSignature } from '@/lib/prescriptions/admin-session'

const cookieName = adminCookieName
const sessionOptions = adminSessionOptions

// Redis-backed stores enforce this across Vercel instances. The in-memory guard
// fails closed only when the store is unavailable, preserving a local baseline.
const loginLimiter = createLoginRateLimiter({ maxAttempts: 5, windowMs: 10 * 60_000, globalMaxAttempts: 50 })

async function loginAttemptBucket() {
  const source = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  return createHash('sha256').update(source).digest('base64url').slice(0, 32)
}

async function consumeLoginAttempt(bucket) {
  const store = getPrescriptionStore()
  if (store?.consumeAccessAttempt) {
    try { return await store.consumeAccessAttempt(`admin:${bucket}`, 5, 10 * 60) } catch { /* fall through to local guard */ }
  }
  if (!loginLimiter.canAttempt(bucket)) return false
  loginLimiter.recordFailure(bucket)
  return true
}

function equal(left, right) {
  const leftBuffer = Buffer.from(left ?? '')
  const rightBuffer = Buffer.from(right ?? '')
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function configuredCredentials(environment = process.env) {
  return [environment.PRESCRIPTIONS_ADMIN_PIN, environment.PRESCRIPTIONS_ADMIN_TOKEN].filter(Boolean)
}

export async function requireAdminRequest() {
  const credentials = configuredCredentials()
  if (credentials.length === 0) return false
  const session = (await cookies()).get(cookieName)?.value
  return credentials.some((credential) => equal(session, adminSessionSignature(credential)))
}

export async function establishAdminSession(accessCode) {
  const bucket = await loginAttemptBucket()
  if (!await consumeLoginAttempt(bucket)) return false
  const credential = configuredCredentials().find((configured) => equal(accessCode, configured))
  if (!credential) return false
  loginLimiter.recordSuccess(bucket)
  ;(await cookies()).set(cookieName, adminSessionSignature(credential), sessionOptions)
  return true
}

export async function clearAdminSession() {
  ;(await cookies()).set(cookieName, '', { ...sessionOptions, maxAge: 0 })
}
