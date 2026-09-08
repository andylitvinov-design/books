import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createPaymentDocument, updatePaymentDocument, getClientPaymentDocument } from '../lib/documents/payment.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { issuePrescriptionAccess, createPrescriptionSession, authorizePrescriptionSession } from '../lib/prescriptions/access.js'

// Execute the actual route/action bodies with framework boundaries injected.
async function loadHandlers(file, dependencies, exports) {
  const source = (await readFile(new URL(file, import.meta.url), 'utf8'))
    .replace(/^import .* from .*\n/gm, '')
    .replace(/^export /gm, '')
  return new Function(...Object.keys(dependencies), `${source}\nreturn { ${exports.join(', ')} }`)(...Object.values(dependencies))
}
const input = { patientName: 'Synthetic Client', dateOfService: '2026-09-08', amount: '123.45', currency: 'CAD', service: 'Consultation', paymentStatus: 'unpaid', status: 'active' }
const form = () => new Map(Object.entries(input))
const redirected = (path) => { throw new Error(`REDIRECT:${path}`) }
async function actions(store, authorized = true) {
  return loadHandlers('../app/admin/payments/actions.js', { redirect: redirected, createPaymentDocument, updatePaymentDocument, requireAdminRequest: async () => authorized, getPrescriptionStore: () => store }, ['createPaymentAction', 'updatePaymentAction', 'markPaymentReceivedAction', 'revokePaymentAccessAction', 'reactivatePaymentAction'])
}

test('payment revocation invalidates access; reactivation cannot resurrect old sessions or links', async () => {
  const { record, selector } = issuePrescriptionAccess(createPaymentDocument(input))
  const session = createPrescriptionSession(record)
  const store = createMemoryPrescriptionStore([record])
  const { revokePaymentAccessAction, reactivatePaymentAction } = await actions(store)
  assert.equal(authorizePrescriptionSession(record, selector, session), true)
  await assert.rejects(revokePaymentAccessAction(record.id), /REDIRECT:/)
  const revoked = await store.findById(record.id)
  assert.equal(revoked.status, 'revoked')
  assert.equal(revoked.amount, 12345)
  assert.equal(revoked.access, undefined)
  assert.equal(await store.findBySelector(selector), undefined)
  assert.equal(authorizePrescriptionSession(revoked, selector, session), false)
  await assert.rejects(reactivatePaymentAction(record.id), /REDIRECT:/)
  const active = await store.findById(record.id)
  assert.equal(active.status, 'active')
  assert.equal(active.amount, 12345)
  assert.equal(active.access, undefined)
  assert.equal(authorizePrescriptionSession(active, selector, session), false)
  assert.equal(await store.findBySelector(selector), undefined)
})

test('payment lifecycle actions reject unauthorized requests and recommendation IDs', async () => {
  const denied = await actions({ save: () => assert.fail('unauthorized write') }, false)
  await assert.rejects(denied.revokePaymentAccessAction('unknown'), /Unauthorized/)
  await assert.rejects(denied.reactivatePaymentAction('unknown'), /Unauthorized/)
  const store = createMemoryPrescriptionStore([{ id: 'recommendation', status: 'active', items: [] }])
  const handlers = await actions(store)
  await assert.rejects(handlers.revokePaymentAccessAction('recommendation'), /unavailable/)
  await assert.rejects(handlers.reactivatePaymentAction('recommendation'), /unavailable/)
  assert.equal((await store.findById('recommendation')).status, 'active')
})

test('payment creation requires admin and never writes on unauthorized request', async () => {
  const { createPaymentAction } = await actions({ save: () => assert.fail('write before authorization') }, false)
  assert.match((await createPaymentAction(undefined, {}, form())).error, /sign in/)
})

test('mark received preserves amount, identity, and secure access', async () => {
  const record = { ...createPaymentDocument(input), access: { selector: 'synthetic-selector', version: 1 } }
  const store = createMemoryPrescriptionStore([record])
  const { markPaymentReceivedAction } = await actions(store)
  await assert.rejects(markPaymentReceivedAction(record.id), /REDIRECT:/)
  const receipt = await store.findById(record.id)
  assert.equal(receipt.amount, 12345)
  assert.equal(receipt.paymentStatus, 'received')
  assert.equal(receipt.id, record.id)
  assert.deepEqual(receipt.access, record.access)
})

test('payment edit consumes decimal form amount and preserves active access', async () => {
  const record = { ...createPaymentDocument(input), access: { selector: 'synthetic-selector' } }
  const store = createMemoryPrescriptionStore([record])
  const { updatePaymentAction } = await actions(store)
  await assert.rejects(updatePaymentAction(record.id, {}, form()), /REDIRECT:/)
  assert.equal((await store.findById(record.id)).amount, 12345)
  assert.equal((await store.findById(record.id)).status, 'active')
  assert.deepEqual((await store.findById(record.id)).access, record.access)
})

test('payment creation associates independent record and preserves latest recommendation', async () => {
  const recommendation = { id: 'synthetic-recommendation', patientName: 'Synthetic Client', status: 'active', items: [{ dosage: 'Practitioner supplied' }] }
  const store = createMemoryPrescriptionStore([recommendation])
  const save = store.save
  let created
  store.save = async (record, previous) => {
    await save(record, previous)
    if (record.kind === 'payment') {
      created = record
      await save({ ...recommendation, generalInstructions: 'Concurrent edit preserved' })
    }
  }
  const { createPaymentAction } = await actions(store)
  await assert.rejects(createPaymentAction(recommendation.id, {}, form()), /REDIRECT:/)
  const linked = await store.findById(recommendation.id)
  assert.equal(linked.paymentDocumentId, created.id)
  assert.equal(linked.generalInstructions, 'Concurrent edit preserved')
  assert.deepEqual(linked.items, recommendation.items)
  assert.equal(created.status, 'active')
  assert.equal(created.items, undefined)
})

test('admin PDF authorizes before reads and returns private headers for denial', async () => {
  const { GET } = await loadHandlers('../app/admin/api/documents/[id]/pdf/route.js', {
    NextResponse: Response, requireAdminRequest: async () => false,
    getPrescriptionStore: () => assert.fail('read before authorization'),
  }, ['GET'])
  const response = await GET(new Request('https://synthetic.test/admin/api/documents/unknown/pdf'), { params: Promise.resolve({ id: 'unknown' }) })
  assert.equal(response.status, 404)
  assert.match(response.headers.get('cache-control'), /no-store/)
  assert.match(response.headers.get('x-robots-tag'), /noindex/)
})

test('admin PDF projects payment data and chooses receipt renderer and filename', async () => {
  const record = { ...createPaymentDocument({ ...input, paymentStatus: 'received' }), internalNotes: 'Private', access: { selector: 'Private' } }
  const { GET } = await loadHandlers('../app/admin/api/documents/[id]/pdf/route.js', {
    NextResponse: Response, requireAdminRequest: async () => true,
    getPrescriptionStore: () => createMemoryPrescriptionStore([record]),
    getClientPaymentDocument,
    buildPaymentPdf: async (document) => {
      assert.equal(document.internalNotes, undefined)
      assert.equal(document.access, undefined)
      assert.equal(document.id, undefined)
      return Buffer.from('%PDF synthetic')
    },
    buildPrescriptionPdf: () => assert.fail('wrong renderer'),
    metadataBaseFor: () => new URL('https://synthetic.test'),
  }, ['GET'])
  const response = await GET(new Request(`https://synthetic.test/admin/api/documents/${record.id}/pdf`), { params: Promise.resolve({ id: record.id }) })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-disposition'), /receipt.pdf/)
  assert.match(response.headers.get('cache-control'), /no-store/)
})
