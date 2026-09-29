import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { cookies, headers } from 'next/headers'

import { createLoginRateLimiter } from '@/lib/security/login-rate-limit'

const cookieName = 'prescriptions_admin'
const sessionOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: true,
  path: '/admin',
  // A 12-hour working session limits exposure on a shared practitioner device.
  maxAge: 60 * 60 * 12,
}

// Five failed attempts per 10 minutes per anonymous IP hash, with a small
// instance-wide guard. Vercel instances do not share memory, so this complements
// (rather than replaces) platform-level edge protection.
const loginLimiter = createLoginRateLimiter({ maxAttempts: 5, windowMs: 10 * 60_000, globalMaxAttempts: 50 })

async function loginAttemptBucket() {
  const source = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  return createHash('sha256').update(source).digest('base64url').slice(0, 32)
}

function equal(left, right) {
  const leftBuffer = Buffer.from(left ?? '')
  const rightBuffer = Buffer.from(right ?? '')
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function signature(token) {
  return createHmac('sha256', token).update('prescriptions-admin-v1').digest('base64url')
}

function configuredCredentials(environment = process.env) {
  return [environment.PRESCRIPTIONS_ADMIN_PIN, environment.PRESCRIPTIONS_ADMIN_TOKEN].filter(Boolean)
}

export async function requireAdminRequest() {
  const credentials = configuredCredentials()
  if (credentials.length === 0) return false
  const session = (await cookies()).get(cookieName)?.value
  return credentials.some((credential) => equal(session, signature(credential)))
}

export async function establishAdminSession(accessCode) {
  const bucket = await loginAttemptBucket()
  if (!loginLimiter.canAttempt(bucket)) return false
  const credential = configuredCredentials().find((configured) => equal(accessCode, configured))
  if (!credential) {
    loginLimiter.recordFailure(bucket)
    return false
  }
  loginLimiter.recordSuccess(bucket)
  ;(await cookies()).set(cookieName, signature(credential), sessionOptions)
  return true
}

export async function clearAdminSession() {
  ;(await cookies()).set(cookieName, '', { ...sessionOptions, maxAge: 0 })
}
