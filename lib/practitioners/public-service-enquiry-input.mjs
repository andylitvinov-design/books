import { safePublicWhatsAppPath } from '../whatsapp-enquiry.js'
import { validateContactInput } from '../crm/consent.js'

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const safeText = (value, limit) =>
  typeof value === 'string' && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) && value.trim().length <= limit
    ? value.trim() : ''

/**
 * Contact consent is for a reply to this one enquiry, never marketing.
 * A legacy enquiry without a contact remains readable, but all new public
 * registration forms send a validated contact and explicit reply consent.
 */
export function normalizePublicServiceEnquiry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_REQUEST')
  const permitted = new Set(['operationId', 'serviceTitle', 'description', 'sourcePath', 'locale', 'contact', 'contactConsent', 'website'])
  if (Object.keys(value).some(key => !permitted.has(key))) throw new Error('INVALID_REQUEST')
  if (!UUID.test(value.operationId || '')) throw new Error('INVALID_OPERATION_ID')
  const serviceTitle = safeText(value.serviceTitle, 160)
  const description = safeText(value.description, 1400)
  const sourcePath = safePublicWhatsAppPath(value.sourcePath)
  const locale = ['en', 'ru', 'es'].includes(value.locale) ? value.locale : ''
  if (!serviceTitle || description.length < 10 || !sourcePath || sourcePath !== value.sourcePath || !locale) throw new Error('INVALID_REQUEST')
  // A hidden anti-spam field is never persisted, even when blank.
  if (value.website !== undefined && (typeof value.website !== 'string' || value.website.trim())) throw new Error('INVALID_REQUEST')

  let contact
  if (value.contact !== undefined) {
    if (value.contactConsent !== true || !value.contact || typeof value.contact !== 'object' ||
        Array.isArray(value.contact) ||
        Object.keys(value.contact).some(key => !['displayName','email','phone'].includes(key))) {
      throw new Error('CONSENT_OR_CONTACT_REQUIRED')
    }
    const source = /^\/(?:en|ru|es)\/(?:academy|courses|training)(?:\/|$)/.test(sourcePath)
      ? 'academy' : 'website'
    try {
      const parsed = validateContactInput({
        displayName: value.contact.displayName, email: value.contact.email || '',
        phone: value.contact.phone || '', locale, lifecycle: 'lead', source,
      })
      if (parsed.displayName.length < 2) throw new Error('INVALID_NAME')
      contact = { displayName: parsed.displayName, email: parsed.email, phone: parsed.phone, source }
    } catch { throw new Error('INVALID_CONTACT') }
  } else if (value.contactConsent !== undefined) {
    throw new Error('CONSENT_OR_CONTACT_REQUIRED')
  }
  return {
    operationId: value.operationId.toLowerCase(), serviceTitle, description, sourcePath, locale,
    ...(contact ? { contact, contactConsent: true } : {}),
  }
}

/** Reference is a non-secret correlation label, not proof of client identity. */
export function publicEnquiryReference(id) {
  if (!UUID.test(id || '')) throw new Error('INVALID_OPERATION_ID')
  return 'HH-' + id.replace(/-/g, '').slice(0, 12).toUpperCase()
}
