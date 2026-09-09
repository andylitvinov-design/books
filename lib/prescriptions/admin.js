import { createHmac, timingSafeEqual } from 'node:crypto'

import { cookies } from 'next/headers'

const cookieName = 'prescriptions_admin'
const sessionOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: true,
  path: '/admin',
  maxAge: 60 * 60 * 24 * 30,
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
  const credential = configuredCredentials().find((configured) => equal(accessCode, configured))
  if (!credential) return false
  ;(await cookies()).set(cookieName, signature(credential), sessionOptions)
  return true
}

export async function clearAdminSession() {
  ;(await cookies()).set(cookieName, '', { ...sessionOptions, maxAge: 0 })
}
