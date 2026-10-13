import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

const origin = 'https://example.test'
const example = {
  patientName: 'Synthetic Client',
  dateIssued: '2026-10-13',
  recommendationNumber: 'TEST-2026-10',
  recommendationType: 'homeopathy',
  analysis: 'SYNTHETIC-ANALYSIS-VISIBILITY',
  additionalNotes: 'SYNTHETIC-GUIDANCE-VISIBILITY',
  followUp: 'Practitioner-entered follow-up',
  items: [{
    displayName: 'Synthetic remedy',
    remedyPath: '/en/homeopathy/remedies/synthetic-remedy',
    itemType: 'homeopathy',
    potency: 'SYNTHETIC-POTENCY',
    purpose: 'SYNTHETIC-PURPOSE',
    notes: 'PRIVATE-PRACTITIONER-ONLY',
  }],
}

test('client PDF uses warm Holistic House styling without losing text, links or privacy', () => {
  for (const locale of ['en', 'ru']) {
    const source = buildPrescriptionPdf(example, locale, origin).toString('latin1')
    assert.match(source, /^%PDF-1\.7/)
    assert.match(source, /0\.39 0\.21 0\.30 rg/)
    assert.match(source, /0\.984 0\.961 0\.941 rg/)
    for (const value of [
      'Synthetic Client', 'TEST-2026-10', 'SYNTHETIC-ANALYSIS-VISIBILITY',
      'SYNTHETIC-GUIDANCE-VISIBILITY', 'SYNTHETIC-PURPOSE',
    ]) assert.ok(source.includes(value), `Missing original report field: ${value}`)
    assert.match(source, /\/URI \(https:\/\/example\.test\/en\/homeopathy\/remedies\/synthetic-remedy\)/)
    assert.doesNotMatch(source, /PRIVATE-PRACTITIONER-ONLY/)
    assert.match(source, /\/MediaBox \[0 0 595\.28 841\.89\]/)
    assert.match(source, /\/ToUnicode/)
    if (locale === 'en') assert.match(source, /PERSONAL REPORT/)
  }
})

test('long remedy headings and names wrap before PDF sections; invoice layout stays unchanged', () => {
  const source = buildPrescriptionPdf({
    ...example,
    patientName: 'Synthetic ' + 'VeryLongClientName'.repeat(13),
    items: [{...example.items[0], displayName: 'LONG REMEDY NAME ' + 'W'.repeat(260)}],
  }, 'en', origin).toString('latin1')
  assert.match(source, /\/Type \/Page\b/)
  assert.match(source, /LONG REMEDY NAME/)
  assert.match(source, /SYNTHETIC-GUIDANCE-VISIBILITY/)
  assert.match(source, /\/URI \(https:\/\/example\.test\/en\/homeopathy\/remedies\/synthetic-remedy\)/)

  const invoice = buildPaymentPdf({
    patientName: 'Synthetic Client', dateIssued: '2026-10-13',
    dateOfService: '2026-10-13', service: 'Synthetic appointment',
    amount: 15000, currency: 'CAD', paymentStatus: 'unpaid',
  }, 'en', origin).toString('latin1')
  assert.match(invoice, /0\.926 0\.970 0\.969 rg/)
  assert.match(invoice, /68 613 459\.28 44 re f/)
  assert.doesNotMatch(invoice, /PERSONAL REPORT/)
})

test('HTML and print report share the visible client layout and original remedy attachments', async () => {
  const [jsx, css] = await Promise.all([
    readFile('components/prescription-document.jsx', 'utf8'),
    readFile('components/consultation-report.css', 'utf8'),
  ])
  for (const selector of [
    'canonical-report-heading', 'canonical-client', 'canonical-remedy-number',
    'canonical-remedy-fields', 'canonical-remedy-profile-action',
    'canonical-report-analysis', 'canonical-report-notes', 'canonical-follow-up',
  ]) {
    assert.ok(jsx.includes(selector), `Missing client structure: ${selector}`)
    assert.ok(css.includes(selector), `Missing client style: ${selector}`)
  }
  assert.match(jsx, /<RemedyContent[\s\S]+expandSupplementary/)
  assert.match(jsx, /<img src=\{remedy\.primary_image\}/)
  assert.match(jsx, /<DistanceHomeopathyGuide locale=\{locale\} embedded report \/>/)
  assert.match(css, /@media print/)
  assert.match(css, /@page \{ size: A4/)
  assert.match(css, /\.canonical-remedy-profile-photo \{ break-inside: avoid/)
})
