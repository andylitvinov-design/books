import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

import { createConsultationDraftPreview } from '../lib/consultations/draft-preview.js'
import { createConsultation } from '../lib/consultations/service.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

const draft = {
  clientMode: 'new', patientName: 'Synthetic New Client',
  consultationDate: '2026-10-13', languagePreference: 'ru',
  includeRecommendation: true, includeInvoice: false,
  items: [{ remedySlug: 'arsenicum-album' }],
  analysis: 'Pre-save state measurement 5/10',
  additionalNotes: 'Observe and record the state.',
  generalInstructions: 'Historic note.',
}

test('draft preview accepts a new client and makes a valid private PDF without persistence', async () => {
  const document = await createConsultationDraftPreview(draft, { kind: 'recommendation', locale: 'ru' })
  assert.equal(document.patientName, draft.patientName)
  assert.equal(document.analysis, draft.analysis)
  assert.equal(document.additionalNotes, draft.additionalNotes)
  assert.equal(document.generalInstructions, draft.generalInstructions)
  const pdf = buildPrescriptionPdf(document, 'ru', 'https://example.test')
  assert.ok(pdf.subarray(0, 8).toString('utf8').startsWith('%PDF-1.7'))
  assert.ok(pdf.toString('latin1').includes('Pre-save state measurement'))
})

test('draft preview resolves selected existing client from server-side store, not spoofed name', async () => {
  const store = createMemoryPrescriptionStore()
  const created = await createConsultation({
    patientName: 'Synthetic Existing Client', consultationDate: draft.consultationDate,
    includeRecommendation: true, includeInvoice: false,
    items: draft.items, newClient: { fullName: 'Synthetic Existing Client', preferredLocale: 'ru' },
  }, { store, requestId: randomUUID() })
  const before = await store.listClientDocuments(created.recommendation.clientId)
  const document = await createConsultationDraftPreview({
    ...draft, clientMode: 'existing', patientName: 'Forged client name',
    clientId: created.recommendation.clientId,
  }, { kind: 'recommendation', locale: 'en', store })
  assert.equal(document.patientName, 'Synthetic Existing Client')
  assert.equal((await store.listClientDocuments(created.recommendation.clientId)).length, before.length)
})

test('an unsaved invoice can be previewed independently without selecting a remedy', async () => {
  const payment = await createConsultationDraftPreview({
    ...draft, includeRecommendation: false, includeInvoice: true, items: [],
    service: 'Synthetic Session', amount: '60.00', currency: 'CAD', paymentStatus: 'unpaid',
  }, { kind: 'payment', locale: 'en' })
  assert.equal(payment.kind, 'payment')
  assert.equal(payment.documentType, 'invoice')
  assert.equal(payment.amount, 6000)
  await assert.rejects(
    createConsultationDraftPreview({ ...draft, includeInvoice: false }, { kind: 'payment' }),
    /Select an invoice/,
  )
})

test('draft preview rejects unknown clients, invalid options and invalid clinical data', async () => {
  await assert.rejects(createConsultationDraftPreview({ ...draft, clientMode: 'existing', clientId: randomUUID() },
    { kind: 'recommendation', store: createMemoryPrescriptionStore() }), /unavailable/)
  await assert.rejects(createConsultationDraftPreview({ ...draft, items: [] },
    { kind: 'recommendation' }), /at least one/i)
  await assert.rejects(createConsultationDraftPreview({ ...draft },
    { kind: 'else' }), /Unknown preview document/)
})

test('consultation notes are above step 03 and preview button precedes create documents', async () => {
  const [form, preview, page, route] = await Promise.all([
    readFile('components/consultation-form.jsx','utf8'),
    readFile('components/consultation-draft-preview.jsx','utf8'),
    readFile('app/admin/consultations/new/page.js','utf8'),
    readFile('app/admin/api/consultations/preview/route.js','utf8'),
  ])
  for (const field of ['analysis','additionalNotes','generalInstructions']) {
    const pos = form.indexOf('name="' + field + '"')
    const documents = form.indexOf('id="consultation-documents-heading"')
    assert.ok(pos >= 0 && pos < documents, field + ' appears before document and payment section')
  }
  assert.ok(form.indexOf('ConsultationDraftPreview locale={reportLocale}') < form.indexOf('type="submit" disabled={pending}'))
  assert.ok(!page.includes('Separate diagnostic report'))
  assert.ok(!page.includes('/assessments/new?kind=research_result'))
  assert.ok(preview.includes('new FormData(form)'))
  assert.ok(preview.includes('method: \'POST\''))
  assert.ok(preview.includes('credentials: \'same-origin\''))
  assert.ok(route.includes('requireAdminRequest()'))
  assert.ok(route.includes("'Cache-Control': 'private, no-store"))
  assert.ok(route.includes("Content-Disposition': `inline;"))
  assert.ok(!route.includes('store.save('))
  assert.ok(!route.includes('issuePrescriptionAccess'))
})
