import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildPrescriptionPdf, buildPaymentPdf } from '../lib/prescriptions/pdf.js'
import { extractReportProgress } from '../lib/documents/report-progress.js'

const origin = 'https://example.test'
const base = {
  dateIssued: '2026-10-13',
  patientName: 'Synthetic Example',
  recommendationType: 'homeopathy',
  items: [{ displayName: 'Synthetic remedy', itemType: 'homeopathy' }],
}
const source = pdf => pdf.toString('latin1')
const countPages = pdf => (source(pdf).match(/\/Type \/Page \/Parent/g) ?? []).length

test('adaptive A4 core uses original signature inline, not a nearly empty second page', () => {
  const pdf = buildPrescriptionPdf(base, 'en', origin)
  assert.equal(countPages(pdf), 1, 'short client recommendation should fit on one A4')
  const txt = source(pdf)
  assert.match(txt, /q 120 0 0 47 83 /)
  assert.equal((txt.match(/\/Signature Do Q/g) ?? []).length, 1)
  assert.match(txt, /Synthetic Example/)
  assert.doesNotMatch(txt, /PRIVATE|internalNotes|undefined/)
})

test('real note lengths control pagination and all author text survives', () => {
  const long = buildPrescriptionPdf({
    ...base,
    patientName: 'Synthetic Long Client',
    analysis: 'Before the session: 3/10\nAfter the session: 6/10\nTarget: 7.3/10',
    additionalNotes: Array.from({length:90}, (_,i) => 'USER-NOTE-' + i + ': synthetic text visible to the client').join('\n'),
  }, 'en', origin)
  assert.ok(countPages(long) > countPages(buildPrescriptionPdf(base, 'en', origin)))
  for (const marker of ['USER-NOTE-0', 'USER-NOTE-89']) assert.ok(source(long).includes(marker))
  assert.equal((source(long).match(/\/Signature Do Q/g) ?? []).length, 1)
  assert.match(source(long), /SELF-RATED PROGRESS/)
})

test('no synthetic /10 chart appears without two explicitly supplied observations', () => {
  for (const analysis of ['', 'Only a target: 7/10', 'Before the session: 4/10']) {
    const pdf = buildPrescriptionPdf({...base,analysis}, 'en', origin)
    assert.doesNotMatch(source(pdf), /SELF-RATED PROGRESS/)
    assert.equal(extractReportProgress(analysis), null)
  }
})

test('remedy cover thumbnails are sourced only from a selected approved library remedy', () => {
  const withLibrary = source(buildPrescriptionPdf({
    ...base, items: [{ remedySlug: 'colchicum-autumnale', displayName: 'Colchicum autumnale', itemType: 'homeopathy' }],
  }, 'en', origin))
  assert.match(withLibrary, /\/RemedyPhoto1 Do Q/, 'approved source appears on cover and in appendix')
  assert.match(withLibrary, /\(SELECTED REMEDY\)/)
  const withoutLibrary = source(buildPrescriptionPdf(base, 'en', origin))
  assert.doesNotMatch(withoutLibrary, /SELECTED REMEDY/)
})

test('invoices remain on their approved template, never using recommendation rings', () => {
  const invoice = source(buildPaymentPdf({
    patientName: 'Synthetic Payer', dateIssued: '2026-10-13',
    dateOfService: '2026-10-13', service: 'Synthetic session',
    currency: 'EUR', amount: 10000, paymentStatus: 'unpaid',
  }, 'en', origin))
  assert.match(invoice, /q 89 0 0 87\.71 68 690 cm \/Lighthouse Do Q/)
  assert.doesNotMatch(invoice, /SELF-RATED PROGRESS|SELECTED REMEDY/)
})

test('mobile report and print use adaptive layouts without static page counts', () => {
  const view = readFileSync('components/prescription-document.jsx','utf8')
  const styles = readFileSync('components/consultation-report.css','utf8')
  for (const marker of ['canonical-report-hero','canonical-progress-dial','canonical-remedy-card-photo']) {
    assert.ok(view.includes(marker), marker+' is rendered from client data')
    assert.ok(styles.includes(marker), marker+' has responsive styling')
  }
  assert.match(styles, /grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(styles, /@media print/)
  assert.match(styles, /break-inside:avoid/)
  assert.match(view, /<DocumentSignature date=\{document\.dateIssued\} locale=\{locale\} compact/)
})
