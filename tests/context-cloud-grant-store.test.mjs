import assert from 'node:assert/strict'
import test from 'node:test'
import { readCoachContextGrants } from '../lib/coaching/context-cloud-grant-reader.mjs'
import { appendCoachContextGrant } from '../lib/coaching/context-cloud-grant-writer.mjs'

const actor = { id: '00000000-0000-4000-8000-000000000002' }
const request = { provider: 'groq', sessionId: 'session', accountWideOnly: true }
const row = {
  account_id: actor.id, provider_key: 'groq', session_id: null, revision: '42',
  source_revision: '2', occurred_at: new Date(100), expires_at: null,
}

test('account-wide lookup scopes the query and rejects session or account mismatches', async () => {
  const read = rows => readCoachContextGrants({
    async query(_sql, args) {
      assert.deepEqual(args, [actor.id, 'groq', null, 257, false])
      return { rows }
    },
  }, actor, request)
  const [event] = await read([row])
  assert.equal(event.revision, 42)
  assert.equal(event.occurredAt, 100)
  assert.equal(event.sourceRevision, '2')
  assert.deepEqual(await read([{ ...row, session_id: 'session' }]), [])
  assert.deepEqual(await read([{ ...row, account_id: 'other' }]), [])
  assert.deepEqual(await read(Array(257).fill(row)), [])
})

test('conversation lookup excludes account-wide grants and retains account-wide withdrawals', async () => {
  const db = { async query(sql, args) {
    assert.match(sql, /session_id is not null or decision = 'revoke'/)
    assert.deepEqual(args, [actor.id, 'groq', 'session', 257, true])
    return { rows: [
      { ...row, decision: 'grant' },
      { ...row, decision: 'revoke', revision: '43' },
      { ...row, decision: 'grant', revision: '44', session_id: 'session' },
    ] }
  } }
  const events = await readCoachContextGrants(db, actor, { ...request, accountWideOnly: false, sessionOnly: true })
  assert.deepEqual(events.map(event => [event.revision, event.sessionId, event.decision]), [
    [43, null, 'revoke'], [44, 'session', 'grant'],
  ])
})

test('grant writes require confirmation and reserve owner revision order before insert', async () => {
  const calls = []
  const db = { async query(sql, args) {
    calls.push({ sql, args })
    return { rows: [{ revision: '42' }] }
  } }
  const scope = { provider: 'groq', policyVersion: 'v2', category: 'goals',
    itemId: actor.id, sessionId: null, sourceRevision: '2' }
  await assert.rejects(appendCoachContextGrant(db, actor, scope, 'grant', false), /CONFIRMATION_REQUIRED/)
  assert.equal(calls.length, 0)
  assert.equal(await appendCoachContextGrant(db, actor, scope, 'grant', true), '42')
  assert.match(calls[0].sql, /pg_advisory_xact_lock/)
  assert.deepEqual(calls[1].args, [actor.id, 'groq', 'v2', 'goals', actor.id, null, 'grant', null, '2', null])
  await appendCoachContextGrant(db, actor, scope, 'revoke', false)
  assert.deepEqual(calls[3].args.slice(-4), ['revoke', null, null, null])
})
