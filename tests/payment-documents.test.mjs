import assert from 'node:assert/strict'
import test from 'node:test'
import { createPaymentDocument, updatePaymentDocument, getClientPaymentDocument, paymentNarrative, paymentAmountInWords, formatPaymentAmount } from '../lib/documents/payment.js'
import { issuePrescriptionAccess, verifyPrescriptionSecret } from '../lib/prescriptions/access.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'

const now = '2026-09-08T12:00:00.000Z'
const input = { patientName: 'Synthetic Client', dateOfService: '2026-09-07', amount: '125.50', service: 'Consultation', paymentStatus: 'received', status: 'active' }

test('stores exact minor units and independent identities with deterministic issue date', () => {
  const first = createPaymentDocument(input, now)
  assert.equal(first.kind, 'payment')
  assert.equal(first.amount, 12550)
  assert.equal(first.currency, 'CAD')
  assert.equal(first.dateIssued, '2026-09-08')
  assert.notEqual(first.id, createPaymentDocument(input, now).id)
})

test('rejects imprecise, negative, zero, unsafe and malformed amounts', () => {
  for (const amount of ['1.001', '-5', '0', 'NaN', '1e3', '', '1,250', '1000000.01', Infinity, 0.1 + 0.2]) {
    assert.throws(() => createPaymentDocument({ ...input, amount }, now), /Amount/)
  }
  assert.equal(createPaymentDocument({ ...input, amount: '0.01' }, now).amount, 1)
  assert.equal(createPaymentDocument({ ...input, amount: '1000000' }, now).amount, 100000000)
})

test('requires valid client, service, calendar dates, currency and explicit statuses', () => {
  for (const patch of [{ patientName: '' }, { service: '' }, { dateOfService: '2026-02-30' }, { dateIssued: 'invalid' }, { currency: 'JPY' }, { paymentStatus: 'pending' }, { status: 'public' }, { consultations: 0 }, { consultations: 1.5 }, { consultations: '1e2' }]) {
    assert.throws(() => createPaymentDocument({ ...input, ...patch }, now))
  }
  assert.equal(createPaymentDocument({ ...input, consultations: '2' }, now).consultations, 2)
})

test('receipt and invoice language follows actual payment status and includes exact cents', () => {
  const receipt = createPaymentDocument(input, now)
  assert.match(paymentNarrative(receipt, 'en'), /I confirm that I received CAD 125.50/)
  assert.match(paymentNarrative(receipt, 'en'), /one hundred twenty-five Canadian dollars and fifty cents/)
  const invoice = createPaymentDocument({ ...input, paymentStatus: 'unpaid' }, now)
  assert.doesNotMatch(paymentNarrative(invoice, 'en'), /received/i)
  assert.match(paymentNarrative(invoice, 'en'), /Amount due/)
  assert.doesNotMatch(paymentNarrative(invoice, 'ru'), /получен|получил/i)
  for (const [currency, expected] of [['USD', 'US dollars'], ['EUR', 'euros'], ['UAH', 'Ukrainian hryvnias']]) {
    assert.match(paymentAmountInWords({ ...receipt, currency }, 'en'), new RegExp(expected))
    assert.doesNotMatch(paymentAmountInWords({ ...receipt, currency }, 'en'), /Canadian/)
  }
  assert.equal(formatPaymentAmount(receipt, 'en'), '125.50')
  assert.match(paymentAmountInWords(receipt, 'ru'), /канадских долларов.*пятьдесят центов/)
})

test('optional consultation count appears in receipt and invoice narratives in both locales', () => {
  for (const paymentStatus of ['received', 'unpaid']) {
    const record = createPaymentDocument({ ...input, paymentStatus, consultations: 2 }, now)
    assert.match(paymentNarrative(record, 'en'), /Number of consultations: 2\./)
    assert.match(paymentNarrative(record, 'ru'), /Количество консультаций: 2\./)
    assert.doesNotMatch(paymentNarrative(createPaymentDocument({ ...input, paymentStatus }, now), 'en'), /Number of consultations/)
  }
})

test('active projection excludes clinical fields and all access/internal metadata', () => {
  const record = { ...createPaymentDocument(input, now), items: [{ dosage: 'private clinical data' }], internalNotes: 'secret note', publicId: 'legacy secret', access: { selector: 'private selector' } }
  const client = getClientPaymentDocument(record, 'en')
  assert.equal(client.documentType, 'receipt')
  for (const key of ['id', 'createdAt', 'updatedAt', 'access', 'publicId', 'items', 'internalNotes']) assert.equal(key in client, false)
  assert.equal(getClientPaymentDocument({ ...record, status: 'draft' }, 'en'), undefined)
  assert.equal(getClientPaymentDocument({ ...record, kind: undefined }, 'en'), undefined)
  assert.equal(getClientPaymentDocument(record, 'fr'), undefined)
  assert.equal(getClientPaymentDocument({ ...record, paymentStatus: 'unpaid' }, 'ru').documentType, 'invoice')
})

test('updates preserve identity and active access but revoke access on status transition', async () => {
  const { record, selector, secret } = issuePrescriptionAccess(createPaymentDocument(input, now))
  const updated = updatePaymentDocument(record, { ...input, amount: '130' }, '2026-09-09T00:00:00.000Z')
  assert.equal(updated.id, record.id)
  assert.equal(updated.createdAt, now)
  assert.equal(updated.amount, 13000)
  assert.equal(verifyPrescriptionSecret(updated, secret), true)
  const store = createMemoryPrescriptionStore()
  await store.save(updated)
  assert.equal((await store.findBySelector(selector)).id, record.id)
  const revoked = updatePaymentDocument(updated, { ...input, status: 'revoked' }, now)
  assert.equal(revoked.access, undefined)
  await store.save(revoked, updated)
  assert.equal(await store.findBySelector(selector), undefined)
  assert.throws(() => updatePaymentDocument({ id: 'recommendation' }, input, now), /payment/)
})
