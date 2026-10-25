import 'server-only'
import { PRACTITIONER_ID } from '../../data/app-services.js'

// Transactional booking notices are distinct from CRM marketing messages.
// Only the approved site's own master can be mailed until other masters
// have a separate, verified per-practitioner email destination.
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PRACTICE_URL = 'https://holistichouse.vercel.app/en/app/practice?panel=requests'

export function bookingMasterEmailConfig(env = process.env) {
  if (env.HH_BOOKING_EMAIL_ENABLED !== 'true') return null
  if (env.VERCEL_ENV === 'production' &&
      env.HH_BOOKING_EMAIL_PRODUCTION_APPROVED !== 'true') return null
  const apiKey = String(env.HH_BOOKING_RESEND_API_KEY || '')
  const from = String(env.HH_BOOKING_FROM_EMAIL || '').trim().toLowerCase()
  const to = String(env.HH_PRACTITIONER_OWNER_EMAIL || '').trim().toLowerCase()
  const verifiedDomain = String(env.HH_BOOKING_VERIFIED_DOMAIN || '').trim().toLowerCase()
  if (!apiKey.startsWith('re_') || apiKey.length < 12 ||
      env.HH_BOOKING_SENDER_VERIFIED !== 'true' ||
      !EMAIL.test(from) || !EMAIL.test(to) || !verifiedDomain ||
      from.split('@')[1] !== verifiedDomain ||
      ['gmail.com','outlook.com','resend.dev','vercel.app'].includes(verifiedDomain) ||
      verifiedDomain.endsWith('.vercel.app')) return null
  return { apiKey, from, to }
}

/** The email contains no client free-text, contact information or personal goal.
 * The DB-verified practitioner ID prevents another master's enquiry being
 * silently forwarded to the owner when a multi-master catalogue grows.
 */
export async function sendBookingMasterEmail(
  { requestId, revision, practitionerId, event = 'update' },
  env = process.env,
  fetcher = fetch,
) {
  const mail = bookingMasterEmailConfig(env)
  if (!mail) return { attempted: false, reason: 'not_configured' }
  if (practitionerId !== PRACTITIONER_ID)
    return { attempted: false, reason: 'other_practitioner' }
  if (!UUID.test(String(requestId || '')) ||
      !Number.isSafeInteger(revision) || revision < 0 || revision > 100000 ||
      !['new', 'update'].includes(event))
    throw new Error('BOOKING_EMAIL_INVALID_EVENT')
  const first = event === 'new'
  const subject = first
    ? 'New energy support booking request · Holistic House'
    : 'Energy support booking updated · Holistic House'
  const text = [
    first ? 'A new booking request is waiting for your response.' :
      'A client has responded to a booking proposal.',
    '',
    'Open My Practice to review the request and confirm the time or propose another slot:',
    PRACTICE_URL,
    '',
    'This notification does not include private goals, contact details, messages or photos.',
  ].join('\n')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + mail.apiKey,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'hh-booking-' + requestId + '-r' + revision,
      },
      signal: controller.signal,
      body: JSON.stringify({
        from: 'Holistic House <' + mail.from + '>',
        to: [mail.to],
        reply_to: mail.from,
        subject,
        text,
      }),
    })
    const receipt = await response.json().catch(() => ({}))
    if (!response.ok || typeof receipt.id !== 'string' ||
        receipt.id.length < 1 || receipt.id.length > 120)
      throw new Error('BOOKING_EMAIL_DELIVERY_UNCONFIRMED')
    return { attempted: true, accepted: true }
  } catch {
    // Network timeouts can happen after provider acceptance. Never retry
    // blindly and risk duplicating messages. The portal remains authoritative.
    throw new Error('BOOKING_EMAIL_DELIVERY_UNCONFIRMED')
  } finally {
    clearTimeout(timer)
  }
}
