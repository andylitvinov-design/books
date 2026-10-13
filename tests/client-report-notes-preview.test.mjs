import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createConsultation, updateConsultation } from '../lib/consultations/service.js'
import { documentActionUrls } from '../lib/consultations/result-actions.js'
import { recommendationCopy } from '../lib/documents/recommendation.js'
import { buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'
import { createPrescription, getClientPrescription } from '../lib/prescriptions/service.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'

const fixture = {
  patientName: 'Synthetic Client',
  consultationDate: '2026-10-13',
  languagePreference: 'ru',
  includeRecommendation: true,
  includeInvoice: false,
  items: [{ remedySlug: 'arsenicum-album' }],
  analysis: 'STATE-MEASUREMENT-01: 3 of 10, baseline',
  additionalNotes: 'CLIENT-GUIDANCE-01: keep an observation journal',
  generalInstructions: 'LEGACY-GENERAL-NOTE',
  internalNotes: 'PRIVATE-PRACTITIONER-ONLY',
}

test('consultation saves analysis and notes with a prescription but without an invoice', async () => {
  const store = createMemoryPrescriptionStore()
  const requestId = randomUUID()
  const saved = await createConsultation({ ...fixture, newClient: { fullName: fixture.patientName, preferredLocale: 'ru' } }, { store, requestId })
  assert.ok(saved.recommendation)
  assert.equal(saved.payment, undefined)
  assert.equal(saved.recommendation.analysis, fixture.analysis)
  assert.equal(saved.recommendation.additionalNotes, fixture.additionalNotes)
  assert.equal(saved.recommendation.generalInstructions, fixture.generalInstructions)
  const projected = getClientPrescription(saved.recommendation, 'ru')
  assert.equal(projected.analysis, fixture.analysis)
  assert.equal(projected.additionalNotes, fixture.additionalNotes)
  assert.equal(projected.generalInstructions, fixture.generalInstructions)
  assert.equal(projected.internalNotes, undefined)
  const inHistory = await store.listClientDocuments(saved.recommendation.clientId)
  assert.equal(inHistory.length, 1)
  assert.equal(inHistory[0].analysis, fixture.analysis)
  const retry = await createConsultation({ ...fixture, newClient: { fullName: fixture.patientName, preferredLocale: 'ru' } }, { store, requestId })
  assert.equal(retry.recommendation.id, saved.recommendation.id)
  const changed = await updateConsultation(saved.recommendation, undefined, {
    ...fixture, analysis: 'STATE-MEASUREMENT-02: 5 of 10', additionalNotes: 'CLIENT-GUIDANCE-02: next steps',
  }, { store })
  assert.equal(changed.recommendation.analysis, 'STATE-MEASUREMENT-02: 5 of 10')
  assert.equal(changed.recommendation.additionalNotes, 'CLIENT-GUIDANCE-02: next steps')
  assert.equal((await store.findById(saved.recommendation.id)).additionalNotes, 'CLIENT-GUIDANCE-02: next steps')
})

test('PDF keeps custom analysis, notes and general instructions separated, including Russian labels', () => {
  const input = {
    patientName: 'Synthetic Client', practitionerName: 'Synthetic Practitioner', status: 'active',
    dateIssued: '2026-10-13', items: [{ remedySlug: 'arsenicum-album' }],
    analysis: 'ANALYSIS-SYNTHETIC-123', additionalNotes: 'NOTES-SYNTHETIC-456',
    generalInstructions: 'GENERAL-SYNTHETIC-789', internalNotes: 'PRIVATE-SYNTHETIC-000',
  }
  for (const locale of ['en', 'ru']) {
    const record = createPrescription(input)
    const projected = getClientPrescription(record, locale)
    const pdf = buildPrescriptionPdf(projected, locale, 'https://example.test')
    const source = pdf.toString('latin1')
    assert.match(source, /^%PDF-1\.7/)
    for (const phrase of ['ANALYSIS-SYNTHETIC-123', 'NOTES-SYNTHETIC-456', 'GENERAL-SYNTHETIC-789']) {
      assert.match(source, new RegExp(phrase))
    }
    assert.doesNotMatch(source, /PRIVATE-SYNTHETIC-000/)
    assert.match(source, /HOLISTIC HOUSE/)
    assert.match(source, /0\.926 0\.970 0\.969 rg/)
    assert.equal(getClientPrescription(record, locale).internalNotes, undefined)
  }
  assert.equal(recommendationCopy('ru').analysis, 'АНАЛИЗ СОСТОЯНИЯ')
  assert.equal(recommendationCopy('en').additionalNotes, 'ADDITIONAL NOTES & GUIDANCE')
})

test('long client state analysis continues across pages without dropping content', () => {
  const record = createPrescription({
    patientName: 'Long Synthetic', practitionerName: 'Test Practitioner', status: 'active',
    items: [{ remedySlug: 'arsenicum-album' }],
    analysis: 'ANALYSIS-START\n' + 'Sample observation recorded. '.repeat(135) + '\nANALYSIS-END',
    additionalNotes: 'Follow-up reminder.',
  })
  const pdf = buildPrescriptionPdf(getClientPrescription(record, 'en'), 'en', 'https://example.test')
  const source = pdf.toString('latin1')
  assert.ok((source.match(/\/Type \/Page\b/g) ?? []).length >= 2)
  assert.match(source, /ANALYSIS-START/)
  assert.match(source, /ANALYSIS-END/)
  assert.match(source, /continued/)
})

test('analysis and notes enforce bounded length independently of private internal notes', () => {
  const input = { patientName: 'Synthetic Client', practitionerName: 'Synthetic Practitioner', items: [{ remedySlug: 'arsenicum-album' }] }
  assert.throws(() => createPrescription({ ...input, analysis: 'x'.repeat(5001) }), /Analysis.*5000/)
  assert.throws(() => createPrescription({ ...input, additionalNotes: 'x'.repeat(5001) }), /Additional notes.*5000/)
  assert.equal(createPrescription({ ...input, analysis: '', additionalNotes: '  ' }).analysis, undefined)
})

test('preview PDF uses admin-only route and never issues a client share link', async () => {
  const urls = documentActionUrls('synthetic-id', 'ru')
  assert.equal(urls.previewPdf, '/admin/api/documents/synthetic-id/pdf?locale=ru&preview=1')
  assert.equal(urls.pdf, '/admin/api/documents/synthetic-id/pdf?locale=ru')
  const [route, actions, result] = await Promise.all([
    readFile('app/admin/api/documents/[id]/pdf/route.js', 'utf8'),
    readFile('components/consultation-document-actions.jsx', 'utf8'),
    readFile('components/consultation-result.jsx', 'utf8'),
  ])
  assert.match(route, /requireAdminRequest/)
  assert.match(route, /no-store/)
  assert.match(route, /preview.*=== '1' \? 'inline' : 'attachment'/)
  assert.match(actions, /href=\{urls\.previewPdf\}/)
  assert.match(actions, /target="_blank"/)
  assert.match(result, /consultation-report-review-hint/)
  assert.ok(result.indexOf('consultation-result-documents') < result.lastIndexOf('<CabinetLinkActions'))
})

test('bilingual practitioner editors expose both separate notes textareas', async () => {
  const [studio, standalone, service, actions] = await Promise.all([
    readFile('components/consultation-form.jsx', 'utf8'),
    readFile('components/prescription-form.jsx', 'utf8'),
    readFile('lib/consultations/service.js', 'utf8'),
    readFile('app/admin/consultations/actions.js', 'utf8'),
  ])
  for (const field of ['analysis', 'additionalNotes']) {
    assert.match(studio, new RegExp('textarea name="' + field + '"'))
    assert.match(standalone, new RegExp('textarea name="' + field + '"'))
    assert.match(service, new RegExp(field + ': input\\.' + field))
    assert.match(actions, new RegExp("'" + field + "'"))
  }
  assert.match(studio, /Анализ/)
  assert.match(studio, /Примечания/)
  assert.match(studio, /useState\(consultation\?\.analysis \?\? ''\)/)
  assert.match(studio, /useState\(consultation\?\.additionalNotes \?\? ''\)/)
})
