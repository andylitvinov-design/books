import assert from 'node:assert/strict'
import test from 'node:test'
import { createPaymentDocument, updatePaymentDocument, getClientPaymentDocument } from '../lib/documents/payment.js'
import { createPrescription, getClientPrescription } from '../lib/prescriptions/service.js'
import { authorizePrescriptionSession, createPrescriptionSession, issuePrescriptionAccess, prescriptionSessionTtlSeconds } from '../lib/prescriptions/access.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'

const paymentInput = { patientName: 'Synthetic Independent Client', dateOfService: '2026-09-08', amount: '150.25', service: 'Synthetic consultation', paymentStatus: 'received', status: 'active' }

async function independentDocuments() {
  const payment = issuePrescriptionAccess(createPaymentDocument(paymentInput))
  const recommendation = issuePrescriptionAccess(createPrescription({
    patientName: paymentInput.patientName, practitionerName: 'Synthetic Practitioner', status: 'active',
    internalNotes: 'Synthetic confidential admin note',
    items: [{ remedySlug: 'arsenicum-album', potency: 'Synthetic potency', dosage: 'Synthetic clinical dosage' }],
  }))
  const store = createMemoryPrescriptionStore()
  for (const issued of [payment, recommendation]) {
    await store.save(issued.record)
    issued.session = createPrescriptionSession(issued.record)
    await store.createAccessSession(issued.session, prescriptionSessionTtlSeconds)
  }
  return { payment, recommendation, store }
}

test('payment and recommendation credentials resolve independent records and cannot cross-authorize', async () => {
  const { payment, recommendation, store } = await independentDocuments()
  assert.notEqual(payment.record.id, recommendation.record.id)
  assert.notEqual(payment.selector, recommendation.selector)
  const paymentRecord = await store.findBySelector(payment.selector)
  const recommendationRecord = await store.findBySelector(recommendation.selector)
  const paymentSession = await store.findAccessSession(payment.session.digest)
  const recommendationSession = await store.findAccessSession(recommendation.session.digest)
  assert.equal(authorizePrescriptionSession(paymentRecord, payment.selector, paymentSession), true)
  assert.equal(authorizePrescriptionSession(recommendationRecord, recommendation.selector, recommendationSession), true)
  assert.equal(authorizePrescriptionSession(recommendationRecord, recommendation.selector, paymentSession), false)
  assert.equal(authorizePrescriptionSession(paymentRecord, payment.selector, recommendationSession), false)
})

test('revoking payment invalidates its stored session while recommendation remains usable', async () => {
  const { payment, recommendation, store } = await independentDocuments()
  const revoked = updatePaymentDocument(payment.record, { ...paymentInput, status: 'revoked' })
  await store.save(revoked, payment.record)
  assert.equal(await store.findBySelector(payment.selector), undefined)
  assert.equal(authorizePrescriptionSession(await store.findById(payment.record.id), payment.selector, await store.findAccessSession(payment.session.digest)), false)
  assert.equal(authorizePrescriptionSession(await store.findBySelector(recommendation.selector), recommendation.selector, await store.findAccessSession(recommendation.session.digest)), true)
})

test('rotating payment access invalidates the old session and leaves recommendation untouched', async () => {
  const { payment, recommendation, store } = await independentDocuments()
  const rotated = issuePrescriptionAccess(payment.record)
  await store.save(rotated.record, payment.record)
  assert.equal(await store.findBySelector(payment.selector), undefined)
  const currentRecord = await store.findBySelector(rotated.selector)
  assert.equal(authorizePrescriptionSession(currentRecord, rotated.selector, await store.findAccessSession(payment.session.digest)), false)
  const fresh = createPrescriptionSession(currentRecord)
  await store.createAccessSession(fresh, prescriptionSessionTtlSeconds)
  assert.equal(authorizePrescriptionSession(currentRecord, rotated.selector, await store.findAccessSession(fresh.digest)), true)
  assert.equal(authorizePrescriptionSession(await store.findBySelector(recommendation.selector), recommendation.selector, await store.findAccessSession(recommendation.session.digest)), true)
})

test('client projections omit credentials, internal notes and the other document domain', async () => {
  const { payment, recommendation } = await independentDocuments()
  for (const locale of ['en', 'ru']) {
    const paymentClient = getClientPaymentDocument({ ...payment.record, items: recommendation.record.items, internalNotes: recommendation.record.internalNotes }, locale)
    const recommendationClient = getClientPrescription({ ...recommendation.record, amount: payment.record.amount, currency: payment.record.currency }, locale)
    for (const client of [paymentClient, recommendationClient]) {
      const serialized = JSON.stringify(client)
      for (const key of ['id', 'access', 'publicId', 'internalNotes']) assert.equal(key in client, false)
      for (const privateValue of [payment.record.id, recommendation.record.id, payment.secret, recommendation.secret, payment.selector, recommendation.selector, recommendation.record.internalNotes]) assert.equal(serialized.includes(privateValue), false)
    }
    assert.equal('items' in paymentClient, false)
    assert.equal(JSON.stringify(paymentClient).includes('Synthetic clinical dosage'), false)
    assert.equal('amount' in recommendationClient, false)
    assert.equal('currency' in recommendationClient, false)
  }
})
