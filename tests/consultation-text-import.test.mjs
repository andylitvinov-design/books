import assert from 'node:assert/strict'
import test from 'node:test'
import { parseConsultationText } from '../lib/consultations/text-import.js'
import { getPrescriptionRemedyOptions } from '../lib/prescriptions/service.js'

const remedies = getPrescriptionRemedyOptions()

test('consultation text parser fills potency, granules and times per day from plain Homeopathy text', () => {
  const parsed = parseConsultationText('Aconitum 30, 5 гранул, 3 раза в день', remedies)
  assert.equal(parsed.items.length, 1)
  assert.equal(parsed.items[0].itemType, 'homeopathy')
  assert.equal(parsed.items[0].remedySlug, 'aconitum')
  assert.equal(parsed.items[0].potency, '30')
  assert.equal(parsed.items[0].granules, '5')
  assert.equal(parsed.items[0].timesPerDay, '3')
  assert.equal(parsed.recommendationType, 'homeopathy')
})

test('consultation text parser detects Bach lines and mixed prescriptions', () => {
  const parsed = parseConsultationText('Гомеопатия:\nAconitum 200, 7 гранул, 2 раза в день\nЭссенции Баха:\nMimulus\nLarch', remedies)
  assert.equal(parsed.items.length, 3)
  assert.deepEqual(parsed.items.map((item) => item.itemType), ['homeopathy', 'bach', 'bach'])
  assert.equal(parsed.items[0].potency, '200')
  assert.equal(parsed.items[1].displayNameOverride, 'Mimulus')
  assert.equal(parsed.items[2].displayNameOverride, 'Larch')
  assert.equal(parsed.recommendationType, 'mixed')
})

test('explicit Bach prefix works without a section header', () => {
  const parsed = parseConsultationText('Бах: Cerato', remedies)
  assert.equal(parsed.items.length, 1)
  assert.equal(parsed.items[0].itemType, 'bach')
  assert.equal(parsed.items[0].query, 'Cerato')
  assert.equal(parsed.recommendationType, 'bach')
})
