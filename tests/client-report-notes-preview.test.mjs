import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createConsultation, updateConsultation } from '../lib/consultations/service.js'
import { OWNER_REPORT_TEXT_TEMPLATE } from '../lib/consultations/owner-report-template.js'
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
  recommendationsText: 'CLIENT-RECOMMENDATIONS-01: follow tailored next steps',
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
  assert.equal(saved.recommendation.recommendationsText, fixture.recommendationsText)
  assert.equal(saved.recommendation.additionalNotes, fixture.additionalNotes)
  assert.equal(saved.recommendation.generalInstructions, fixture.generalInstructions)
  const projected = getClientPrescription(saved.recommendation, 'ru')
  assert.equal(projected.analysis, fixture.analysis)
  assert.equal(projected.recommendationsText, fixture.recommendationsText)
  assert.equal(projected.additionalNotes, fixture.additionalNotes)
  assert.equal(projected.generalInstructions, fixture.generalInstructions)
  assert.equal(projected.internalNotes, undefined)
  const inHistory = await store.listClientDocuments(saved.recommendation.clientId)
  assert.equal(inHistory.length, 1)
  assert.equal(inHistory[0].analysis, fixture.analysis)
  assert.equal(inHistory[0].recommendationsText, fixture.recommendationsText)
  const retry = await createConsultation({ ...fixture, newClient: { fullName: fixture.patientName, preferredLocale: 'ru' } }, { store, requestId })
  assert.equal(retry.recommendation.id, saved.recommendation.id)
  const changed = await updateConsultation(saved.recommendation, undefined, {
    ...fixture, analysis: 'STATE-MEASUREMENT-02: 5 of 10', recommendationsText: 'CLIENT-RECOMMENDATIONS-02: approved', additionalNotes: 'CLIENT-GUIDANCE-02: next steps',
  }, { store })
  assert.equal(changed.recommendation.analysis, 'STATE-MEASUREMENT-02: 5 of 10')
  assert.equal(changed.recommendation.recommendationsText, 'CLIENT-RECOMMENDATIONS-02: approved')
  assert.equal(changed.recommendation.additionalNotes, 'CLIENT-GUIDANCE-02: next steps')
  assert.equal((await store.findById(saved.recommendation.id)).additionalNotes, 'CLIENT-GUIDANCE-02: next steps')
})

test('PDF keeps custom analysis, notes and general instructions separated, including Russian labels', () => {
  const input = {
    patientName: 'Synthetic Client', practitionerName: 'Synthetic Practitioner', status: 'active',
    dateIssued: '2026-10-13', items: [{ remedySlug: 'arsenicum-album' }],
    analysis: 'ANALYSIS-SYNTHETIC-123', recommendationsText: 'RECOMMENDATIONS-SYNTHETIC-321', additionalNotes: 'NOTES-SYNTHETIC-456',
    generalInstructions: 'GENERAL-SYNTHETIC-789', internalNotes: 'PRIVATE-SYNTHETIC-000',
  }
  for (const locale of ['en', 'ru']) {
    const record = createPrescription(input)
    const projected = getClientPrescription(record, locale)
    const pdf = buildPrescriptionPdf(projected, locale, 'https://example.test')
    const source = pdf.toString('latin1')
    assert.match(source, /^%PDF-1\.7/)
    for (const phrase of ['ANALYSIS-SYNTHETIC-123', 'RECOMMENDATIONS-SYNTHETIC-321', 'NOTES-SYNTHETIC-456', 'GENERAL-SYNTHETIC-789']) {
      assert.match(source, new RegExp(phrase))
    }
    assert.doesNotMatch(source, /PRIVATE-SYNTHETIC-000/)
    assert.match(source, /HOLISTIC HOUSE/)
    assert.match(source, /0\.85 0\.91 0\.90 rg/, 'illustrated editorial lighthouse hero remains')
    assert.match(source, /q 207 0 0 81\.5 83 /, 'wide ink signature rests on white report paper')
    assert.equal(getClientPrescription(record, locale).internalNotes, undefined)
  }
  assert.equal(recommendationCopy('ru').analysis, 'АНАЛИЗ СОСТОЯНИЯ')
  assert.equal(recommendationCopy('en').additionalNotes, 'NOTES')
  assert.equal(recommendationCopy('en').recommendations, 'RECOMMENDATIONS')
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
  assert.throws(() => createPrescription({ ...input, analysis: 'x'.repeat(5001) }), /Analysis.*(?:too long|5000)/)
  assert.throws(() => createPrescription({ ...input, additionalNotes: 'x'.repeat(5001) }), /Additional notes.*(?:too long|5000)/)
  assert.throws(() => createPrescription({ ...input, recommendationsText: 'x'.repeat(5001) }), /Recommendations.*(?:too long|5000)/)
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
  assert.match(actions, /href=\{urls\.open\}/)
  assert.doesNotMatch(actions, /target="_blank"/, 'iOS preview navigation must stay in the same tab')
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
  for (const field of ['analysis', 'recommendationsText', 'additionalNotes']) {
    assert.match(studio, new RegExp('textarea name="' + field + '"'))
    assert.match(standalone, new RegExp('textarea name="' + field + '"'))
    assert.match(service, new RegExp(field + ': input\\.' + field))
    assert.match(actions, new RegExp("'" + field + "'"))
  }
  assert.match(studio, /Анализ/)
  assert.match(studio, /Примечания/)
  assert.ok(studio.indexOf('textarea name="analysis"') < studio.indexOf('textarea name="recommendationsText"'))
  assert.ok(studio.indexOf('textarea name="recommendationsText"') < studio.indexOf('textarea name="additionalNotes"'))
  assert.match(studio, /useState\(\(\) => consultation\?\.analysis \?\? getOwnerReportTextTemplate\(initialReportLocale\)\.analysis\)/)
  assert.match(studio, /useState\(\(\) => consultation\?\.additionalNotes \?\? getOwnerReportTextTemplate\(initialReportLocale\)\.additionalNotes\)/)
})

test('owner-authored consultation example is an editable draft only for new records', async () => {
  assert.match(OWNER_REPORT_TEXT_TEMPLATE.analysis, /3\/10/)
  assert.match(OWNER_REPORT_TEXT_TEMPLATE.analysis, /7\.3\/10/)
  assert.match(OWNER_REPORT_TEXT_TEMPLATE.additionalNotes, /Схема:/)
  assert.match(OWNER_REPORT_TEXT_TEMPLATE.additionalNotes, /личный дневник наблюдений/)
  assert.doesNotMatch(JSON.stringify(OWNER_REPORT_TEXT_TEMPLATE), /Litvinov Vadim/i)

  const form = await readFile('components/consultation-form.jsx', 'utf8')
  assert.match(form, /if \(!consultation\) \{/)
  assert.match(form, /getOwnerReportTextTemplate\(initialReportLocale\)\.analysis/)
  assert.match(form, /getOwnerReportTextTemplate\(initialReportLocale\)\.additionalNotes/)
  assert.match(form, /consultation-template-notice/)
  assert.match(form, /Проверьте и замените замеры/)
  assert.match(form, /consultation-template-review/)
  assert.match(form, /checked=\{templateReviewed\}/)
  assert.match(form, /required/)
  // Existing consultations still initialize from the persisted patient record.
  assert.match(form, /useState\(\(\) => consultation\?\.analysis \?\? getOwnerReportTextTemplate\(initialReportLocale\)\.analysis\)/)
  assert.match(form, /useState\(\(\) => consultation\?\.additionalNotes \?\? getOwnerReportTextTemplate\(initialReportLocale\)\.additionalNotes\)/)
})

test('the generated private PDF has a distinct clickable remedy description URL', async () => {
  const rendering = await readFile('lib/prescriptions/pdf.js', 'utf8')
  assert.match(rendering, /Подробнее о препарате/)
  assert.match(rendering, /Read remedy description/)
  assert.match(rendering, /linkWidth = measurePdfText\(linkLabel, linkSize\)/)
  assert.match(rendering, /page\.links\.push\(\{url,x:titleX,y:linkY,width:actionWidth\}\)/)
  for (const locale of ['en', 'ru']) {
    const record = createPrescription({
      patientName: 'Synthetic Client',
      practitionerName: 'Test Practitioner',
      status: 'active',
      items: [{ remedySlug: 'arsenicum-album' }],
    })
    const doc = getClientPrescription(record, locale)
    const source = buildPrescriptionPdf(doc, locale, 'https://example.test').toString('latin1')
    const expectedUrl = `https://example.test/${locale}/homeopathy/remedies/arsenicum-album`
    assert.ok(source.includes('/URI (' + expectedUrl + ')'))
    // A link on the name and a separately indicated 'Read remedy description' action.
    assert.ok((source.match(/\/Subtype \/Link/g) || []).length >= 2)
  }
})

test('documents ready keeps preview, open, download, share, print and edit controls visible', async () => {
  const [actions, styles] = await Promise.all([
    readFile('components/consultation-document-actions.jsx', 'utf8'),
    readFile('components/consultation-report.css', 'utf8'),
  ])
  assert.match(actions, /href=\{urls\.previewPdf\}/)
  assert.match(actions, /href=\{urls\.open\}/)
  assert.match(actions, /href=\{urls\.pdf\}/)
  assert.match(actions, /consultation-share-action/)
  assert.match(actions, /href=\{urls\.print\}/)
  assert.match(actions, /href=\{editHref\}/)
  assert.match(actions, /revokeLabel : reactivateLabel/)
  assert.doesNotMatch(actions, /<details/)
  assert.match(styles, /\.consultation-result \.consultation-document-actions/)
  assert.match(styles, /\.consultation-document-secondary-actions/)
})
