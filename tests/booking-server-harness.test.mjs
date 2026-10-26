import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createBookingServerHarness } from './helpers/booking-server-harness.mjs'
import { PRACTITIONER_ID } from '../data/app-services.js'

const paths = ['lib/app/repository.js', 'lib/app/result-interpretations.js',
  'lib/app/practitioner-access.js', 'lib/practitioners/client-messages.js',
  'lib/practitioners/booking-master-email.js']
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
for (const path of paths) {
  test('booking fixture rejects deleted server-only guard: ' + path, async () => {
    const source = read(path)
    assert.equal(source.split("import 'server-only'").length, 2)
    const fixture = createBookingServerHarness({ sourceOverrides: {
      [path]: source.replace("import 'server-only'", ''),
    } })
    await assert.rejects(fixture.load(path), /Unexpected booking fixture import contract|server-only guard/)
    assert.deepEqual(fixture.blocked, { database: 0, fetch: 0 })
  })
  test('booking fixture rejects new dependency before evaluation: ' + path, async () => {
    const fixture = createBookingServerHarness({ sourceOverrides: {
      [path]: read(path) + "\nimport 'node:net';\n",
    } })
    await assert.rejects(fixture.load(path), /Unexpected booking fixture import contract/)
    assert.deepEqual(fixture.blocked, { database: 0, fetch: 0 })
  })
}

test('booking adapter rejects unlisted modules, dynamic imports and re-exports', async () => {
  const path = paths.at(-1)
  await assert.rejects(createBookingServerHarness().load('lib/app/database.js'), /Unexpected fixture module/)
  assert.throws(() => createBookingServerHarness({ sourceOverrides: { unknown: '' } }), /Unexpected fixture module/)
  for (const addition of ["import('node:net')", "require('node:net')", "export { connect } from 'node:net'"]) {
    await assert.rejects(createBookingServerHarness({ sourceOverrides: {
      [path]: read(path) + '\n' + addition,
    } }).load(path), /Dynamic module loading|Re-export requires/)
  }
})

test('repository and message defaults cannot reach a live database', async () => {
  const fixture = createBookingServerHarness()
  const { createAppRepository } = await fixture.load('lib/app/repository.js')
  const { createPractitionerClientMessages } = await fixture.load('lib/practitioners/client-messages.js')
  const actor = { id: '10000000-0000-4000-8000-000000000001' }
  const repo = createAppRepository({})
  await assert.rejects(repo.createRequest(actor, {
    serviceId: '10000000-0000-4000-8000-000000000003',
    operationId: '10000000-0000-4000-8000-000000000004',
    contact: 'SYNTHETIC_CONTACT', message: 'SYNTHETIC_MESSAGE',
  }), /Synthetic booking transaction must be explicitly injected/)
  await assert.rejects(createPractitionerClientMessages({}).list(actor,
    '10000000-0000-4000-8000-000000000005'), /Synthetic booking transaction must be explicitly injected/)
  assert.deepEqual(fixture.blocked, { database: 2, fetch: 0 })
})

test('mail adapter default environment is empty and default network is forbidden', async () => {
  const fixture = createBookingServerHarness()
  const { bookingMasterEmailConfig, sendBookingMasterEmail } = await fixture.load(paths.at(-1))
  assert.equal(bookingMasterEmailConfig(), null)
  const event = { requestId: '10000000-0000-4000-8000-000000000001',
    revision: 0, practitionerId: PRACTITIONER_ID, event: 'new' }
  assert.deepEqual(await sendBookingMasterEmail(event), { attempted: false, reason: 'not_configured' })
  await assert.rejects(sendBookingMasterEmail(event, {
    HH_BOOKING_EMAIL_ENABLED: 'true', HH_BOOKING_RESEND_API_KEY: 're_synthetic_only',
    HH_BOOKING_FROM_EMAIL: 'booking@example.org', HH_BOOKING_VERIFIED_DOMAIN: 'example.org',
    HH_BOOKING_SENDER_VERIFIED: 'true', HH_PRACTITIONER_OWNER_EMAIL: 'owner@example.org',
  }), /BOOKING_EMAIL_DELIVERY_UNCONFIRMED/)
  assert.deepEqual(fixture.blocked, { database: 0, fetch: 1 })
})

test('ordinary Node still rejects the real server email module outside this fixture', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    "await import('./lib/practitioners/booking-master-email.js')"], {
    cwd: new URL('../', import.meta.url), env: { PATH: process.env.PATH },
    encoding: 'utf8', timeout: 10000,
  })
  assert.equal(result.error, undefined)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /This module cannot be imported from a Client Component module/)
})


// Execute the real canonical status predicate through the server module loader.
// Every database-shaped operation is an explicitly injected in-memory boundary.
const policyRequestId = '10000000-0000-4000-8000-000000000601'
const policyClientId = '10000000-0000-4000-8000-000000000602'
const policyMasterId = '10000000-0000-4000-8000-000000000603'
async function exerciseConversationPolicy(cases, expected) {
  const fixture = createBookingServerHarness()
  const { createPractitionerClientMessages } = await fixture.load('lib/practitioners/client-messages.js')
  const config = { encryptionKey: randomBytes(32), encryptionKeyId: 'synthetic-policy-only' }
  for (const [status, remoteBooking] of cases) {
    for (const actor of [{ id: policyClientId }, { id: policyMasterId }]) {
      const writes = []
      const transaction = async (_config, admittedActor, run) => {
        assert.equal(admittedActor, actor)
        return run({ async query(sql, parameters) {
          if (sql.includes('from app.consultation_requests r')) return { rows: [{
            id: policyRequestId, account_id: policyClientId, status, remote_booking: remoteBooking,
            practitioner_account_id: policyMasterId, practitioner_active: true, practitioner_status: 'approved',
          }] }
          if (sql.includes('from app.practitioner_request_messages where id=$1')) return { rows: [] }
          if (sql.includes('select count(*)::int as total')) return { rows: [{ total: 0 }] }
          if (sql.includes('insert into app.practitioner_request_messages')) {
            writes.push(parameters)
            return { rows: [], rowCount: 1 }
          }
          throw new Error('Unexpected synthetic policy query')
        } })
      }
      const store = createPractitionerClientMessages(config, { transaction })
      const input = { requestId: policyRequestId,
        operationId: '10000000-0000-4000-8000-000000000604',
        text: 'A synthetic scheduling question.', visibility: 'participants' }
      if (expected) {
        const result = await store.send(actor, input)
        assert.equal(result.saved, true)
        assert.equal(result.duplicate, false)
        assert.equal(result.id, input.operationId)
        assert.equal(writes.length, 1)
        assert.equal(writes[0][1], policyRequestId)
        assert.equal(writes[0][2], actor.id)
        assert.equal(writes[0][4], 'participants')
        assert.ok(!JSON.stringify(writes).includes(input.text), 'real encryption stays active')
      } else {
        await assert.rejects(store.send(actor, input), error =>
          error.code === 'CONVERSATION_CLOSED' && error.status === 409)
        assert.deepEqual(writes, [], 'closed/malformed status cannot write a message')
      }
    }
  }
  assert.deepEqual(fixture.blocked, { database: 0, fetch: 0 })
}

test('booking adapter executes real canonical open-conversation policy for both parties', async () => {
  await exerciseConversationPolicy([
    ['requested', null], ['contacted', null], ['reschedule_proposed', {}],
    ['confirmed', {}], ['in_progress', {}],
  ], true)
})

test('booking adapter preserves canonical closed and malformed status rejection for both parties', async () => {
  await exerciseConversationPolicy([
    ['completed', {}], ['declined', {}], ['closed', {}], ['cancelled', {}],
    ['confirmed', null], ['reschedule_proposed', undefined], ['in_progress', null],
    [undefined, {}], [null, {}], ['', {}], ['unknown', {}], ['Requested', {}],
    [' requested', {}], [true, {}], [1, {}], [[], {}], [{}, {}],
  ], false)
})

test('booking adapter rejects an unlisted conversation policy dependency before evaluation', async () => {
  const path = 'lib/practitioners/client-messages.js'
  const fixture = createBookingServerHarness({ sourceOverrides: {
    [path]: read(path).replace("'./conversation-policy.js'", "'./unlisted-conversation-policy.js'"),
  } })
  await assert.rejects(fixture.load(path), /Unexpected booking fixture import contract/)
  assert.deepEqual(fixture.blocked, { database: 0, fetch: 0 })
})
