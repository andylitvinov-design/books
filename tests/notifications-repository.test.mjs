import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

if (!process.execArgv.includes('--conditions=react-server')) {
  test('Notification repository suite with real server condition', () => {
    const run = spawnSync(process.execPath, ['--conditions=react-server', '--test', fileURLToPath(import.meta.url)], { encoding: 'utf8' })
    assert.equal(run.status, 0, run.stdout + run.stderr)
  })
} else {
// Import dynamically under react-server conditions to exercise the real repository.
const { createNotificationRepository } = await import('../lib/notifications/repository.js')
const { openSealed } = await import('../lib/app/crypto.js')
const accountId = '11111111-1111-4111-8111-111111111111'
const actor = { id: accountId, claims: { sub: accountId } }
const config = { encryptionKey: Buffer.alloc(32, 1), encryptionKeyId: 'synthetic-only' }
const subscription = { endpoint: 'https://web.push.apple.com/synthetic-fixture', keys: { p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') } }
function fixture({ account = { status: 'active', onboarding_state: 'active' }, count = 0 } = {}) {
  const calls = []
  const db = { async query(sql, values) {
    calls.push({ sql, values })
    if (sql.startsWith('select status')) return { rows: account ? [account] : [] }
    if (sql.startsWith('select count')) return { rows: [{ count }] }
    if (sql.startsWith('insert into app_private.course_push_devices')) return { rows: [{ id: values[0] }] }
    return { rows: [] }
  } }
  return { calls, repository: createNotificationRepository(config, { runTransaction: async (_config, _actor, fn) => fn(db) }) }
}
test('rejects mismatched identity before any storage access', async () => {
  const value = fixture()
  await assert.rejects(() => value.repository.read({ ...actor, claims: { sub: 'different' } }), /SIGN_IN_REQUIRED/)
  assert.equal(value.calls.length, 0)
})
test('inactive and incomplete accounts cannot register a device', async () => {
  for (const account of [{ status: 'deleting', onboarding_state: 'active' }, { status: 'active', onboarding_state: 'pending' }]) {
    const value = fixture({ account })
    await assert.rejects(() => value.repository.subscribe(actor, subscription, 'course-push-v1'))
    assert.ok(value.calls.every(call => !call.sql.startsWith('insert')))
  }
})
test('stores encrypted endpoint and keys using owner/record-bound encryption', async () => {
  const value = fixture()
  const result = await value.repository.subscribe(actor, subscription, 'course-push-v1')
  const inserted = value.calls.find(call => call.sql.startsWith('insert into app_private.course_push_devices'))
  assert.doesNotMatch(inserted.values[3], /push\.apple|synthetic-fixture/)
  const opened = openSealed(inserted.values[3], { accountId, recordId: result.deviceId, field: 'push.subscription' }, config)
  assert.equal(opened.endpoint, subscription.endpoint)
  assert.throws(() => openSealed(inserted.values[3], { accountId: '22222222-2222-4222-8222-222222222222', recordId: result.deviceId, field: 'push.subscription' }, config))
  assert.deepEqual(Object.keys(result).sort(), ['currentDevice', 'deviceId'])
})
test('registration cannot exceed the per-account device bound', async () => {
  const value = fixture({ count: 10 })
  await assert.rejects(() => value.repository.subscribe(actor, subscription, 'course-push-v1'), /PUSH_DEVICE_LIMIT/)
})
test('rejects absent or outdated consent without storage writes', async () => {
  const value = fixture()
  assert.throws(() => value.repository.subscribe(actor, subscription, 'old-consent'), /PUSH_CONSENT_REQUIRED/)
  assert.equal(value.calls.length, 0)
})
test('device delete and all-device delete are owner-scoped and repeatable', async () => {
  const value = fixture()
  for (let attempt = 0; attempt < 2; attempt++) assert.equal((await value.repository.unsubscribe(actor, { scope: 'device', fingerprint: 'a'.repeat(64) })).unsubscribed, true)
  assert.equal((await value.repository.unsubscribe(actor, { scope: 'all' })).unsubscribed, true)
  for (const call of value.calls.filter(call => call.sql.startsWith('delete'))) {
    assert.match(call.sql, /where account_id=\$1/); assert.equal(call.values[0], accountId)
  }
})
test('schema proposal is rollback-only, owner-protected and outside live migrations', () => {
  const sql = readFileSync('docs/pwa/course-notifications-schema.proposed.sql', 'utf8')
  assert.match(sql, /force row level security/)
  assert.match(sql, /from public,anon,authenticated/)
  assert.match(sql, /account_id=\(select auth.uid\(\)\)/)
  assert.match(sql, /on delete cascade/)
  assert.match(sql.trim(), /rollback;$/)
})
test('HTTP adapter binds account, origin, session and private response headers', () => {
  const route = readFileSync('app/api/app/notifications/route.js', 'utf8')
  for (const fragment of ['requireSameOrigin(request, config)', 'await auth.verified()', "request.headers.get('x-hh-account-id') !== actor.id", 'headers: PRIVATE_HEADERS', 'readBody(request, 8192)', 'consumeRate']) assert.ok(route.includes(fragment))
  assert.doesNotMatch(route, /service_role|fetch\(.*endpoint|sendNotification/)
})

}
