import { CRM_SOURCES } from './workflow.js'
// Pure policy. The caller must authenticate the actor and persist events atomically.
export const CRM_CHANNELS = Object.freeze(['email', 'telegram', 'whatsapp', 'sms'])
export const CRM_PURPOSE = 'product_updates'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const clean = (value, limit = 200) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit && !/[\r\n\u0000]/.test(value)
function fail(code) { throw new Error(code) }

export function validateConsentEvent(event, now = new Date()) {
  if (!event || typeof event !== 'object') fail('INVALID_CONSENT_EVENT')
  const allowed = ['id', 'contactId', 'channel', 'purpose', 'decision', 'occurredAt', 'source', 'textVersion', 'actorKind']
  if (Object.keys(event).some((key) => !allowed.includes(key))) fail('UNEXPECTED_CONSENT_FIELD')
  if (!UUID.test(event.id) || !UUID.test(event.contactId)) fail('INVALID_CONSENT_ID')
  if (!CRM_CHANNELS.includes(event.channel) || event.purpose !== CRM_PURPOSE) fail('INVALID_CONSENT_SCOPE')
  if (!['granted', 'withdrawn'].includes(event.decision)) fail('INVALID_CONSENT_DECISION')
  if (!['contact', 'owner_recorded'].includes(event.actorKind)) fail('INVALID_CONSENT_ACTOR')
  if (!clean(event.source) || !clean(event.textVersion, 80)) fail('CONSENT_EVIDENCE_REQUIRED')
  const occurredAt = Date.parse(event.occurredAt)
  if (!Number.isFinite(occurredAt) || occurredAt > new Date(now).getTime()) fail('INVALID_CONSENT_TIME')
  return { ...event, occurredAt: new Date(occurredAt).toISOString() }
}

export function marketingEligibility({ contactId, channel, events = [], suppressed = false, verifiedAddress = false }, now = new Date()) {
  if (!UUID.test(contactId) || !CRM_CHANNELS.includes(channel)) return { allowed: false, reason: 'invalid_scope' }
  if (suppressed) return { allowed: false, reason: 'suppressed' }
  if (!verifiedAddress) return { allowed: false, reason: 'unverified_address' }
  const scoped = []
  for (const raw of events) {
    if (raw?.contactId !== contactId || raw?.channel !== channel || raw?.purpose !== CRM_PURPOSE) continue
    try { scoped.push(validateConsentEvent(raw, now)) } catch { return { allowed: false, reason: 'invalid_evidence' } }
  }
  // Equal-time withdrawal wins. Arrival order never re-enables a withdrawn contact.
  scoped.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || Number(b.decision === 'withdrawn') - Number(a.decision === 'withdrawn'))
  const latest = scoped[0]
  if (!latest || latest.decision !== 'granted') return { allowed: false, reason: latest ? 'withdrawn' : 'no_explicit_consent' }
  return { allowed: true, reason: 'explicit_consent', consentEventId: latest.id }
}

export function validateContactInput(input) {
  if (!input || typeof input !== 'object') fail('INVALID_CONTACT')
  const allowed = ['displayName', 'email', 'phone', 'locale', 'lifecycle', 'source']
  if (Object.keys(input).some((key) => !allowed.includes(key))) fail('UNEXPECTED_CONTACT_FIELD')
  if (!clean(input.displayName, 120)) fail('INVALID_DISPLAY_NAME')
  const email = input.email === undefined ? '' : input.email
  const phoneRaw = input.phone === undefined ? '' : input.phone
  if (typeof email !== 'string' || email.length > 254 ||
      (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) fail('INVALID_EMAIL')
  if (typeof phoneRaw !== 'string' || phoneRaw.length > 40 ||
      /[\r\n\u0000]/.test(phoneRaw)) fail('INVALID_PHONE')
  const phone = phoneRaw.replace(/[\s().-]/g,'')
  if (phone && !/^\+[1-9][0-9]{7,14}$/.test(phone)) fail('INVALID_PHONE')
  if (!email.trim() && !phone) fail('CONTACT_CHANNEL_REQUIRED')
  if (!['en', 'ru', 'es'].includes(input.locale)) fail('INVALID_LOCALE')
  if (!['lead', 'client', 'archived'].includes(input.lifecycle)) fail('INVALID_LIFECYCLE')
  const source = input.source ?? 'manual'
  if (!CRM_SOURCES.includes(source)) fail('INVALID_CONTACT_SOURCE')
  return { displayName: input.displayName.trim(), email: email.trim().toLowerCase(), phone, locale: input.locale, lifecycle: input.lifecycle, source }
}
