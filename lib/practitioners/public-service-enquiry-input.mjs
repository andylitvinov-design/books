import { safePublicWhatsAppPath } from '../whatsapp-enquiry.js'
import { validateContactInput } from '../crm/consent.js'
import { DIAGNOSTIC_SERVICE_TITLES } from '../coaching/diagnostic-enquiry.mjs'

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
  const permitted = new Set(['operationId', 'serviceTitle', 'serviceId', 'serviceOfferingId', 'description', 'sourcePath', 'locale', 'contact', 'contactConsent', 'website'])
  if (Object.keys(value).some(key => !permitted.has(key))) throw new Error('INVALID_REQUEST')
  if (!UUID.test(value.operationId || '')) throw new Error('INVALID_OPERATION_ID')
  // A marketplace target must be a real offering. The server resolves its
  // owner from the database; visitor-supplied names/paths never choose an owner.
  const serviceId = value.serviceId === undefined ? null :
    UUID.test(value.serviceId || '') ? value.serviceId.toLowerCase() : null
  if (value.serviceId !== undefined && !serviceId) throw new Error('INVALID_SERVICE_ID')
  const serviceTitle = safeText(value.serviceTitle, 160)
  const sourcePath = safePublicWhatsAppPath(value.sourcePath)
  // Only an explicitly submitted author questionnaire can use a larger sealed message.
  // Every other public form keeps its existing 1,400-character privacy/abuse cap.
  const diagnostic = /^\/(?:en|ru|es)\/coaching\/intake$/.test(sourcePath) &&
    Object.values(DIAGNOSTIC_SERVICE_TITLES).includes(serviceTitle)
  const descriptionLimit = diagnostic ? 40000 : 1400
  const note = safeText(value.description, descriptionLimit)
  const locale = ['en', 'ru', 'es'].includes(value.locale) ? value.locale : ''
  if (!serviceTitle || !sourcePath || sourcePath !== value.sourcePath || !locale ||
      (value.description !== undefined && (typeof value.description !== 'string' ||
        value.description.trim().length > descriptionLimit ||
        (value.description.trim() && !note)))) throw new Error('INVALID_REQUEST')
  // Keep each existing wire shape intact for the stored operation hash.
  // Addressed channel paths never silently fall back to the legacy practitioner.
  // Classify the addressed namespace independently of the claimed locale and
  // canonical validation below. Malformed/foreign-locale addressed paths must
  // not become a no-ID legacy request. Never decode or rewrite hash input.
  const servicePath = /^\/(?:(?:en|ru|es)\/)?services(?:\/|$)/i.test(sourcePath)
  if (servicePath && /%|\/\//.test(sourcePath)) throw new Error('INVALID_SERVICE_TARGET')
  const websitePath = /^\/(?:(?:en|ru|es)\/)?services\/[^/]+\/[^/]+(?:\/|$)/i.test(sourcePath)
  const telegramPath = /^\/(?:(?:en|ru|es)\/)?services\/telegram-request(?:\/|$)/i.test(sourcePath)
  if ((value.serviceId !== undefined && value.serviceOfferingId !== undefined) ||
      (websitePath && !serviceId) ||
      (telegramPath && value.serviceOfferingId === undefined)) throw new Error('INVALID_SERVICE_TARGET')
  // A service link from Telegram is only a public hint. The backend resolves
  // the published offering and its approved practitioner again at commit time.
  const serviceOfferingId = value.serviceOfferingId
  if (serviceOfferingId !== undefined && (
      !UUID.test(String(serviceOfferingId)) ||
      sourcePath !== `/${locale}/services/telegram-request` ||
      value.contactConsent !== true || !value.contact)) {
    throw new Error('INVALID_SERVICE_OFFERING')
  }
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
      // An email or international phone is enough for a one-off reply.
      // Never pretend a visitor supplied a name when the field is empty.
      const suppliedName = value.contact.displayName
      if (suppliedName !== undefined &&
          (typeof suppliedName !== 'string' || suppliedName.length > 120 ||
            /[\u0000-\u001f\u007f]/.test(suppliedName) ||
            (suppliedName.trim() && suppliedName.trim().length < 2))) throw new Error('INVALID_NAME')
      const fallbackName = locale === 'ru' ? 'Заявка с сайта'
        : locale === 'es' ? 'Solicitud web' : 'Website enquiry'
      const parsed = validateContactInput({
        displayName: suppliedName?.trim() || fallbackName, email: value.contact.email || '',
        phone: value.contact.phone || '', locale, lifecycle: 'lead', source,
      })
      if (parsed.displayName.length < 2) throw new Error('INVALID_NAME')
      contact = { displayName: parsed.displayName, email: parsed.email, phone: parsed.phone, source }
    } catch { throw new Error('INVALID_CONTACT') }
  } else if (value.contactConsent !== undefined) {
    throw new Error('CONSENT_OR_CONTACT_REQUIRED')
  }
  // The marketplace guest route is always an explicit, consented contact
  // request on the canonical public offering page (no private/profile paths).
  if (serviceId && (!contact || !new RegExp('^/' + locale + '/services/[a-z0-9-]{2,80}/[a-z0-9-]{2,80}$').test(sourcePath)))
    throw new Error('CONSENT_OR_CONTACT_REQUIRED')
  // A contact-only registration is enough: visitors should not have to write a
  // personal story to ask about an available course or service. Keep any optional
  // note encrypted in the practitioner's enquiry, never in the CRM contact or URL.
  if (!contact && note.length < 10) throw new Error('INVALID_REQUEST')
  const neutralRequest = locale === 'ru'
    ? 'Прошу связаться со мной по курсу или услуге: ' + serviceTitle + '.'
    : locale === 'es'
      ? 'Solicito información sobre el curso o servicio: ' + serviceTitle + '.'
      : 'Please contact me about the course or service: ' + serviceTitle + '.'
  const description = contact && note.length < 10
    ? neutralRequest + (note ? ' ' + note : '')
    : note
  return {
    operationId: value.operationId.toLowerCase(), ...(serviceId ? { serviceId } : {}), serviceTitle, description, sourcePath, locale,
    ...(serviceOfferingId ? { serviceOfferingId: serviceOfferingId.toLowerCase() } : {}),
    ...(contact ? { contact, contactConsent: true } : {}),
  }
}

/** Reference is a non-secret correlation label, not proof of client identity. */
export function publicEnquiryReference(id) {
  if (!UUID.test(id || '')) throw new Error('INVALID_OPERATION_ID')
  return 'HH-' + id.replace(/-/g, '').slice(0, 12).toUpperCase()
}
