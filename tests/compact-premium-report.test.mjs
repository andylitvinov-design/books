import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { extractReportProgress } from '../lib/documents/report-progress.js'
import { reportPdfFilename } from '../lib/documents/report-filename.js'
import { getOwnerReportTextTemplate } from '../lib/consultations/owner-report-template.js'
import { remedyDescriptionBlocks } from '../lib/documents/report-appendices.js'
import { buildPrescriptionPdf, buildPaymentPdf } from '../lib/prescriptions/pdf.js'

test('only explicit before/after self-ratings create progress; target stays planned', () => {
  for (const locale of ['en', 'ru']) {
    assert.deepEqual(extractReportProgress(getOwnerReportTextTemplate(locale).analysis),
      { before: 3, after: 6, target: 7.3 })
  }
  assert.equal(extractReportProgress('Interest in goal: 3/10. Next week: 6/10.'), null)
  assert.equal(extractReportProgress('After the session: engagement 6/10.'), null)
  assert.equal(extractReportProgress('Before the session: engagement 11/10.\nAfter the session: 6/10'), null)
  assert.deepEqual(extractReportProgress('Before the session: 3/10\nAfter the session: 5/10'),
    { before: 3, after: 5 })
})

test('compact report PDF renders measured values and a labeled aspirational target without rewriting notes', () => {
  const template = getOwnerReportTextTemplate('en')
  const document = {
    patientName: 'SYNTHETIC PDF TEST',
    dateIssued: '2026-10-13',
    recommendationType: 'homeopathy',
    analysis: template.analysis,
    additionalNotes: template.additionalNotes,
    items: [{ displayName: 'Synthetic remedy', itemType: 'homeopathy' }],
  }
  const pdf = buildPrescriptionPdf(document, 'en', 'https://example.test')
  const source = pdf.toString('latin1')
  assert.match(source, /143 779 Tm/)
  assert.match(source, /\(SELF-RATED PROGRESS\)/)
  assert.match(source, /\(TARGET \(PLAN\)\)/)
  for (const value of ['3/10', '6/10', '7.3/10', 'SYNTHETIC PDF TEST']) {
    assert.ok(source.includes(value), 'Missing supplied report value: ' + value)
  }
  assert.ok(source.includes('Before the session'), 'Original analysis is not replaced by the mini-chart')
  assert.ok(source.includes('You can keep a personal observation journal'))
  assert.doesNotMatch(source, /Tm \(\+380 93 478 88 27\)/)
  assert.match(source, /\/Signature Do Q/)
  assert.ok((source.match(/\/Type \/Page \/Parent/g) ?? []).length <= 2, 'short core report remains compact')
  const invoice = buildPaymentPdf({
    patientName: 'SYNTHETIC PDF TEST', dateIssued: '2026-10-13', service: 'Test',
    amount: 10000, currency: 'EUR', paymentStatus: 'unpaid',
  }, 'en').toString('latin1')
  assert.match(invoice, /190 766 Tm/)
  assert.doesNotMatch(invoice, /SELF-RATED PROGRESS/)
})

test('remedy appendix headings are legible and all narrative copy is retained', () => {
  const blocks = remedyDescriptionBlocks('❓ ОСНОВА\n\n\nИсходный авторский текст.\n\n## ЭТАП РАЗВИТИЯ\nВторая строка.')
  assert.deepEqual(blocks.filter(block => block.kind === 'subheading').map(block => block.text),
    ['ОСНОВА', 'ЭТАП РАЗВИТИЯ'])
  assert.ok(blocks.some(block => block.text === 'Исходный авторский текст.'))
  assert.ok(blocks.some(block => block.text === 'Вторая строка.'))
  assert.equal(blocks.filter(block => block.kind === 'space').length, 2)
})

test('download names are meaningful and never contain patient identity', () => {
  const report = { patientName: 'Sensitive Personal Name', dateIssued: '2026-10-13' }
  assert.equal(reportPdfFilename(report), 'HolisticHouse_Report_2026-10-13.pdf')
  assert.equal(reportPdfFilename(report, { preview: true }), 'HolisticHouse_Report_2026-10-13_Preview.pdf')
  assert.equal(reportPdfFilename({ dateIssued: '../../secret' }), 'HolisticHouse_Report_undated.pdf')
})

test('mobile HTML shares explicit progress data and print-safe visual hierarchy', () => {
  const document = readFileSync('components/prescription-document.jsx', 'utf8')
  const css = readFileSync('components/consultation-report.css', 'utf8')
  const preview = readFileSync('components/consultation-draft-preview.jsx', 'utf8')
  assert.match(document, /extractReportProgress\(document\.analysis\)/)
  assert.match(document, /canonical-progress-grid/)
  assert.match(document, /<DocumentSignature date=\{document\.dateIssued\} locale=\{locale\} compact/)
  assert.match(css, /\.canonical-progress-grid/)
  assert.match(css, /break-inside: avoid/)
  assert.match(preview, /new File\(\[blob\], filename/)
  assert.match(preview, /download=\{previewFilename\}/)
})
