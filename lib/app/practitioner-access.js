import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'

const PRACTITIONER_EMAIL_HASH = '21e4f271e694b4a15ba466421033f55877ffafd5ff9b50b88c93903a64f7990b'

function digest(email) {
  return createHash('sha256').update(String(email || '').trim().toLowerCase()).digest()
}

export function practitionerEmailAllowed(actor) {
  const expected = Buffer.from(PRACTITIONER_EMAIL_HASH, 'hex')
  const actual = digest(actor?.email)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export const practitionerDestination = Object.freeze({
  cabinet: '/admin',
  clients: '/admin/clients',
  consultation: '/admin/consultations/new',
  recommendation: '/admin/prescriptions/new',
  payment: '/admin/payments/new',
})
