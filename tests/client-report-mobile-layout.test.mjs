import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

const origin = 'https://example.test'
const sample = {
  patientName: 'Synthetic Mobile Report Client',
  dateIssued: '2026-10-13',
  recommendationType: 'homeopathy',
  analysis: Array.from({ length: 44 }, (_, index) =>
    `MOBILE-OBSERVATION-${index + 1}: synthetic text to verify legible pagination and continuation lines without changing any client medical advice.`
  ).join('\\n'),
  additionalNotes: 'SYNTHETIC-PRACTITIONER-EDITED-NOTES',
  internalNotes: 'PRIVATE-INTERNAL-NOTES-NOT-FOR-CLIENT',
  items: [{ displayName: 'Synthetic Remedy', remedyPath: '/en/homeopathy/remedies/synthetic-remedy' }],
}

test('large-text client PDF paginates with a compact continuation header and preserves security', () => {
  const source = buildPrescriptionPdf(sample, 'en', origin).toString('latin1')
  const pages = (source.match(/\\/Type \\/Page \\/Parent/g) ?? []).length
  assert.ok(pages >= 2, 'long report should exercise continuation pages')
  assert.equal((source.match(/\\/Lighthouse Do Q/g) ?? []).length, 1, 'repeat only the compact text header, not the full-size letterhead')
  assert.match(source, /190 766 Tm/, 'the cover retains the approved letterhead')
  assert.match(source, /68 797 Tm/, 'continuation page has a readable running header')
  assert.match(source, /11\\.7 Tf/, 'analysis uses larger A4 text')
  assert.ok(source.includes('MOBILE-OBSERVATION-44'), 'last line is preserved')
  assert.match(source, /SYNTHETIC-PRACTITIONER-EDITED-NOTES/)
  assert.match(source, /\\/URI \\(https:\\/\\/example\\.test\\/en\\/homeopathy\\/remedies\\/synthetic-remedy\\)/)
  assert.doesNotMatch(source, /PRIVATE-INTERNAL-NOTES-NOT-FOR-CLIENT/)
})

test('invoice geometry and its original compact font settings remain unchanged', () => {
  const payment = buildPaymentPdf({
    patientName: 'Synthetic Client', dateIssued: '2026-10-13', dateOfService: '2026-10-13',
    currency: 'CAD', amount: 10000, service: 'Synthetic service', paymentStatus: 'unpaid',
  }, 'en', origin).toString('latin1')
  assert.match(payment, /68 613 459\\.28 44 re f/)
  assert.match(payment, /190 766 Tm/)
  assert.doesNotMatch(payment, /68 797 Tm/)
})

test('mobile styles keep bilingual selection, readable HTML and every result action', async () => {
  const [studio, language, report, actions] = await Promise.all([
    readFile('components/consultation-studio.css', 'utf8'),
    readFile('components/report-language-picker.css', 'utf8'),
    readFile('components/consultation-report.css', 'utf8'),
    readFile('components/consultation-document-actions.jsx', 'utf8'),
  ])
  assert.match(studio, /--studio-accent: #692e44/)
  assert.match(studio, /\\.consultation-studio-progress li/)
  assert.match(language, /Compact, high-contrast language selector/)
  assert.match(language, /\\.report-language-picker-choices/)
  assert.match(report, /Client reading surface: larger body type/)
  assert.match(report, /\\.canonical-document \\.canonical-report-analysis p/)
  for (const action of ['previewPdf', 'open', 'pdf', 'copy', 'print', 'editHref', 'revoke']) {
    assert.ok(actions.includes(action), `Missing action: ${action}`)
  }
})
