import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPaymentPdf, buildPrescriptionPdf, wrapPdfText, measurePdfText } from '../lib/prescriptions/pdf.js'

const recommendation = { patientName: 'Synthetic Client', dateIssued: '2026-09-08', recommendationNumber: 'HR-TEST', items: [{ displayName: 'Arsenicum album', remedyPath: '/en/homeopathy/remedies/arsenicum-album', potency: '30C', granules: '5', purpose: 'Manually entered purpose', sequence: 'First stage', notes: 'PRIVATE-NOTE' }], generalInstructions: 'SYNTHETIC-GUIDANCE', followUp: '2026-09-15' }

test('canonical PDF has A4 letterhead, lighthouse and active remedy link without internal notes', () => {
  const source = buildPrescriptionPdf(recommendation, 'en', 'https://example.test').toString('latin1')
  assert.match(source, /\/MediaBox \[0 0 595.28 841.89\]/)
  assert.match(source, /ANDRII LITVINOV/)
  assert.match(source, /\/Subtype \/Image/)
  assert.match(source, /190 766 Tm/)
  assert.match(source, /68 668 m/)
  assert.match(source, /\/URI \(https:\/\/example.test\/en\/homeopathy\/remedies\/arsenicum-album\)/)
  assert.doesNotMatch(source, /PRIVATE-NOTE/)
  assert.match(source, /5 granules/)
})

test('font metrics preserve newlines and wrap long unbroken values within content width', () => {
  const lines = wrapPdfText(`WWW ${'W'.repeat(300)}\nSecond line\n\nLast`, 180, 10)
  assert.ok(lines.every(line => measurePdfText(line, 10) <= 180))
  assert.ok(lines.includes('Second line'))
  assert.ok(lines.includes(''))
})

test('English payment supports Cyrillic names and unpaid document says INVOICE', () => {
  const document = { patientName: 'Тестовый Клиент', dateIssued: '2026-09-08', dateOfService: '2026-09-08', amount: 12550, currency: 'CAD', service: 'Synthetic consultation', paymentStatus: 'unpaid' }
  const source = buildPaymentPdf(document, 'en', 'https://example.test').toString('latin1')
  assert.match(source, /INVOICE/)
  assert.match(source, /\/ToUnicode/)
  assert.match(source, /Amount due: CAD 125.50/)
  assert.doesNotMatch(source, /NaN|undefined/)
  assert.doesNotMatch(source, /I confirm that I received/)
})

test('payment PDF includes explicitly supplied method for invoices and receipts, omits absent method', () => {
  const document = { patientName: 'Synthetic Client', dateIssued: '2026-09-08', dateOfService: '2026-09-08', amount: 12550, currency: 'CAD', service: 'Synthetic consultation' }
  for (const paymentStatus of ['unpaid', 'received']) {
    const source = buildPaymentPdf({ ...document, paymentStatus, paymentMethod: 'Synthetic transfer' }, 'en').toString('latin1')
    assert.ok(source.includes('Payment method: Synthetic transfer'), 'PDF should contain the explicitly supplied method')
    const legacy = buildPaymentPdf({ ...document, paymentStatus }, 'en').toString('latin1')
    assert.doesNotMatch(legacy, /Payment method:/)
  }
})


test('Bach PDF renders the Bach title and automatic mixture instructions', () => {
  const document = {
    patientName: 'Synthetic Client',
    dateIssued: '2026-09-23',
    recommendationType: 'bach',
    items: [{ displayName: 'Mimulus' }, { displayName: 'Larch' }],
  }
  const source = buildPrescriptionPdf(document, 'en', 'https://example.test').toString('latin1')
  assert.match(source, /BACH FLOWER ESSENCE RECOMMENDATION/)
  assert.match(source, /Prepare a mixture: add 5 drops of each selected essence/)
  assert.match(source, /Take 2/)
  assert.match(source, /Course: 2 weeks/)
})

test('Homeopathy PDF renders the compact per-remedy schedule and stress guidance', () => {
  const document = {
    patientName: 'Synthetic Client',
    dateIssued: '2026-09-23',
    recommendationType: 'homeopathy',
    items: [{ displayName: 'Aconitum', itemType: 'homeopathy', potency: '30', granules: '5', timesPerDay: '3' }],
  }
  const source = buildPrescriptionPdf(document, 'en', 'https://example.test').toString('latin1')
  assert.match(source, /potency 30/)
  assert.match(source, /5 granules/)
  assert.match(source, /3/)
  assert.match(source, /times a day and additionally during moments of stress/)
  assert.match(source, /Course: 2 weeks/)
})


test('Mixed PDF groups Homeopathy and Bach items and renders both guidance sections', () => {
  const document = {
    patientName: 'Synthetic Client',
    dateIssued: '2026-09-23',
    recommendationType: 'mixed',
    items: [
      { displayName: 'Aconitum', itemType: 'homeopathy', potency: '30', granules: '5', timesPerDay: '3' },
      { displayName: 'Mimulus', itemType: 'bach' },
    ],
  }
  const source = buildPrescriptionPdf(document, 'en', 'https://example.test').toString('latin1')
  assert.match(source, /INTEGRATED RECOMMENDATION/)
  assert.match(source, /HOMEOPATHY/)
  assert.match(source, /BACH ESSENCES/)
  assert.match(source, /potency 30/)
  assert.match(source, /Prepare a mixture: add 5 drops of each selected essence/)
})
