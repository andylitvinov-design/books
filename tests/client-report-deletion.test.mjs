import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { createConsultation } from '../lib/consultations/service.js'
import { createClient } from '../lib/clients/service.js'

const input = {
  patientName: 'Deletion Fixture',
  consultationDate: '2026-10-19',
  items: [{ remedySlug: 'arsenicum-album' }],
  newClient: { fullName: 'Deletion Fixture', preferredLocale: 'en' },
}

test('deleting only one report leaves its client, invoice, and other report intact', async () => {
  const store = createMemoryPrescriptionStore()
  const first = await createConsultation(input, { store, requestId: randomUUID() })
  const clientId = first.recommendation.clientId
  const second = await createConsultation({ ...input, newClient: undefined, clientId },
    { store, requestId: randomUUID() })
  assert.equal((await store.listClientDocuments(clientId)).length, 4)
  assert.equal(await store.deleteClientReportIfUnchanged(first.recommendation), true)
  assert.equal(await store.deleteClientReportIfUnchanged(first.recommendation), false)
  assert.equal(await store.findById(first.recommendation.id), undefined)
  assert.equal((await store.findById(first.payment.id))?.clientId, clientId)
  assert.ok(await store.findById(second.recommendation.id))
  assert.equal((await store.listClientDocuments(clientId)).length, 3)
  assert.ok(await store.findClientById(clientId))
})

test('client deletion removes all local documents and assessments and preserves other clients', async () => {
  const store = createMemoryPrescriptionStore()
  const pair = await createConsultation(input, { store, requestId: randomUUID() })
  const other = createClient({ fullName: 'Retained Client', preferredLocale: 'ru' })
  await store.saveClient(other)
  const id = pair.recommendation.clientId
  const current = await store.findClientById(id)
  assert.equal(await store.deleteClientIfUnchanged(current, { expectedDocumentCount: 2, expectedAssessmentCount: 0 }), true)
  assert.equal(await store.findClientById(id), undefined)
  assert.equal(await store.findById(pair.recommendation.id), undefined)
  assert.equal(await store.findById(pair.payment.id), undefined)
  assert.deepEqual(await store.listClientDocuments(id), [])
  assert.deepEqual((await store.listClients()).map(c => c.id), [other.id])
})

test('a stale client count fails closed and leaves all records untouched', async () => {
  const store = createMemoryPrescriptionStore()
  const pair = await createConsultation(input, { store, requestId: randomUUID() })
  const id = pair.recommendation.clientId
  const current = await store.findClientById(id)
  assert.equal(await store.deleteClientIfUnchanged(current, { expectedDocumentCount: 1, expectedAssessmentCount: 0 }), false)
  assert.ok(await store.findClientById(id))
  assert.equal((await store.listClientDocuments(id)).length, 2)
})
