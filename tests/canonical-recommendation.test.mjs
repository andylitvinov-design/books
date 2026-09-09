import assert from 'node:assert/strict'
import test from 'node:test'
import { createPrescription, getClientPrescription } from '../lib/prescriptions/service.js'
const input = { patientName: 'Synthetic Example', practitionerName: 'Andrii Litvinov', status: 'active', recommendationNumber: 'HR-TEST-001', followUp: 'Practitioner-entered follow-up', items: [{ remedySlug: 'arsenicum-album', purpose: 'Synthetic purpose', sequence: 'Synthetic stage', notes: 'PRIVATE ITEM NOTE' }] }
test('preserves manually entered canonical recommendation fields without private notes', () => {
  const record = createPrescription(input)
  const d = getClientPrescription(record, 'en')
  assert.equal(d.recommendationNumber, input.recommendationNumber)
  assert.equal(d.followUp, input.followUp)
  assert.equal(d.items[0].purpose, input.items[0].purpose)
  assert.equal(d.items[0].sequence, input.items[0].sequence)
  assert.equal(d.items[0].potency, undefined)
  assert.equal(d.items[0].notes, undefined)
  assert.equal(JSON.stringify(d).includes('PRIVATE ITEM NOTE'), false)
  assert.equal(d.items[0].remedyPath, '/en/homeopathy/remedies/arsenicum-album')
})
test('recommendation projection cannot project a payment record', () => {
  assert.equal(getClientPrescription({ kind: 'payment', status: 'active' }, 'en'), undefined)
})
