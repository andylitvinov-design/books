import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { createConsultation, updateConsultation } from '../lib/consultations/service.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { createPrescription, getClientPrescription, updatePrescription } from '../lib/prescriptions/service.js'
import { buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'
import { recommendationCopy } from '../lib/documents/recommendation.js'
import { documentActionUrls } from '../lib/consultations/result-actions.js'

const recommendationInput = {
  patientName: 'Synthetic Client',
  dateIssued: '2026-10-13',
  languagePreference: 'en',
  practitionerName: 'Andrii Litvinov',
  status: 'active',
  items: [{ remedySlug: 'arsenicum-album', potency: '30' }],
  analysis: 'Synthetic state measurement alpha',
  recommendationsText: 'Synthetic personalized recommendation gamma',
  additionalNotes: 'Synthetic client guidance beta',
  internalNotes: 'PRIVATE INTERNAL TEXT NEVER SHARED',
}

test('analysis and additional notes are normalized, editable, and visible only on active client reports', () => {
  const record = createPrescription(recommendationInput)
  const client = getClientPrescription(record, 'en')
  assert.equal(client.analysis, recommendationInput.analysis)
  assert.equal(client.recommendationsText, recommendationInput.recommendationsText)
  assert.equal(client.additionalNotes, recommendationInput.additionalNotes)
  assert.equal(recommendationCopy('en').analysis, 'STATE ANALYSIS')
  assert.equal(recommendationCopy('ru').additionalNotes, 'ПРИМЕЧАНИЯ')
  assert.equal(recommendationCopy('ru').recommendations, 'РЕКОМЕНДАЦИИ')
  assert.equal(JSON.stringify(client).includes(recommendationInput.internalNotes), false)
  assert.equal(getClientPrescription(createPrescription({ ...recommendationInput, status: 'draft' }), 'en'), undefined)
  const edited = updatePrescription(record, { ...recommendationInput, analysis: 'Changed state alpha', recommendationsText: 'Changed recommendation gamma', additionalNotes: 'Changed note beta' })
  assert.equal(getClientPrescription(edited, 'ru').analysis, 'Changed state alpha')
  assert.equal(getClientPrescription(edited, 'ru').recommendationsText, 'Changed recommendation gamma')
  assert.equal(getClientPrescription(edited, 'ru').additionalNotes, 'Changed note beta')
  assert.throws(() => createPrescription({ ...recommendationInput, analysis: 'a'.repeat(5001) }), /Analysis is too long/)
  assert.throws(() => createPrescription({ ...recommendationInput, recommendationsText: 'a'.repeat(5001) }), /Recommendations is too long/)
  assert.throws(() => createPrescription({ ...recommendationInput, additionalNotes: 'a'.repeat(5001) }), /Additional notes is too long/)
})

test('new and updated standalone consultations keep both client-visible fields without creating an invoice', async () => {
  const store = createMemoryPrescriptionStore()
  const input = {
    newClient: { fullName: 'Synthetic Report Test', preferredLocale: 'en' },
    consultationDate: '2026-10-13',
    includeRecommendation: true,
    includeInvoice: false,
    items: [{ remedySlug: 'arsenicum-album', potency: '30' }],
    analysis: 'Before and after measurements',
    recommendationsText: 'Personal recommendations from this consultation',
    additionalNotes: 'Personal next step guidance',
  }
  const created = await createConsultation(input, { store, requestId: randomUUID() })
  assert.equal(created.payment, undefined)
  assert.equal(created.recommendation.analysis, input.analysis)
  assert.equal(created.recommendation.recommendationsText, input.recommendationsText)
  assert.equal(created.recommendation.additionalNotes, input.additionalNotes)
  const persisted = await store.findById(created.recommendation.id)
  assert.equal(persisted.analysis, input.analysis)
  assert.equal(persisted.recommendationsText, input.recommendationsText)
  assert.equal(persisted.additionalNotes, input.additionalNotes)
  const changed = await updateConsultation(persisted, undefined, {
    ...input,
    newClient: undefined,
    patientName: persisted.patientName,
    languagePreference: persisted.languagePreference,
    analysis: 'Updated measurement',
    recommendationsText: 'Updated recommendations',
    additionalNotes: 'Updated guidance',
  }, { store })
  assert.equal(changed.recommendation.analysis, 'Updated measurement')
  assert.equal(changed.recommendation.recommendationsText, 'Updated recommendations')
  assert.equal((await store.findById(persisted.id)).additionalNotes, 'Updated guidance')
})

test('PDF renders analysis and personal guidance with new themed sections and without private notes', () => {
  const document = getClientPrescription(createPrescription(recommendationInput), 'en')
  const pdf = buildPrescriptionPdf(document, 'en', 'https://holistichouse.vercel.app')
  const source = pdf.toString('latin1')
  assert.ok(source.startsWith('%PDF-1.7'))
  assert.match(source, /Synthetic state measurement alpha/)
  assert.match(source, /Synthetic personalized recommendation gamma/)
  assert.ok(source.indexOf('Synthetic state measurement alpha') < source.indexOf('Synthetic personalized recommendation gamma'))
  assert.ok(source.indexOf('Synthetic personalized recommendation gamma') < source.indexOf('Synthetic client guidance beta'))
  assert.match(source, /Synthetic client guidance beta/)
  assert.doesNotMatch(source, /PRIVATE INTERNAL TEXT NEVER SHARED/)
  assert.match(source, /\/Count [1-9]/)
  const ruPdf = buildPrescriptionPdf(getClientPrescription(createPrescription(recommendationInput), 'ru'), 'ru', 'https://holistichouse.vercel.app')
  assert.ok(ruPdf.subarray(0, 8).toString().startsWith('%PDF-1.7'))
})

test('private PDF preview is owner-only, inline and distinct from an explicit client-link request', async () => {
  const urls = documentActionUrls('example-id', 'ru')
  assert.equal(urls.previewPdf, '/admin/api/documents/example-id/pdf?locale=ru&preview=1')
  assert.equal(urls.pdf, '/admin/api/documents/example-id/pdf?locale=ru')
  const [route, actions, form, standalone, standaloneAction] = await Promise.all([
    readFile('app/admin/api/documents/[id]/pdf/route.js', 'utf8'),
    readFile('components/consultation-document-actions.jsx', 'utf8'),
    readFile('components/consultation-form.jsx', 'utf8'),
    readFile('components/prescription-form.jsx', 'utf8'),
    readFile('app/admin/prescriptions/actions.js', 'utf8'),
  ])
  assert.match(route, /requireAdminRequest\(\)/)
  assert.match(route, /'preview'\) === '1' \? 'inline' : 'attachment'/)
  assert.match(route, /private, no-store/)
  assert.match(actions, /href=\{urls\.previewPdf\}/)
  assert.match(actions, /onClick=\{copy\}/)
  for (const name of ['analysis', 'recommendationsText', 'additionalNotes']) {
    assert.match(form, new RegExp('name="' + name + '"'))
    assert.match(standalone, new RegExp('name="' + name + '"'))
    assert.match(standaloneAction, new RegExp('formData.get\\(\\x27' + name + '\\x27\\)'))
  }
})

test('three narrative sections render in the authored order while legacy reports remain readable', async () => {
  const reader = await readFile('components/prescription-document.jsx', 'utf8')
  const analysis = reader.indexOf('<h2>{labels.analysis}</h2>')
  const recommendations = reader.indexOf('<h2>{labels.recommendations}</h2>')
  const notes = reader.indexOf('<h2>{labels.additionalNotes}</h2>')
  assert.ok(analysis !== -1 && recommendations > analysis && notes > recommendations)

  const previewRoute = await readFile('app/admin/api/consultations/preview/route.js', 'utf8')
  assert.match(previewRoute, /'recommendationsText'/)
  const previousReport = createPrescription({ ...recommendationInput, recommendationsText: undefined })
  const previousClientReport = getClientPrescription(previousReport, 'ru')
  assert.equal(previousClientReport.recommendationsText, undefined)
  assert.equal(previousClientReport.additionalNotes, recommendationInput.additionalNotes)
  const source = buildPrescriptionPdf(previousClientReport, 'ru', 'https://holistichouse.vercel.app').toString('latin1')
  assert.doesNotMatch(source, /Synthetic personalized recommendation gamma/)
  assert.match(source, /Synthetic client guidance beta/)
})
