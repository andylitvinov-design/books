import assert from 'node:assert/strict'
import test from 'node:test'
import { createPrescription, getClientPrescription } from '../lib/prescriptions/service.js'
import { remedySchedule } from '../lib/documents/recommendation.js'
const input = { patientName: 'Synthetic Example', practitionerName: 'Andrii Litvinov', status: 'active', recommendationNumber: 'HR-TEST-001', followUp: 'Practitioner-entered follow-up', items: [{ remedySlug: 'arsenicum-album', granules: '5', timesPerDay: '3', purpose: 'Synthetic purpose', sequence: 'Synthetic stage', notes: 'PRIVATE ITEM NOTE' }] }
test('preserves manually entered canonical recommendation fields without private notes', () => {
  const record = createPrescription(input)
  const d = getClientPrescription(record, 'en')
  assert.equal(d.recommendationNumber, input.recommendationNumber)
  assert.equal(d.followUp, input.followUp)
  assert.equal(d.items[0].purpose, input.items[0].purpose)
  assert.equal(d.items[0].granules, '5')
  assert.equal(d.items[0].timesPerDay, '3')
  assert.equal(d.items[0].sequence, input.items[0].sequence)
  assert.equal(d.items[0].potency, undefined)
  assert.equal(d.items[0].notes, undefined)
  assert.equal(JSON.stringify(d).includes('PRIVATE ITEM NOTE'), false)
  assert.equal(d.items[0].remedyPath, '/en/homeopathy/remedies/arsenicum-album')
})
test('recommendation projection cannot project a payment record', () => {
  assert.equal(getClientPrescription({ kind: 'payment', status: 'active' }, 'en'), undefined)
})


test('compact remedy schedule is localized for the client document', () => {
  assert.equal(remedySchedule({ granules: '5', timesPerDay: '3' }, 'ru'), '5 гранул · 3×/день')
  assert.equal(remedySchedule({ granules: '5', timesPerDay: '3' }, 'en'), '5 granules · 3×/day')
  assert.equal(remedySchedule({ granules: '1', timesPerDay: '1' }, 'ru'), '1 гранула · 1×/день')
  assert.equal(remedySchedule({}, 'en'), '')
})
