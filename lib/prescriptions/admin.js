import { createHmac, timingSafeEqual } from 'node:crypto'

import { cookies } from 'next/headers'

const cookieName = 'prescriptions_admin'

function equal(left, right) {
  const leftBuffer = Buffer.from(left ?? '')
  const rightBuffer = Buffer.from(right ?? '')
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function signature(token) {
  return createHmac('sha256', token).update('prescriptions-admin-v1').digest('base64url')
}

export async function requireAdminRequest() {
  const token = process.env.PRESCRIPTIONS_ADMIN_TOKEN
  if (!token) return false
  const session = (await cookies()).get(cookieName)?.value
  return equal(session, signature(token))
}

export async function establishAdminSession(token) {
  const configuredToken = process.env.PRESCRIPTIONS_ADMIN_TOKEN
  if (!configuredToken || !equal(token, configuredToken)) return false
  ;(await cookies()).set(cookieName, signature(configuredToken), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: 60 * 60 * 8,
  })
  return true
}

export async function clearAdminSession() {
  ;(await cookies()).delete(cookieName)
}
