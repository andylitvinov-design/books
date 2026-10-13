import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultNotificationPreferences, validateNotificationPreferences, validateNotificationPatch, validatePushSubscription, validatePushEndpoint, inQuietHours } from '../lib/notifications/contracts.js'
import { getNotificationConfig } from '../lib/notifications/config.js'
import { localNotificationTime, notificationDeliveryDecision, privateNotificationPayload, pushResponseDisposition } from '../lib/notifications/delivery.js'
import { detectPushCapability, requestPushPermission, registerDevicePush, endpointFingerprint } from '../lib/notifications/browser.js'
import { NOTIFICATION_COPY } from '../components/pwa/notification-copy.js'
const key = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url')
const subscription = () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/synthetic-fixture', keys: { p256dh: key, auth: Buffer.alloc(16, 1).toString('base64url') }, expirationTime: null })
const prefs = overrides => ({ ...defaultNotificationPreferences('America/Toronto'), enabled: true, ...overrides })
const due = overrides => notificationDeliveryDecision({ preferences: prefs(), entitlementActive: true, accountActive: true, courseActive: true, deviceActive: true, consentVersion: 'course-push-v1', now: '2026-10-13T14:00:00Z', ...overrides })

test('notifications start off, with overnight quiet hours and no invented timezone', () => {
  assert.equal(defaultNotificationPreferences().enabled, false)
  assert.equal(defaultNotificationPreferences().timezone, 'UTC')
  assert.equal(inQuietHours(22 * 60, prefs()), true)
  assert.equal(inQuietHours(8 * 60, prefs()), true)
  assert.equal(inQuietHours(10 * 60, prefs()), false)
})
test('validates strict times, locale, timezone, unknown fields and quiet-hours conflicts', () => {
  for (const value of [{ dailyAt: '25:00' }, { timezone: 'not/a-zone' }, { locale: 'xx' }, { secret: 'health' }, { quietStart: '09:00' }, { dailyAt: '22:00' }]) assert.throws(() => validateNotificationPreferences(prefs(value)))
  assert.equal(validateNotificationPreferences(prefs({ quietHoursEnabled: false, dailyAt: '22:00' })).dailyAt, '22:00')
})
test('PATCH cannot silently opt in; disabling remains available', () => {
  assert.throws(() => validateNotificationPatch({ enabled: true }, prefs()))
  assert.equal(validateNotificationPatch({ enabled: false }, prefs()).enabled, false)
})
test('push endpoints are HTTPS approved providers, never arbitrary fetch destinations', () => {
  for (const endpoint of ['https://web.push.apple.com/fixture', 'https://updates.push.services.mozilla.com/wpush/v2/fixture', subscription().endpoint]) assert.equal(validatePushEndpoint(endpoint), endpoint)
  for (const endpoint of ['http://fcm.googleapis.com/push', 'https://127.0.0.1/push', 'https://fcm.googleapis.com.evil.test/push', 'https://evilpush.apple.com/push', 'https://user@fcm.googleapis.com/push', 'https://fcm.googleapis.com:444/push', 'https://fcm.googleapis.com/push#fragment']) assert.throws(() => validatePushEndpoint(endpoint))
})
test('subscription contract rejects hidden fields and malformed encryption keys', () => {
  assert.deepEqual(validatePushSubscription(subscription()), subscription())
  for (const changes of [{ results: {} }, { keys: { p256dh: key, auth: 'a' } }, { expirationTime: -1 }]) assert.throws(() => validatePushSubscription({ ...subscription(), ...changes }))
})
test('rollout requires explicit flags and valid public key; production needs a separate gate', () => {
  assert.deepEqual(getNotificationConfig({}), { storageAvailable: false, available: false, environment: 'sandbox', publicKey: null, deliveryEnabled: false })
  const env = { HH_COURSE_PUSH_ENABLED: 'true', HH_COURSE_PUSH_STORAGE_APPROVED: 'true', HH_COURSE_PUSH_PUBLIC_KEY: key }
  assert.equal(getNotificationConfig(env).available, true)
  assert.equal(getNotificationConfig({ ...env, VERCEL_ENV: 'production' }).available, false)
  assert.equal(getNotificationConfig({ ...env, VERCEL_ENV: 'production', HH_COURSE_PUSH_ENVIRONMENT: 'live', HH_COURSE_PUSH_PRODUCTION_APPROVED: 'true' }).available, true)
  assert.equal(getNotificationConfig(env).deliveryEnabled, false)
})
test('each eligibility condition independently blocks delivery', () => {
  assert.equal(due().due, true)
  for (const name of ['accountActive', 'courseActive', 'entitlementActive', 'deviceActive']) assert.equal(due({ [name]: false }).due, false)
  assert.equal(due({ consentVersion: 'outdated' }).due, false)
  assert.equal(due({ preferences: prefs({ enabled: false }) }).due, false)
})
test('quiet hours and a bounded due window prevent catch-up bursts', () => {
  assert.equal(due({ now: '2026-10-13T12:00:00Z' }).reason, 'quiet-hours')
  assert.equal(due({ now: '2026-10-13T15:00:00Z' }).reason, 'outside-window')
  assert.equal(due({ lastAcceptedLocalDay: '2026-10-13' }).reason, 'already-accepted')
})
test('timezone and DST are evaluated in local wall time; repeat hour has one local-day key', () => {
  assert.equal(localNotificationTime('2026-11-01T05:30:00Z', 'America/Toronto').minute, 90)
  assert.equal(localNotificationTime('2026-11-01T06:30:00Z', 'America/Toronto').minute, 90)
  assert.equal(localNotificationTime('2026-10-13T23:30:00Z', 'Asia/Tokyo').day, '2026-10-14')
  assert.equal(due({ preferences: prefs({ quietHoursEnabled: false, dailyAt: '01:30' }), now: '2026-11-01T06:30:00Z', lastAcceptedLocalDay: '2026-11-01' }).due, false)
})
test('payload accepts locale only and never imports course or health content', () => {
  assert.deepEqual(privateNotificationPayload({ scores: 'private' }), { version: 1, kind: 'course-reminder', locale: 'en' })
  assert.deepEqual(Object.keys(privateNotificationPayload('ru')).sort(), ['kind', 'locale', 'version'])
})
test('accepted is not delivery; expired endpoints revoke and retries remain bounded', () => {
  assert.equal(pushResponseDisposition(201), 'accepted-not-delivered')
  for (const status of [404, 410]) assert.equal(pushResponseDisposition(status), 'revoke-device')
  assert.equal(pushResponseDisposition(429), 'bounded-retry-within-window')
  assert.equal(pushResponseDisposition(401), 'stop-and-review')
})
function browser(overrides = {}) { return { isSecureContext: true, navigator: { serviceWorker: {}, userAgent: 'Android' }, PushManager: {}, Notification: { permission: 'default', requestPermission: () => Promise.resolve('granted') }, matchMedia: () => ({ matches: false }), ...overrides } }
test('feature detects Android support and iPhone home-screen requirement', () => {
  assert.equal(detectPushCapability(browser()).supported, true)
  const ios = browser({ navigator: { serviceWorker: {}, userAgent: 'iPhone', standalone: false } })
  assert.equal(detectPushCapability(ios).needsInstall, true)
  assert.equal(detectPushCapability(ios).supported, false)
  ios.navigator.standalone = true
  assert.equal(detectPushCapability(ios).supported, true)
  assert.equal(detectPushCapability(browser({ isSecureContext: false })).supported, false)
  assert.equal(detectPushCapability(browser({ PushManager: null })).supported, false)
})
test('iPad desktop UA still gives home-screen guidance', () => {
  assert.equal(detectPushCapability(browser({ navigator: { serviceWorker: {}, userAgent: 'Mac', platform: 'MacIntel', maxTouchPoints: 5 } })).needsInstall, true)
})
test('permission is requested synchronously from action and never re-prompts denied users', async () => {
  let calls = 0
  const sample = browser({ Notification: { permission: 'default', requestPermission() { calls++; return Promise.resolve('granted') } } })
  const result = requestPushPermission(sample)
  assert.equal(calls, 1); assert.equal(await result, 'granted')
  sample.Notification.permission = 'denied'
  assert.equal(await requestPushPermission(sample), 'denied'); assert.equal(calls, 1)
})
test('existing subscription reuse avoids duplicate device creation', async () => {
  let calls = 0
  const existing = { endpoint: subscription().endpoint }
  const registration = { pushManager: { getSubscription: async () => existing, subscribe: async () => { calls++; return existing } } }
  const result = await registerDevicePush(key, registration, browser({ Notification: { permission: 'granted' } }))
  assert.equal(result.created, false); assert.equal(calls, 0)
  assert.match(await endpointFingerprint(existing.endpoint), /^[a-f0-9]{64}$/)
})
test('EN/RU/ES settings have matching copy keys and no empty labels', () => {
  for (const locale of ['ru', 'es']) assert.deepEqual(Object.keys(NOTIFICATION_COPY[locale]).sort(), Object.keys(NOTIFICATION_COPY.en).sort())
  for (const copy of Object.values(NOTIFICATION_COPY)) for (const value of Object.values(copy)) assert.ok(value.trim().length)
})
