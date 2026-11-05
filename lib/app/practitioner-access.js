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
  tools: '/admin/tools',
  clients: '/admin/clients',
  report: '/admin/reports/new',
  reports: '/admin/reports',
  consultation: '/admin/consultations/new',
  recommendation: '/admin/prescriptions/new',
  payment: '/admin/payments/new',
  materials: '/admin/materials',
  // Owner-only destinations. No client-provided redirect path is ever accepted.
  growth: '/admin/growth-studio',
  seo: '/admin/seo',
  acquisition: '/admin/acquisition',
  videos: '/admin/videos',
  youtube: '/admin/youtube-upload',
  // Fixed return target for owner Google→admin→YouTube OAuth (never arbitrary URLs).
  youtubeConnect: '/api/admin/telegram-video/youtube/start',
  reikiCourse: '/admin/materials/courses/reiki-practitioner',
  // Existing PIN-protected author folders; opened only after verified owner handoff.
  coachingAudio: '/admin/materials/coaching',
})
