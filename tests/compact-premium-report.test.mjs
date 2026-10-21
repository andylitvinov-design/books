import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { extractReportProgress, resolveReportProgress } from '../lib/documents/report-progress.js'
import { reportPdfFilename } from '../lib/documents/report-filename.js'
import { getOwnerReportTextTemplate } from '../lib/consultations/owner-report-template.js'
import { remedyDescriptionBlocks } from '../lib/documents/report-appendices.js'
import { getRemedy } from '../data/remedies.js'
import { buildPrescriptionPdf, buildPaymentPdf } from '../lib/prescriptions/pdf.js'

test('only explicit start/end self-ratings create two measured values', () => {
  for (const locale of ['en', 'ru']) {
    assert.deepEqual(extractReportProgress(getOwnerReportTextTemplate(locale).analysis),
      { before: 3, after: 6 })
  }
  assert.equal(extractReportProgress('Interest in goal: 3/10. Next week: 6/10.'), null)
  assert.equal(extractReportProgress('After the session: engagement 6/10.'), null)
  assert.equal(extractReportProgress('Before the session: engagement 11/10.\nAfter the session: 6/10'), null)
  assert.deepEqual(extractReportProgress('Before the session: 3/10\nAfter the session: 5/10'),
    { before: 3, after: 5 })
})

test('compact PDF draws only start/end and preserves the complete authored analysis', () => {
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
  assert.match(source, /164 788 Tm/, 'restored premium practitioner masthead anchors editorial cover')
  assert.match(source, /\(SELF-RATED PROGRESS\)/)
  assert.match(source, /\(START\)/)
  assert.match(source, /\(END\)/)
  assert.ok(!source.includes('TARGET \\(PLAN\\)'), 'the third planned score is not displayed')
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
  const approved = remedyDescriptionBlocks(getRemedy('ru', 'veratrum-album').description)
  const headings = approved.filter(block => block.kind === 'subheading').map(block => block.text)
  for (const name of ['ОСНОВА', 'ПОКАЗАНИЯ', 'АРХЕТИПЫ', 'ОБРАЗЫ', 'ЭФФЕКТ']) {
    assert.ok(headings.includes(name), 'Missing approved source heading: ' + name)
  }
  assert.ok(approved.some(block => block.text.startsWith('• Арлекин')), 'Decorative list markers become proper bullets')
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
  assert.match(document, /import \{ resolveReportProgress \} from '@\/lib\/documents\/report-progress'/)
  assert.match(document, /const progress = resolveReportProgress\(document\)/)
  const analysis = 'Before: 2/10\nAfter: 3/10'
  assert.deepEqual(resolveReportProgress({ analysis, progressBefore: 0, progressAfter: 10 }),
    { before: 0, after: 10 }, 'saved boundary scores take priority, including zero')
  assert.deepEqual(resolveReportProgress({ analysis, progressBefore: '4,5', progressAfter: '8.5' }),
    { before: 4.5, after: 8.5 })
  assert.deepEqual(resolveReportProgress({ analysis }), { before: 2, after: 3 }, 'legacy narrative fallback')
  for (const scores of [
    { progressBefore: null, progressAfter: null },
    { progressBefore: '', progressAfter: '' },
    { progressBefore: 0 }, { progressAfter: 10 },
    ...[-1, 11, '10.1', '3.25', 'NaN'].map(progressBefore => ({ progressBefore, progressAfter: 6 })),
  ]) assert.equal(resolveReportProgress({ analysis, ...scores }), null,
    'cleared, partial or invalid saved ratings must not resurrect narrative scores')
  assert.equal(resolveReportProgress({ analysis: 'Before: 2/10\nFuture goal: 8/10' }), null)
  assert.match(document, /canonical-progress-grid/)
  assert.match(document, /<DocumentSignature date=\{document\.dateIssued\} locale=\{locale\} compact/)
  assert.match(css, /\.canonical-progress-grid/)
  assert.match(css, /break-inside: avoid/)
  assert.match(preview, /new File\(\[blob\], filename/)
  assert.match(preview, /download=\{previewFilename\}/)
})
