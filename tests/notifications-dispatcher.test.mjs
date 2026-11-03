import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createNotificationDispatcher, dispatchDecision, deliveryOutcome } from '../lib/notifications/dispatcher.js'
import { defaultNotificationPreferences } from '../lib/notifications/contracts.js'
import { notificationDispatchAuthorized } from '../lib/notifications/authorization.js'
const NOW = '2026-10-13T14:00:00Z'
function snapshot(extra = {}) { return { preferences: { ...defaultNotificationPreferences('America/Toronto'), enabled: true }, entitlementActive: true, accountActive: true, courseActive: true, deviceActive: true, consentVersion: 'course-push-v1', paidThrough: '2026-11-13T14:00:00Z', subscription: { synthetic: true }, ...extra } }
function fixture({ beforeLock, initial = snapshot(), response = { statusCode: 201 } } = {}) {
  let current = initial, now = new Date(NOW), sends = 0, serial = Promise.resolve()
  const ledger = new Map()
  const repository = {
    async listCandidates() { return ['synthetic-device'] },
    async snapshot() { return current },
    async claim(deviceId, localDay) {
      const id = `${deviceId}|${localDay}`, prior = ledger.get(id)
      if (prior && !(prior.status === 'retry' && new Date(prior.retryAt) <= now && prior.attempt < 3)) return null
      const claim = { deviceId, localDay, id, attempt: (prior?.attempt || 0) + 1 }
      ledger.set(id, { ...claim, status: 'dispatching' })
      return claim
    },
    async withClaim(claim, callback) {
      if (beforeLock) current = beforeLock(current)
      const previous = serial; let release; serial = new Promise(resolve => { release = resolve })
      await previous
      try { const outcome = await callback(current); ledger.set(claim.id, { ...claim, ...outcome }); return outcome } finally { release() }
    },
  }
  const transport = { async send(_subscription, payload) { sends++; assert.deepEqual(Object.keys(payload).sort(), ['kind', 'locale', 'version']); return typeof response === 'function' ? response(sends) : response } }
  return { repository, transport, clock: () => now, setNow(value) { now = new Date(value) }, setSnapshot(value) { current = value }, sends: () => sends, ledger }
}
function dispatcher(value, extra = {}) { return createNotificationDispatcher({ ...value, config: { deliveryEnabled: true }, ...extra }) }
test('disabled dispatcher performs no reads or network work', async () => {
  const repository = { listCandidates() { throw new Error('must not run') } }
  assert.equal((await createNotificationDispatcher({ repository, config: { deliveryEnabled: false } }).run()).disabled, true)
})
test('concurrent scheduler invocations share a durable unique claim and send once', async () => {
  const value = fixture()
  await Promise.all([dispatcher(value).run(), dispatcher(value).run()])
  assert.equal(value.sends(), 1); assert.equal([...value.ledger.values()][0].status, 'accepted')
})
test('committed opt-out after preliminary eligibility but before dispatch wins', async () => {
  const value = fixture({ beforeLock: current => ({ ...current, preferences: { ...current.preferences, enabled: false } }) })
  assert.equal((await dispatcher(value).run()).skipped, 1); assert.equal(value.sends(), 0)
})
test('expiry, course pause, and device revocation are checked again at dispatch', async () => {
  for (const changes of [{ paidThrough: NOW }, { courseActive: false }, { deviceActive: false }, { entitlementActive: false }]) {
    const value = fixture({ beforeLock: current => ({ ...current, ...changes }) })
    await dispatcher(value).run(); assert.equal(value.sends(), 0)
  }
})
test('unpaid or non-opted-in accounts never obtain a delivery claim', async () => {
  for (const initial of [snapshot({ entitlementActive: false }), snapshot({ preferences: { ...defaultNotificationPreferences(), enabled: false } })]) {
    const value = fixture({ initial }); await dispatcher(value).run(); assert.equal(value.ledger.size, 0)
  }
})
test('an unknown request outcome never retries and is never marked delivered', async () => {
  const value = fixture({ response: { outcome: 'unknown' } })
  assert.equal((await dispatcher(value).run()).unknown, 1)
  await dispatcher(value).run(); assert.equal(value.sends(), 1)
})
test('explicit transient response permits a bounded retry then acceptance', async () => {
  const value = fixture({ response: count => count === 1 ? { statusCode: 429, retryAfter: '60' } : { statusCode: 201 } })
  assert.equal((await dispatcher(value).run()).retry, 1)
  await dispatcher(value).run(); assert.equal(value.sends(), 1)
  value.setNow('2026-10-13T14:01:00Z')
  assert.equal((await dispatcher(value).run()).accepted, 1); assert.equal(value.sends(), 2)
})
test('retries stop after three attempts and never override an expired safe window', () => {
  assert.equal(deliveryOutcome({ statusCode: 503 }, 3, { ttlSeconds: 300 }, NOW).status, 'failed')
  assert.equal(deliveryOutcome({ statusCode: 429, retryAfter: '3600' }, 1, { ttlSeconds: 30 }, NOW).status, 'failed')
})
test('404/410 revoke endpoints, while redirects and authentication errors stop', () => {
  for (const statusCode of [404, 410]) assert.equal(deliveryOutcome({ statusCode }, 1, { ttlSeconds: 300 }, NOW).status, 'revoked')
  for (const statusCode of [302, 307, 401, 403]) assert.equal(deliveryOutcome({ statusCode }, 1, { ttlSeconds: 300 }, NOW).status, 'failed')
})
test('TTL is clipped to subscription expiry, quiet start and due-window end', () => {
  assert.equal(dispatchDecision(snapshot({ paidThrough: '2026-10-13T14:00:30Z' }), NOW).ttlSeconds, 30)
  const quiet = snapshot({ preferences: { ...defaultNotificationPreferences('America/Toronto'), enabled: true, dailyAt: '20:30' } })
  assert.equal(dispatchDecision(quiet, '2026-10-14T00:59:30Z').ttlSeconds, 30)
  assert.equal(dispatchDecision(snapshot(), '2026-10-13T14:59:30Z').ttlSeconds, 30)
})
test('daily durable key prevents repeat reminders across DST repeated hour', async () => {
  const value = fixture({ initial: snapshot({ preferences: { ...defaultNotificationPreferences('America/Toronto'), enabled: true, quietHoursEnabled: false, dailyAt: '01:30' } }) })
  value.setNow('2026-11-01T05:30:00Z'); await dispatcher(value).run()
  value.setNow('2026-11-01T06:30:00Z'); await dispatcher(value).run()
  assert.equal(value.sends(), 1)
})
test('scheduler secret rejects malformed/unicode/absent credentials without exceptions', () => {
  const secret = 'synthetic-only-secret-not-deployed-0001'
  assert.equal(notificationDispatchAuthorized(`Bearer ${secret}`, secret), true)
  for (const input of [null, '', `Bearer ${'é'.repeat(secret.length)}`, `Bearer ${secret}x`]) assert.equal(notificationDispatchAuthorized(input, secret), false)
})
test('proposal limits worker to fixed helpers, keeps claims durable and separates environments', () => {
  const sql = readFileSync('docs/pwa/course-notification-dispatch.proposed.sql', 'utf8')
  for (const value of ['nologin noinherit nosuperuser nobypassrls', 'primary key(device_id,environment,local_day)', "status='retry'", "plan_id in ('start','advanced','premium')", 'paid_through_at', 'revoked_at is null', 'for update', 'for share', 'UNAPPLIED NOTIFICATION DISPATCH PROPOSAL']) assert.ok(sql.includes(value), value)
  assert.doesNotMatch(sql, /select\s+\*|assessment_results|concerns_ciphertext|reflection_ciphertext|GRANT hh_app_backend TO/i)
})
