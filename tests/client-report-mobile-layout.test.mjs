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
    'MOBILE-OBSERVATION-' + (index + 1) + ': synthetic notes that exercise comfortable PDF pagination without changing client advice.'
  ).join('\n'),
  additionalNotes: 'SYNTHETIC-PRACTITIONER-EDITED-NOTES',
  internalNotes: 'PRIVATE-INTERNAL-NOTES-NOT-FOR-CLIENT',
  items: [{ displayName: 'Synthetic Remedy', remedyPath: '/en/homeopathy/remedies/synthetic-remedy' }],
}

test('large-text client PDF uses a compact continuation header and preserves privacy', () => {
  const source = buildPrescriptionPdf(sample, 'en', origin).toString('latin1')
  const pages = source.split('/Type /Page /Parent').length - 1
  assert.ok(pages >= 2, 'long report should exercise continuation pages')
  assert.equal(source.split('/Lighthouse Do Q').length - 1, 1,
    'one approved lighthouse belongs to the first-page identity, not repeated over the coastal hero or continuations')
  assert.match(source, /q 82 0 0 80\.81 68 724 cm \/Lighthouse Do Q/, 'approved first-page logo geometry remains')
  assert.ok(/q 200 0 0 135 327 579 cm \/CoastalPhoto Do Q/.test(source) ||
    /0\.94 0\.91 0\.83 rg/.test(source), 'coastal artwork survives without a duplicate raster lighthouse')
  assert.ok(source.includes('164 788 Tm'), 'recommendation has the restored readable premium letterhead')
  assert.ok(source.includes('68 801 Tm'), 'continuation has an uncluttered running brand header')
  assert.ok(source.includes('11.7 Tf'), 'state analysis uses larger A4 text')
  assert.ok(source.includes('MOBILE-OBSERVATION-44'), 'last line is preserved')
  assert.ok(source.includes('SYNTHETIC-PRACTITIONER-EDITED-NOTES'))
  assert.ok(source.includes('/URI (https://example.test/en/homeopathy/remedies/synthetic-remedy)'))
  assert.ok(!source.includes('PRIVATE-INTERNAL-NOTES-NOT-FOR-CLIENT'))
})

test('invoice retains its approved typography and layout', () => {
  const payment = buildPaymentPdf({
    patientName: 'Synthetic Client', dateIssued: '2026-10-13', dateOfService: '2026-10-13',
    currency: 'CAD', amount: 10000, service: 'Synthetic service', paymentStatus: 'unpaid',
  }, 'en', origin).toString('latin1')
  assert.ok(payment.includes('68 613 459.28 44 re f'))
  assert.ok(payment.includes('190 766 Tm'))
  assert.ok(!payment.includes('68 797 Tm'))
})

test('mobile styles retain language choice, readable HTML and each action', async () => {
  const [studio, language, report, actions] = await Promise.all([
    readFile('components/consultation-studio.css', 'utf8'),
    readFile('components/report-language-picker.css', 'utf8'),
    readFile('components/consultation-report.css', 'utf8'),
    readFile('components/consultation-document-actions.jsx', 'utf8'),
  ])
  assert.ok(studio.includes('--studio-accent: #692e44'))
  assert.ok(studio.includes('.consultation-studio-progress li'))
  assert.ok(language.includes('Compact, high-contrast language selector'))
  assert.ok(language.includes('.report-language-picker-choices'))
  assert.ok(report.includes('Client reading surface: larger body type'))
  assert.ok(report.includes('.canonical-report-analysis p'))
  for (const action of ['previewPdf', 'open', 'pdf', 'copy', 'print', 'editHref', 'revoke']) {
    assert.ok(actions.includes(action), 'Missing action: ' + action)
  }
})
