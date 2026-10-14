import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { clientReportHeading } from '../lib/documents/report-heading.js'
import { documentActionUrls } from '../lib/consultations/result-actions.js'
import { buildPrescriptionPdf, buildPaymentPdf } from '../lib/prescriptions/pdf.js'
import { randomUUID } from 'node:crypto'
import { reportFollowUpCopy, reportFollowUpDetails } from '../lib/documents/recommendation.js'
import { createPrescription, getClientPrescription, updatePrescription } from '../lib/prescriptions/service.js'
import { createConsultation, updateConsultation } from '../lib/consultations/service.js'
import { createConsultationDraftPreview } from '../lib/consultations/draft-preview.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'

const id = '30000000-0000-4000-8000-000000000001'

test('Preview / Open navigates to a distinct owner-only full report instead of itself', async () => {
  const [adminPage, adminControls, reader, readerStyle, actions, routes] = await Promise.all([
    readFile('app/admin/documents/[id]/page.js', 'utf8'),
    readFile('components/admin-document-panels.jsx', 'utf8'),
    readFile('app/admin/documents/[id]/view/page.js', 'utf8'),
    readFile('app/admin/documents/[id]/view/viewer.module.css', 'utf8'),
    readFile('components/consultation-document-actions.jsx', 'utf8'),
    readFile('lib/consultations/result-actions.js', 'utf8'),
  ])
  for (const locale of ['en', 'ru']) {
    assert.equal(documentActionUrls(id, locale).open, `/admin/documents/${id}/view?locale=${locale}`)
    assert.equal(documentActionUrls(id, locale).print, `/admin/documents/${id}/view?locale=${locale}&print=1`)
    assert.equal(documentActionUrls(id, locale).previewPdf, `/admin/api/documents/${id}/pdf?locale=${locale}&preview=1`)
  }
  assert.match(adminPage, /id="document-preview"/)
  assert.match(adminControls, /\/view\?locale=\$\{locale\}/)
  assert.doesNotMatch(adminControls, /href=\{\`\/admin\/documents\/\$\{record.id\}\?locale=/)
  assert.match(reader, /requireAdminRequest\(\)/)
  assert.match(reader, /getClientPrescription\(\{ \.\.\.record, status: 'active' \}, locale\)/)
  assert.match(reader, /getClientPaymentDocument\(\{ \.\.\.record, status: 'active' \}, locale\)/)
  assert.match(reader, /<PrescriptionDocument document=\{doc\} locale=\{locale\} admin embedded/)
  assert.match(reader, /<PaymentDocument document=\{doc\} locale=\{locale\} admin embedded/)
  assert.match(reader, /autoPrint=\{query.print === '1'\}/)
  assert.match(reader, /referrer: 'no-referrer'/)
  assert.match(reader, /robots: \{ index: false, follow: false \}/)
  assert.match(readerStyle, /@media\s*\(max-width:\s*600px\)/)
  assert.match(readerStyle, /@media print/)
  assert.match(actions, /urls\.open/)
  assert.match(routes, /\/admin\/documents\//)
})

test('new adaptive premium report keeps two factual measurements, full authored analysis and appendices', async () => {
  const [jsx, css, pdf] = await Promise.all([
    readFile('components/prescription-document.jsx', 'utf8'),
    readFile('components/consultation-report.css', 'utf8'),
    readFile('lib/prescriptions/pdf.js', 'utf8'),
  ])
  assert.equal(clientReportHeading('ru', 'homeopathy'), 'Гомеопатическая рекомендация')
  assert.equal(clientReportHeading('en', 'homeopathy'), 'Homeopathic recommendation')
  assert.equal(clientReportHeading('ru', 'bach'), 'Рекомендация по эссенциям Баха')
  assert.equal(clientReportHeading('en', 'mixed'), 'Integrated recommendation')
  assert.match(jsx, /<h1>\{reportHeading\}<\/h1>/)
  assert.match(jsx, /canonical-report-brandline/)
  assert.match(jsx, /canonical-report-progress|canonical-progress/)
  assert.match(jsx, /key: 'before'/)
  assert.match(jsx, /key: 'after'/)
  assert.doesNotMatch(jsx, /key: 'target'/)
  for (const preserved of ['document.analysis', 'document.additionalNotes', 'document.generalInstructions', 'document.followUp', 'fullSource', 'selectedProfiles', 'includeDistanceHomeopathy'])
    assert.ok(jsx.includes(preserved), 'missing original source field: ' + preserved)
  assert.match(css, /Premium client report v3/)
  assert.match(css, /--report-plum: #5b2e46/)
  assert.match(css, /--report-teal: #287f7c/)
  assert.match(css, /canonical-report-private-label/)
  assert.match(css, /canonical-progress-item--after/)
  assert.match(css, /@media print/)
  assert.match(pdf, /clientReportHeading\(locale, document.recommendationType\)/)
  assert.match(pdf, /exact selected remedy|remedyDescriptionBlocks/)
})

test('PDF title parity keeps privacy, original source and all original remedy source text', () => {
  const original = {
    patientName: 'Synthetic Client', dateIssued: '2026-10-13',
    recommendationType: 'homeopathy', analysis: 'Before: tension 3/10\nAfter session: tension 6/10',
    additionalNotes: 'SYNTHETIC AUTHOR NOTE', internalNotes: 'PRIVATE-INTERNAL-NOTES',
    items: [{ displayName: 'Colchicum autumnale', remedySlug: 'colchicum-autumnale' }],
  }
  const pdf = buildPrescriptionPdf(original, 'en', 'https://example.invalid').toString('latin1')
  assert.match(pdf, /^%PDF-1\.7/)
  assert.ok(pdf.includes('PERSONAL REPORT'))
  assert.ok(pdf.includes('SYNTHETIC AUTHOR NOTE'))
  assert.ok(!pdf.includes('PRIVATE-INTERNAL-NOTES'))
  assert.ok(pdf.includes('APPENDIX'))
  assert.ok(pdf.includes('/Subtype /Image'))
  assert.ok(!pdf.includes('TARGET'))
  const invoice = buildPaymentPdf({
    patientName: 'Synthetic Client', dateIssued: '2026-10-13', amount: 15000,
    currency: 'CAD', service: 'Synthetic consultation', paymentStatus: 'unpaid',
  }, 'en', 'https://example.invalid').toString('latin1')
  assert.ok(invoice.includes('68 613 459.28 44 re f'), 'invoice geometry must remain unchanged')
})

test('follow-up session date is a real optional ISO day with identical localized client-facing copy', () => {
  assert.equal(reportFollowUpCopy('ru').title, 'Дата повторной сессии')
  assert.match(reportFollowUpCopy('ru').description, /Напишите мне в этот день о своём состоянии/)
  assert.match(reportFollowUpCopy('en').description, /complimentary follow-up/)
  assert.equal(reportFollowUpDetails('2026-10-27', 'ru').displayDate, '27 октября 2026 г.')
  assert.match(reportFollowUpDetails('2026-10-27', 'en').displayDate, /October.*27|27.*October/)
  assert.equal(reportFollowUpDetails('', 'en'), undefined)
  assert.equal(reportFollowUpDetails('2026-02-30', 'ru'), undefined)
  const base = { patientName: 'Synthetic Follow-up', practitionerName: 'Test Practitioner', items: [{ remedySlug: 'arsenicum-album' }], status: 'active' }
  assert.throws(() => createPrescription({ ...base, followUpDate: '2026-02-30' }), /Follow-up session date.*ISO date/)
  assert.throws(() => createPrescription({ ...base, followUpDate: 'next week' }), /Follow-up session date.*ISO date/)
  const saved = createPrescription({ ...base, followUpDate: '2026-10-27', followUp: 'Additional legacy follow-up note', internalNotes: 'OWNER-ONLY-SECRET' })
  const client = getClientPrescription(saved, 'en')
  assert.equal(client.followUpDate, '2026-10-27')
  assert.equal(client.followUp, 'Additional legacy follow-up note')
  assert.equal(client.internalNotes, undefined)
  const pdf = buildPrescriptionPdf(client, 'en', 'https://example.invalid').toString('latin1')
  assert.ok(pdf.includes('Follow-up session date'))
  assert.ok(pdf.includes('Please write to me on this day'))
  assert.ok(pdf.includes('Additional legacy follow-up note'))
  assert.ok(!pdf.includes('OWNER-ONLY-SECRET'))
  const cleared = updatePrescription(saved, { ...base, followUpDate: '', followUp: '' })
  assert.equal(cleared.followUpDate, undefined)
  assert.equal(getClientPrescription(cleared, 'en').followUpDate, undefined)
})

test('consultation date survives create, draft PDF preview, edit and persisted client-safe projection', async () => {
  const store = createMemoryPrescriptionStore()
  const input = {
    patientName: 'Synthetic Client', consultationDate: '2026-10-13',
    languagePreference: 'ru', includeRecommendation: true, includeInvoice: false,
    items: [{ remedySlug: 'arsenicum-album' }],
    followUpDate: '2026-10-27', additionalNotes: 'Synthetic observation plan',
  }
  const draft = await createConsultationDraftPreview({ ...input, clientMode: 'new' }, { store, kind: 'recommendation', locale: 'ru' })
  assert.equal(draft.followUpDate, input.followUpDate)
  const created = await createConsultation({
    ...input, newClient: { fullName: input.patientName, preferredLocale: 'ru' },
  }, { store, requestId: randomUUID() })
  assert.equal(created.recommendation.followUpDate, input.followUpDate)
  assert.equal((await store.findById(created.recommendation.id)).followUpDate, input.followUpDate)
  assert.equal(getClientPrescription(created.recommendation, 'ru').followUpDate, input.followUpDate)
  const updated = await updateConsultation(created.recommendation, undefined, {
    ...input, followUpDate: '', clientId: created.recommendation.clientId,
  }, { store })
  assert.equal(updated.recommendation.followUpDate, undefined)
  assert.equal((await store.findById(created.recommendation.id)).followUpDate, undefined)
})

test('both practitioner report constructors, unsaved preview and HTML/PDF include date safely', async () => {
  const paths = [
    'components/consultation-form.jsx',
    'components/prescription-form.jsx',
    'components/prescription-document.jsx',
    'lib/prescriptions/pdf.js',
    'app/admin/consultations/actions.js',
    'app/admin/prescriptions/actions.js',
    'app/admin/api/consultations/preview/route.js',
    'lib/consultations/service.js',
    'lib/prescriptions/service.js',
  ]
  const [studio, standalone, html, pdf, consultationAction, standaloneAction, draftRoute, service, prescriptionService] =
    await Promise.all(paths.map((path) => readFile(path, 'utf8')))
  assert.match(studio, /name="followUpDate"/)
  assert.match(standalone, /name="followUpDate"/)
  assert.match(studio, /reportFollowUpCopy\(reportLocale\)\.description/)
  assert.match(standalone, /reportFollowUpCopy\(reportLocale\)\.description/)
  assert.match(html, /followUpSession\.displayDate/)
  assert.match(html, /followUpSession\.description/)
  assert.match(pdf, /followUpSession\.displayDate/)
  assert.match(pdf, /followUpSession\.description/)
  assert.match(consultationAction, /'followUpDate'/)
  assert.match(standaloneAction, /formData\.get\('followUpDate'\)/)
  assert.match(draftRoute, /'followUpDate'/)
  assert.match(service, /followUpDate: input\.followUpDate/)
  assert.match(prescriptionService, /followUpDate: record\.followUpDate/)
})
