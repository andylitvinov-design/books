import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
if (!process.execArgv.includes('--conditions=react-server')) {
  test('notification dispatch repository server suite', () => {
    const run = spawnSync(process.execPath, ['--conditions=react-server', '--test', fileURLToPath(import.meta.url)], { encoding: 'utf8' })
    assert.equal(run.status, 0, run.stdout + run.stderr)
  })
} else {
  const { createNotificationDispatchRepository } = await import('../lib/notifications/dispatch-repository.js')
  const { seal } = await import('../lib/app/crypto.js')
  const accountId = '11111111-1111-4111-8111-111111111111', deviceId = '22222222-2222-4222-8222-222222222222'
  const config = { encryptionKey: Buffer.alloc(32, 1), encryptionKeyId: 'synthetic-only' }
  function fixture({ unsafe = false } = {}) {
    const calls = []
    const client = { release() { calls.push('release') }, async query(sql, values) {
      calls.push({ sql, values })
      if (sql.includes('pg_roles')) return { rows: [{ rolsuper: unsafe, rolbypassrls: false }] }
      if (sql.includes('course_push_candidates')) return { rows: [{ device_id: deviceId }] }
      if (sql.includes('course_push_snapshot')) return { rows: [{ value: { accountId, subscriptionCiphertext: values[2] ? seal({ synthetic: true }, { accountId, recordId: deviceId, field: 'push.subscription' }, config) : null } }] }
      if (sql.includes('course_push_claim_valid')) return { rows: [{ valid: true }] }
      if (sql.includes('course_push_claim(')) return { rows: [{ value: { attempt: 1 } }] }
      return { rows: [] }
    } }
    return { calls, repository: createNotificationDispatchRepository(config, { environment: 'sandbox' }, { pool: { connect: async () => client } }) }
  }
  test('claim commits durably before a subsequent delivery transaction', async () => {
    const value = fixture()
    const claim = await value.repository.claim(deviceId, '2026-10-13')
    const committed = value.calls.findIndex(call => call?.sql === 'COMMIT')
    assert.ok(committed > value.calls.findIndex(call => call?.sql?.includes('course_push_claim(')))
    await value.repository.withClaim(claim, async snapshot => { value.calls.push('transport'); assert.deepEqual(snapshot.subscription, { synthetic: true }); return { status: 'accepted', providerStatus: 201 } })
    const sent = value.calls.indexOf('transport')
    assert.ok(sent > committed)
    assert.ok(value.calls.findIndex(call => call?.sql?.includes('course_push_finish')) > sent)
    assert.ok(value.calls.some(call => call?.sql === 'SET LOCAL ROLE hh_course_push_worker'))
  })
  test('unsafe database credentials fail before worker role or private helpers', async () => {
    const value = fixture({ unsafe: true })
    await assert.rejects(() => value.repository.listCandidates(10), /DATABASE_ROLE_UNSAFE/)
    assert.ok(!value.calls.some(call => call?.sql?.includes('course_push_candidates')))
  })
  test('all dispatch helper calls are explicitly environment scoped', async () => {
    const value = fixture()
    await value.repository.listCandidates(10)
    await value.repository.snapshot(deviceId)
    const claim = await value.repository.claim(deviceId, '2026-10-13')
    await value.repository.withClaim(claim, async () => ({ status: 'skipped' }))
    for (const call of value.calls.filter(call => call?.sql?.includes('app_private.course_push_'))) assert.ok(call.values.includes('sandbox'))
    assert.ok(value.calls.every(call => typeof call === 'string' || !/select.*assessment|select.*growth_courses|select.*billing_private/i.test(call.sql)))
  })
}
