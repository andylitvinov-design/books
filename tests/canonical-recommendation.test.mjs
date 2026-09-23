import assert from 'node:assert/strict'
import test from 'node:test'
import { createPrescription, getClientPrescription } from '../lib/prescriptions/service.js'
import { recommendationCopy, recommendationGuidance } from '../lib/documents/recommendation.js'
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


test('new Homeopathy recommendations use the structured two-week follow-up template', () => {
  const record = createPrescription({ ...input, recommendationType: 'homeopathy', items: [{ remedySlug: 'arsenicum-album', granules: '5', timesPerDay: '3' }] })
  const document = getClientPrescription(record, 'ru')
  assert.equal(document.recommendationType, 'homeopathy')
  const guidance = recommendationGuidance(document, 'ru')
  assert.deepEqual(guidance.bullets, ['5 гранул препарата.', '3 раза в день и дополнительно в момент стресса.'])
  assert.equal(guidance.course, 'Курс: 2 недели.')
  assert.equal(guidance.recheck, 'Повторная проверка — через 1–2 недели.')
  assert.match(guidance.contact, /проверю состояние/)
})

test('Bach recommendations use the mixture template and a distinct bilingual title', () => {
  const record = createPrescription({ ...input, recommendationType: 'bach', items: [{ displayNameOverride: 'Mimulus', sourceStatus: 'custom' }] })
  const document = getClientPrescription(record, 'ru')
  assert.equal(document.recommendationType, 'bach')
  assert.equal(recommendationCopy('ru', 'bach').title, 'РЕКОМЕНДАЦИЯ ПО ЭССЕНЦИЯМ БАХА')
  assert.equal(recommendationCopy('en', 'bach').title, 'BACH FLOWER ESSENCE RECOMMENDATION')
  const guidance = recommendationGuidance(document, 'ru')
  assert.match(guidance.bullets[0], /по 5 капель каждой выбранной эссенции/)
  assert.equal(guidance.bullets[1], 'Принимать 2–4 раза в день.')
  assert.equal(guidance.course, 'Курс: 2 недели.')
})

test('legacy recommendations without an explicit type do not gain a new dosing template retroactively', () => {
  const legacy = { status: 'active', patientName: 'Legacy', dateIssued: '2026-01-01', languagePreference: 'en', items: [{ displayNameOverride: 'Legacy item' }] }
  const document = getClientPrescription(legacy, 'en')
  assert.equal(document.recommendationType, undefined)
  assert.equal(recommendationGuidance(document, 'en'), undefined)
})
