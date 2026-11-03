import { AppError, onlyKeys, requireTimezone } from '../assessments/contracts.js'

export const NOTIFICATION_CONSENT_VERSION = 'course-push-v1'
export const NOTIFICATION_LOCALES = Object.freeze(['en', 'ru', 'es'])
export function defaultNotificationPreferences(timezone = 'UTC', locale = 'en') {
  return { enabled: false, timezone: requireTimezone(timezone), locale: NOTIFICATION_LOCALES.includes(locale) ? locale : 'en', dailyAt: '10:00', quietHoursEnabled: true, quietStart: '21:00', quietEnd: '09:00' }
}
const invalid = () => { throw new AppError('NOTIFICATION_INPUT_INVALID', 400) }
export function minuteOfDay(value) {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) invalid()
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
}
export function inQuietHours(minute, preferences) {
  if (!preferences.quietHoursEnabled) return false
  const start = minuteOfDay(preferences.quietStart), end = minuteOfDay(preferences.quietEnd)
  return start < end ? minute >= start && minute < end : minute >= start || minute < end
}
export function validateNotificationPreferences(input) {
  onlyKeys(input, ['enabled', 'timezone', 'locale', 'dailyAt', 'quietHoursEnabled', 'quietStart', 'quietEnd'])
  if (typeof input.enabled !== 'boolean' || typeof input.quietHoursEnabled !== 'boolean' || !NOTIFICATION_LOCALES.includes(input.locale)) invalid()
  if (typeof input.timezone !== 'string' || !/^[A-Za-z][A-Za-z0-9_+.-]*(?:\/[A-Za-z0-9_+.-]+)*$/.test(input.timezone)) invalid()
  const timezone = requireTimezone(input.timezone)
  for (const key of ['dailyAt', 'quietStart', 'quietEnd']) minuteOfDay(input[key])
  if (input.quietHoursEnabled && (input.quietStart === input.quietEnd || inQuietHours(minuteOfDay(input.dailyAt), input)))
    throw new AppError('REMINDER_WITHIN_QUIET_HOURS', 400)
  return { enabled: input.enabled, timezone, locale: input.locale, dailyAt: input.dailyAt, quietHoursEnabled: input.quietHoursEnabled, quietStart: input.quietStart, quietEnd: input.quietEnd }
}
export function validateNotificationPatch(input, existing) {
  onlyKeys(input, ['enabled', 'timezone', 'locale', 'dailyAt', 'quietHoursEnabled', 'quietStart', 'quietEnd'])
  // Enabling requires an explicit device registration and current consent.
  if (input.enabled === true) throw new AppError('PUSH_OPT_IN_REQUIRED', 400)
  return validateNotificationPreferences({ ...existing, ...input })
}
export function validatePushEndpoint(value) {
  if (typeof value !== 'string' || value.length > 4096) invalid()
  let url
  try { url = new URL(value) } catch { invalid() }
  const host = url.hostname.toLowerCase()
  const approved = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' || host === 'push.apple.com' || host.endsWith('.push.apple.com')
  if (url.protocol !== 'https:' || !approved || url.username || url.password || url.port || url.hash || url.pathname === '/') invalid()
  return url.href
}
function pushKey(value, length) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+={0,2}$/.test(value) || value.length > 100) invalid()
  const bytes = Buffer.from(value, 'base64url')
  if (bytes.length !== length || (length === 65 && bytes[0] !== 4)) invalid()
  return bytes.toString('base64url')
}
export function validatePushSubscription(input) {
  onlyKeys(input, ['endpoint', 'keys', 'expirationTime'])
  onlyKeys(input.keys, ['p256dh', 'auth'])
  if (input.expirationTime != null && (!Number.isSafeInteger(input.expirationTime) || input.expirationTime <= 0)) invalid()
  return { endpoint: validatePushEndpoint(input.endpoint), keys: { p256dh: pushKey(input.keys.p256dh, 65), auth: pushKey(input.keys.auth, 16) }, expirationTime: input.expirationTime ?? null }
}
