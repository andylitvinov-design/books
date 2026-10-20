import { safePublicWhatsAppPath } from '../whatsapp-enquiry.js'

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const safeText = (value, limit) =>
  typeof value === 'string' && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) && value.trim().length <= limit
    ? value.trim() : ''

/** Keep requests confidential: never put the description in an event, path, cookie or tracking URL. */
export function normalizePublicServiceEnquiry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_REQUEST')
  const permitted = new Set(['operationId', 'serviceTitle', 'description', 'sourcePath', 'locale'])
  if (Object.keys(value).some(key => !permitted.has(key))) throw new Error('INVALID_REQUEST')
  if (!UUID.test(value.operationId || '')) throw new Error('INVALID_OPERATION_ID')
  const serviceTitle = safeText(value.serviceTitle, 160)
  const description = safeText(value.description, 1400)
  const sourcePath = safePublicWhatsAppPath(value.sourcePath)
  const locale = ['en', 'ru', 'es'].includes(value.locale) ? value.locale : ''
  if (!serviceTitle || description.length < 10 || !sourcePath || sourcePath !== value.sourcePath || !locale) throw new Error('INVALID_REQUEST')
  return { operationId: value.operationId.toLowerCase(), serviceTitle, description, sourcePath, locale }
}

/** Reference is a non-secret correlation label, not proof of client identity. */
export function publicEnquiryReference(id) {
  if (!UUID.test(id || '')) throw new Error('INVALID_OPERATION_ID')
  return 'HH-' + id.replace(/-/g, '').slice(0, 12).toUpperCase()
}
