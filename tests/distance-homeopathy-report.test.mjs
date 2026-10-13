import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { createConsultation, updateConsultation } from '../lib/consultations/service.js'
import { distanceHomeopathyAppendixBlocks, remedyDescriptionBlocks } from '../lib/documents/report-appendices.js'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'
import { createPrescription, getClientPrescription } from '../lib/prescriptions/service.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { getRemedy } from '../data/remedies.js'

const origin = 'https://example.test'
const patientName = 'Synthetic Report Client'
const items = [{ remedySlug: 'colchicum-autumnale' }, { remedySlug: 'ambra-grisea' }]

function clientDocument(includeDistanceHomeopathy = false) {
  return getClientPrescription(createPrescription({
    patientName,
    practitionerName: 'Synthetic Practitioner',
    dateIssued: '2026-10-13',
    status: 'active',
    items,
    analysis: 'SYNTHETIC-ANALYSIS-ONLY',
    internalNotes: 'NEVER-EXPOSE-THIS',
    includeDistanceHomeopathy,
  }), 'en')
}

test('distance-homeopathy selection is saved with prescriptions and not with invoices', async () => {
  const store = createMemoryPrescriptionStore()
  const input = {
    patientName,
    consultationDate: '2026-10-13', languagePreference: 'en',
    includeRecommendation: true, includeInvoice: false,
    includeDistanceHomeopathy: true, items,
  }
  const saved = await createConsultation({
    ...input, newClient: { fullName: patientName, preferredLocale: 'en' },
  }, { store, requestId: randomUUID() })
  assert.ok(saved.recommendation)
  assert.equal(saved.payment, undefined)
  assert.equal(saved.recommendation.includeDistanceHomeopathy, true)
  assert.equal(getClientPrescription(saved.recommendation, 'en').includeDistanceHomeopathy, true)
  assert.equal((await store.findById(saved.recommendation.id)).includeDistanceHomeopathy, true)

  const updated = await updateConsultation(saved.recommendation, undefined, {
    ...input, includeDistanceHomeopathy: false,
  }, { store })
  assert.equal(updated.recommendation.includeDistanceHomeopathy, false)
  assert.equal((await store.findById(saved.recommendation.id)).includeDistanceHomeopathy, false)
})

test('client PDF embeds each selected canonical original remedy text and photo', () => {
  const client = clientDocument(false)
  assert.deepEqual(client.items.map(item => item.remedySlug), ['colchicum-autumnale', 'ambra-grisea'])
  for (const slug of ['colchicum-autumnale', 'ambra-grisea']) {
    const remedy = getRemedy('en', slug)
    assert.ok(remedy.description.length > 100)
    assert.match(remedy.primary_image, /^\/media\/remedies\/.*\.jpg$/)
    assert.ok(remedyDescriptionBlocks(remedy.description).some(item => item.text))
  }
  const pdf = buildPrescriptionPdf(client, 'en', origin)
  const source = pdf.toString('latin1')
  assert.match(source, /^%PDF-1\.7/)
  assert.match(source, /APPENDIX/)
  assert.match(source, /Colchicum Autumnale/)
  assert.match(source, /Ambra Grisea/i)
  assert.match(source, /\/RemedyPhoto1 Do Q/)
  assert.match(source, /\/RemedyPhoto2 Do Q/)
  assert.match(source, /\/Filter \/DCTDecode/)
  assert.match(source, /\/URI \(https:\/\/example\.test\/en\/homeopathy\/remedies\/colchicum-autumnale\)/)
  assert.doesNotMatch(source, /NEVER-EXPOSE-THIS/)
  assert.doesNotMatch(source, /View the original illustrated guide/)
})

test('selected full guide is appended after remedy profiles, and disabled guide stays absent', () => {
  const off = buildPrescriptionPdf(clientDocument(false), 'en', origin).toString('latin1')
  const on = buildPrescriptionPdf(clientDocument(true), 'en', origin).toString('latin1')
  const marker = 'Distance homeopathy. How does the process work?'
  assert.equal(off.includes(marker), false)
  assert.equal(on.includes(marker), true)
  assert.ok(on.indexOf(marker) > on.indexOf('APPENDIX'))
  // The complete appendix is now in the PDF itself: no external article URI.
  // Hyperlinks to individual remedies remain part of the primary report.
  assert.doesNotMatch(on, /\/URI \(https:\/\/example\.test\/en\/library\/distance-homeopathy\)/)
  assert.match(on, /\/URI \(https:\/\/example\.test\/en\/homeopathy\/remedies\/colchicum-autumnale\)/)
  assert.ok(on.length > off.length)

  const noOrigin = buildPrescriptionPdf(clientDocument(true), 'en')
  assert.match(noOrigin.toString('latin1'), /^%PDF-1\.7/)
  const ru = distanceHomeopathyAppendixBlocks('ru')
  const en = distanceHomeopathyAppendixBlocks('en')
  assert.ok(ru.some(item => item.text.includes('5 гранул 3 раза в день')))
  assert.ok(ru.some(item => item.text.includes('не подтверждены надёжными клиническими данными')))
  assert.ok(en.some(item => item.text.includes('photograph')))
  assert.ok(en.length > 20)
})

test('guide never leaks into an invoice and does not add unselected images', () => {
  const invoice = buildPaymentPdf({
    patientName, dateIssued: '2026-10-13', dateOfService: '2026-10-13',
    amount: 10000, currency: 'EUR', paymentStatus: 'unpaid',
    service: 'Synthetic appointment', includeDistanceHomeopathy: true,
  }, 'en', origin).toString('latin1')
  assert.doesNotMatch(invoice, /Distance homeopathy\. How does the process work/)
  assert.doesNotMatch(invoice, /RemedyPhoto1/)
  const noSelected = buildPrescriptionPdf({
    patientName, dateIssued: '2026-10-13', items: [{ displayName: 'Custom source-only text' }],
    includeDistanceHomeopathy: false,
  }, 'en', origin).toString('latin1')
  assert.doesNotMatch(noSelected, /APPENDIX/)
})

test('report and Alchemy page reuse the same article and private workflow safely', () => {
  const read = path => readFileSync(path, 'utf8')
  const form = read('components/consultation-form.jsx')
  const html = read('components/prescription-document.jsx')
  const service = read('app/[locale]/services/alchemy-of-soul/page.tsx')
  const article = read('components/distance-homeopathy-guide.tsx')
  const source = read('data/distance-homeopathy-content.js')
  const preview = read('app/admin/api/consultations/preview/route.js')
  const action = read('app/admin/consultations/actions.js')
  assert.match(form, /name="includeDistanceHomeopathy"/)
  assert.match(form, /consultation\?\.includeDistanceHomeopathy === true/)
  assert.match(preview, /input\.includeDistanceHomeopathy = form\.get\('includeDistanceHomeopathy'\) === 'on'/)
  assert.match(action, /data\.includeDistanceHomeopathy = formData\.get\('includeDistanceHomeopathy'\) === 'on'/)
  assert.match(html, /<RemedyContent[\s\S]+expandSupplementary/)
  assert.match(html, /<img src=\{remedy\.primary_image\}/)
  assert.match(html, /<DistanceHomeopathyGuide locale=\{locale\} embedded report \/>/)
  assert.match(service, /<DistanceHomeopathyGuide locale=\{locale as Locale\} embedded \/>/)
  assert.match(article, /distanceHomeopathyCopy/)
  assert.match(source, /not supported by reliable clinical evidence/)
})
