import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { createMemoryPrescriptionStore, createPrescriptionStore } from '../lib/prescriptions/store.js'
import { createClient } from '../lib/clients/service.js'
import { createAssessment, updateAssessment, transitionAssessment, validateAssessmentInput, clientAssessmentSummary, clientAssessmentDetail } from '../lib/clients/assessments.js'
import { createCabinetSession, getOwnerCabinetLink, rotateCabinetAccess, revokeCabinetAccess, resolveCurrentCabinet } from '../lib/clients/access.js'
import { activeNavigationId, getSiteNavigation } from '../lib/site-navigation-model.js'
const input = (extra = {}) => ({ kind: 'test', title: 'Synthetic assessment', occurredOn: '2026-10-02', language: 'en', sourceName: 'Provided source', sourceVersion: 'v1', description: 'Approved description', originalResult: 'Exact supplied result', practitionerComment: 'Separate comment', relatedDocumentIds: [], ...extra })
async function setup() {
  const store = createMemoryPrescriptionStore()
  const a = createClient({ fullName: 'Synthetic Client A', preferredLocale: 'en' })
  const b = createClient({ fullName: 'Synthetic Client B', preferredLocale: 'ru' })
  await store.saveClient(a); await store.saveClient(b)
  return { store, a, b }
}
const errorCode = code => error => error.code === code

test('six shared navigation destinations and precise active families', () => {
  for (const locale of ['en', 'ru', 'es']) {
    assert.deepEqual(getSiteNavigation(locale).map(x => x.id), ['home', 'library', 'services', 'academy', 'about', 'cabinet'])
    for (const suffix of ['library', 'books', 'homeopathy', 'homeopathy/remedies/aconitum']) assert.equal(activeNavigationId(`/${locale}/${suffix}`), 'library')
    assert.equal(activeNavigationId(`/${locale}/client/opaque`), 'cabinet')
  }
  assert.equal(activeNavigationId('/books/a/chapter'), 'library')
  assert.equal(activeNavigationId('/admin/clients'), undefined)
  assert.equal(activeNavigationId('/es'), 'home')
  assert.equal(activeNavigationId('/en/about'), 'about')
})

test('strict source input validation without invented interpretation', () => {
  assert.equal(validateAssessmentInput(input()).originalResult, 'Exact supplied result')
  for (const extra of [{ clientId: randomUUID() }, { id: randomUUID() }, { status: 'shared' }, { occurredOn: '2026-02-30' }, { title: '' }, { kind: 'diagnosis' }, { language: 'unknown' }, { title: 'a'.repeat(201) }, { description: 'a'.repeat(10001) }, { relatedDocumentIds: ['invalid'] }]) assert.throws(() => validateAssessmentInput(input(extra)), errorCode('VALIDATION'))
  assert.equal(validateAssessmentInput(input({ occurredOn: '2024-02-29' })).occurredOn, '2024-02-29')
  const source = '<script>globalThis.untrusted = true</script>'
  assert.equal(validateAssessmentInput(input({ originalResult: source })).originalResult, source)
})

test('draft -> shared -> unshared -> edit -> archive; correct client sees only shared source fields', async () => {
  const { store, a, b } = await setup()
  let r = await createAssessment(store, a.id, input(), randomUUID())
  assert.equal(r.status, 'draft'); assert.equal(r.revision, 1)
  assert.equal(clientAssessmentSummary(r, a.id), undefined)
  assert.equal(await clientAssessmentDetail(store, b.id, r.id), undefined)
  r = await transitionAssessment(store, a.id, r.id, r.revision, 'share')
  assert.equal(clientAssessmentSummary(r, b.id), undefined)
  assert.equal(clientAssessmentSummary(r, a.id).clientId, undefined)
  const detail = await clientAssessmentDetail(store, a.id, r.id)
  assert.equal(detail.originalResult, 'Exact supplied result'); assert.equal(detail.practitionerComment, 'Separate comment')
  await assert.rejects(updateAssessment(store, a.id, r.id, r.revision, input()), errorCode('UNSHARE_FIRST'))
  r = await transitionAssessment(store, a.id, r.id, r.revision, 'unshare')
  assert.equal(await clientAssessmentDetail(store, a.id, r.id), undefined)
  r = await updateAssessment(store, a.id, r.id, r.revision, input({ practitionerComment: 'Revised explicitly' }))
  assert.equal((await store.findClientAssessment(r.id)).originalResult, 'Exact supplied result')
  r = await transitionAssessment(store, a.id, r.id, r.revision, 'archive')
  assert.equal(r.status, 'archived'); assert.equal((await store.listClientAssessments(a.id)).length, 1)
  assert.equal(clientAssessmentSummary(r, a.id), undefined)
})

test('create idempotency is atomic and rejects conflicting payloads', async () => {
  const { store, a } = await setup(), request = randomUUID()
  const results = await Promise.all([createAssessment(store, a.id, input(), request), createAssessment(store, a.id, input(), request)])
  assert.equal(results[0].id, results[1].id)
  assert.equal((await store.listClientAssessments(a.id)).length, 1)
  await assert.rejects(createAssessment(store, a.id, input({ title: 'Changed payload' }), request), errorCode('CONFLICT'))
})

test('two concurrent edits have exactly one winner and immutable client identity', async () => {
  const { store, a, b } = await setup()
  const r = await createAssessment(store, a.id, input(), randomUUID())
  const edits = await Promise.allSettled([updateAssessment(store, a.id, r.id, 1, input({ title: 'First' })), updateAssessment(store, a.id, r.id, 1, input({ title: 'Second' }))])
  assert.equal(edits.filter(x => x.status === 'fulfilled').length, 1)
  assert.equal(edits.find(x => x.status === 'rejected').reason.code, 'CONFLICT')
  await assert.rejects(transitionAssessment(store, b.id, r.id, 2, 'share'), errorCode('UNAVAILABLE'))
  const current = await store.findClientAssessment(r.id)
  assert.equal(await store.updateClientAssessmentIfUnchanged(current, { ...current, clientId: b.id, revision: 3 }), false)
})

test('related documents do not confer ownership and revoked files disappear on read', async () => {
  const { store, a, b } = await setup()
  const da = { id: randomUUID(), clientId: a.id, status: 'active' }, db = { id: randomUUID(), clientId: b.id, status: 'active' }
  await store.save(da); await store.save(db)
  await assert.rejects(createAssessment(store, a.id, input({ relatedDocumentIds: [db.id] }), randomUUID()), errorCode('VALIDATION'))
  let r = await createAssessment(store, a.id, input({ relatedDocumentIds: [da.id] }), randomUUID())
  r = await transitionAssessment(store, a.id, r.id, r.revision, 'share')
  assert.equal((await clientAssessmentDetail(store, a.id, r.id)).relatedDocuments.length, 1)
  await store.save({ ...da, status: 'archived' }, da)
  assert.equal((await clientAssessmentDetail(store, a.id, r.id)).relatedDocuments.length, 0)
  r = await transitionAssessment(store, a.id, r.id, r.revision, 'unshare')
  await assert.rejects(transitionAssessment(store, a.id, r.id, r.revision, 'share'), errorCode('VALIDATION'))
  assert.equal((await transitionAssessment(store, a.id, r.id, r.revision, 'archive')).status, 'archived')
})

test('current-session resume rejects expiry, rotation, revocation and missing configuration', async () => {
  const { store, a } = await setup()
  const env = { NODE_ENV: 'test', PRESCRIPTIONS_DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') }
  await getOwnerCabinetLink(store, a.id, env)
  const client = await store.findClientById(a.id), session = createCabinetSession(client)
  await store.createCabinetSession(session, 1000)
  assert.deepEqual(await resolveCurrentCabinet(store, session.token), { selector: session.selector })
  assert.equal(await resolveCurrentCabinet(store, session.token, session.expiresAt + 1), undefined)
  await rotateCabinetAccess(store, a.id, env)
  assert.equal(await resolveCurrentCabinet(store, session.token), undefined)
  const next = createCabinetSession(await store.findClientById(a.id)); await store.createCabinetSession(next, 1000)
  await revokeCabinetAccess(store, a.id)
  assert.equal(await resolveCurrentCabinet(store, next.token), undefined)
  assert.equal(createPrescriptionStore({ environment: { NODE_ENV: 'production' } }), undefined)
  assert.equal(createPrescriptionStore({ environment: { NODE_ENV: 'production', PRESCRIPTIONS_KV_REST_API_URL: 'https://unused.invalid' } }), undefined)
})
