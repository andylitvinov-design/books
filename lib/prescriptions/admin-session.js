import 'server-only'
import { createHmac } from 'node:crypto'

export const adminCookieName = 'prescriptions_admin'
export const adminSessionOptions = Object.freeze({
  httpOnly: true,
  sameSite: 'strict',
  secure: true,
  path: '/admin',
  maxAge: 60 * 60 * 12,
})

export function adminSessionSignature(token) {
  return createHmac('sha256', token).update('prescriptions-admin-v1').digest('base64url')
}

export function issueTrustedAdminSession(response, { environment = process.env, secure = true } = {}) {
  const credential = environment.PRESCRIPTIONS_ADMIN_TOKEN || environment.PRESCRIPTIONS_ADMIN_PIN
  if (!credential) return false
  response.cookies.set(adminCookieName, adminSessionSignature(credential), {
    ...adminSessionOptions,
    secure,
  })
  return true
}
