import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { readReikiMessengerEvents } from '../lib/crm/reiki-course-delivery.js'
import { seal } from '../lib/app/crypto.js'

test('owner reads only scoped course notes and receives the full encrypted answer and original save time', async () => {
  const eventId = randomUUID(), accountId = randomUUID(), threadId = randomUUID()
  const config = { encryptionKey: randomBytes(32), encryptionKeyId: 'test' }
  const answer = 'Synthetic reflection.\n'.repeat(80)
  const event = { kind: 'answer-edit', lesson: 2, questionId: 'tan-04', revision: 8, answer }
  const occurredAt = '2026-11-24T14:00:00.000002Z'
  const ciphertext = seal(event, { accountId, recordId: eventId, field: 'academy.messenger_event' }, config)
  const db = { async query(sql, bindings) {
    assert.match(sql, /app_private\.reiki_messenger_page/)
    assert.deepEqual(bindings, [threadId, [eventId]])
    return { rows: [{ event_id: eventId, learner_id: accountId, occurred_at: occurredAt, payload_ciphertext: ciphertext }] }
  } }
  const page = [{ id: randomUUID(), direction: 'out' }, { id: eventId, reiki_event_id: eventId }]
  const result = await readReikiMessengerEvents(db, threadId, page, config)
  assert.deepEqual([...result], [[eventId, { ...event, occurredAt }]])
  assert.equal((await readReikiMessengerEvents(null, threadId, [page[0]], config)).size, 0)
  await assert.rejects(readReikiMessengerEvents({ async query() {
    return { rows: [{ event_id: eventId, learner_id: randomUUID(), payload_ciphertext: ciphertext }] }
  } }, threadId, page, config), /PRIVATE_DATA_UNAVAILABLE/)
})
