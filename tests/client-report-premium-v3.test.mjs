import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { clientReportHeading } from '../lib/documents/report-heading.js'
import { documentActionUrls } from '../lib/consultations/result-actions.js'
import { buildPrescriptionPdf, buildPaymentPdf } from '../lib/prescriptions/pdf.js'

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
  assert.equal(clientReportHeading('en', 'mixed'), 'Personal recommendations')
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
