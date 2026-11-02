// A tab-local display receipt, NOT an authorization token or conversion event.
// Real conversions are counted from committed enquiries on the server.
export const RECEIPT_SESSION_KEY = 'hh-service-enquiry-receipt:v1'
export const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000

export function parseEnquiryReceipt(raw, now = Date.now()) {
  let value
  try { value = typeof raw === 'string' ? JSON.parse(raw) : raw }
  catch { return null }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (Object.keys(value).some(key => !['referenceCode', 'createdAt'].includes(key))) return null
  if (typeof value.referenceCode !== 'string' || !/^HH-[A-F0-9]{12}$/.test(value.referenceCode)) return null
  if (!Number.isSafeInteger(value.createdAt) || !Number.isFinite(now)
    || now < value.createdAt || now - value.createdAt > RECEIPT_TTL_MS) return null
  return { referenceCode: value.referenceCode, createdAt: value.createdAt }
}
