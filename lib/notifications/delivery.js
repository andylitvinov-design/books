import { validateNotificationPreferences, minuteOfDay, inQuietHours } from './contracts.js'

export function localNotificationTime(now, timezone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now)).map(part => [part.type, part.value]))
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) }
}
// Pure planning only. No transport, scheduler, credentials, or side effects.
// Entitlement and account/course status must be read server-side again when sending.
export function notificationDeliveryDecision({ preferences, entitlementActive, accountActive, courseActive, deviceActive, consentVersion, now, lastAcceptedLocalDay = null }) {
  const settings = validateNotificationPreferences(preferences)
  if (!settings.enabled || consentVersion !== 'course-push-v1') return { due: false, reason: 'not-opted-in' }
  if (!accountActive || !courseActive || !entitlementActive || !deviceActive) return { due: false, reason: 'not-eligible' }
  const local = localNotificationTime(now, settings.timezone)
  if (inQuietHours(local.minute, settings)) return { due: false, reason: 'quiet-hours' }
  if (lastAcceptedLocalDay === local.day) return { due: false, reason: 'already-accepted' }
  const scheduled = minuteOfDay(settings.dailyAt)
  // No catch-up burst. A missed hour is skipped; DST repeated hour is deduplicated by local day.
  if (local.minute < scheduled || local.minute >= scheduled + 60) return { due: false, reason: 'outside-window' }
  return { due: true, localDay: local.day, kind: 'course-reminder', locale: settings.locale, ttlSeconds: 300 }
}
export function privateNotificationPayload(locale = 'en') {
  return { version: 1, kind: 'course-reminder', locale: ['en', 'ru', 'es'].includes(locale) ? locale : 'en' }
}
export function pushResponseDisposition(status) {
  if (status === 404 || status === 410) return 'revoke-device'
  if (status >= 200 && status < 300) return 'accepted-not-delivered'
  if (status === 429 || status >= 500) return 'bounded-retry-within-window'
  return 'stop-and-review'
}
