import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'

import {
  createPrescription,
  getClientPrescription,
  updatePrescription,
  validatePrescriptionInput,
} from '../lib/prescriptions/service.js'
import { createPrescriptionSession, issuePrescriptionAccess } from '../lib/prescriptions/access.js'
import { createMemoryPrescriptionStore, createPrescriptionStore } from '../lib/prescriptions/store.js'
import { buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

const baseInput = {
  patientName: 'Test Client',
  dateIssued: '2026-09-07',
  languagePreference: 'bilingual',
  practitionerName: 'Andrii Litvinov',
  practitionerRole: 'Homeopathy / Integrative Practice',
  practitionerBackground: 'Professional background: Ukraine',
  practitionerContact: 'contact@example.test',
  generalInstructions: 'Fixture/test content only.',
  internalNotes: 'Never show this note.',
  items: [
    { remedySlug: 'arsenicum-album', potency: '30C', dosage: 'fixture/test', frequency: 'fixture/test', duration: 'fixture/test', instructions: 'fixture/test' },
    { remedySlug: 'natrum-muriaticum', potency: '200C' },
    { displayNameOverride: 'Custom unlinked item', potency: '30C' },
  ],
}

function createRestKvHarness() {
  const values = new Map()
  const commands = []
  return {
    commands,
    environment: {
      NODE_ENV: 'production',
      PRESCRIPTIONS_DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      PRESCRIPTIONS_KV_REST_API_TOKEN: 'fixture-only-token',
      PRESCRIPTIONS_KV_REST_API_URL: 'https://kv.example.test',
    },
    fetchFn: async (_url, request) => {
      const args = JSON.parse(request.body)
      const [operation, key, value] = args
      commands.push(args)
      let result
      if (operation === 'GET') result = values.get(key) ?? null
      if (operation === 'SET') { values.set(key, value); result = 'OK' }
      if (operation === 'DEL') { result = values.delete(key) ? 1 : 0 }
      if (operation === 'EVAL') {
        const rateKey = args[3]
        result = Number(values.get(rateKey) ?? 0) + 1
        values.set(rateKey, String(result))
      }
      return { ok: true, json: async () => ({ result }) }
    },
    values,
  }
}

test('creates a non-sequential internal identifier without a public bearer', () => {
  const first = createPrescription(baseInput)
  const second = createPrescription(baseInput)

  assert.match(first.id, /^[0-9a-f-]{36}$/)
  assert.notEqual(first.id, second.id)
  assert.equal('publicId' in first, false)
  assert.equal(first.status, 'draft')
})

test('rejects unknown remedy slugs rather than creating a remedy record', () => {
  assert.throws(
    () => validatePrescriptionInput({ ...baseInput, items: [{ remedySlug: 'mistyped-remedy', potency: '30C' }] }),
    /Unknown canonical remedy slug/,
  )
})

test('projects only active client fields and canonical localized remedy links', () => {
  const record = createPrescription({ ...baseInput, status: 'active' })
  const ru = getClientPrescription(record, 'ru')
  const en = getClientPrescription(record, 'en')

  assert.equal('publicId' in ru, false)
  assert.equal('publicId' in en, false)
  assert.equal(ru.items[0].remedyPath, '/ru/homeopathy/remedies/arsenicum-album')
  assert.equal(en.items[0].remedyPath, '/en/homeopathy/remedies/arsenicum-album')
  assert.equal(ru.items[2].remedyPath, undefined)
  assert.equal(ru.items[2].displayName, 'Custom unlinked item')
  assert.equal(JSON.stringify(ru).includes('Never show this note.'), false)
  assert.equal(JSON.stringify(ru).includes(record.id), false)
})

test('does not project drafts or revoked prescriptions publicly', () => {
  const draft = createPrescription(baseInput)
  const revoked = createPrescription({ ...baseInput, status: 'revoked' })

  assert.equal(getClientPrescription(draft, 'en'), undefined)
  assert.equal(getClientPrescription(revoked, 'ru'), undefined)
})

test('keeps private lookup IDs server-only while resolving a non-secret selector', async () => {
  const store = createMemoryPrescriptionStore()
  const { record, selector } = issuePrescriptionAccess(createPrescription({ ...baseInput, status: 'active' }))

  await store.save(record)
  assert.deepEqual(await store.findById(record.id), record)
  assert.deepEqual(await store.findBySelector(selector), record)
  assert.equal(await store.findBySelector(record.id), undefined)
})

test('fails closed when the persistent REST-KV configuration is absent outside demo runtime', () => {
  assert.equal(createPrescriptionStore({ environment: { NODE_ENV: 'production' } }), undefined)
})

test('rejects an insecure REST-KV endpoint before patient data can be sent', () => {
  assert.throws(
    () => createPrescriptionStore({
      environment: {
        PRESCRIPTIONS_KV_REST_API_URL: 'http://kv.example.test',
        PRESCRIPTIONS_KV_REST_API_TOKEN: 'fixture-only-token',
        PRESCRIPTIONS_DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      },
    }),
    /HTTPS/,
  )
})

test('encrypts sensitive prescription records before REST-KV persistence and decrypts them server-side', async () => {
  const harness = createRestKvHarness()
  const store = createPrescriptionStore(harness)
  const { record, selector } = issuePrescriptionAccess(createPrescription({
    ...baseInput,
    patientName: 'Synthetic Patient Encryption Check',
    patientDob: '1990-01-02',
    practitionerName: 'Synthetic Practitioner Encryption Check',
    generalInstructions: 'Synthetic instructions encryption check',
    internalNotes: 'Synthetic internal notes encryption check',
    status: 'active',
  }))

  await store.save(record)
  const raw = harness.values.get(`prescription:record:${record.id}`)
  assert.match(raw, /"version":1/)
  assert.match(raw, /"algorithm":"AES-256-GCM"/)
  for (const privateValue of [record.patientName, record.patientDob, record.practitionerName, record.generalInstructions, record.internalNotes]) {
    assert.equal(raw.includes(privateValue), false)
  }
  const restored = await store.findBySelector(selector)
  assert.equal(restored?.patientName, record.patientName)
  assert.equal(restored?.patientDob, record.patientDob)
  assert.equal(restored?.practitionerName, record.practitionerName)
  assert.equal(restored?.generalInstructions, record.generalInstructions)
  assert.equal(restored?.internalNotes, record.internalNotes)
})

test('fails closed for a missing, malformed, or tampered REST-KV encryption envelope', async () => {
  const harness = createRestKvHarness()
  assert.equal(createPrescriptionStore({ environment: { ...harness.environment, PRESCRIPTIONS_DATA_ENCRYPTION_KEY: undefined }, fetchFn: harness.fetchFn }), undefined)
  assert.equal(createPrescriptionStore({ environment: { ...harness.environment, PRESCRIPTIONS_DATA_ENCRYPTION_KEY: 'not-a-256-bit-key' }, fetchFn: harness.fetchFn }), undefined)
  assert.equal(createPrescriptionStore({ environment: { ...harness.environment, PRESCRIPTIONS_DATA_ENCRYPTION_KEY: `!${harness.environment.PRESCRIPTIONS_DATA_ENCRYPTION_KEY}` }, fetchFn: harness.fetchFn }), undefined)
  assert.equal(createPrescriptionStore({ environment: { ...harness.environment, PRESCRIPTIONS_DATA_ENCRYPTION_KEY: `${harness.environment.PRESCRIPTIONS_DATA_ENCRYPTION_KEY}=` }, fetchFn: harness.fetchFn }), undefined)

  const store = createPrescriptionStore(harness)
  const { record, selector } = issuePrescriptionAccess(createPrescription({ ...baseInput, status: 'active' }))
  await store.save(record)
  const key = `prescription:record:${record.id}`
  const envelope = JSON.parse(harness.values.get(key))
  envelope.ciphertext = `${envelope.ciphertext.slice(0, -2)}AA`
  harness.values.set(key, JSON.stringify(envelope))
  assert.equal(await store.findBySelector(selector), undefined)
})

test('revoking an active prescription removes selector and legacy mappings but retains only encrypted internal storage', async () => {
  const harness = createRestKvHarness()
  const store = createPrescriptionStore(harness)
  const legacyPublicId = 'L'.repeat(43)
  const legacy = { ...createPrescription({ ...baseInput, status: 'active' }), publicId: legacyPublicId }
  const { record: active, selector } = issuePrescriptionAccess(legacy)
  harness.values.set(`prescription:public:${legacyPublicId}`, active.id)
  await store.save(active, legacy)
  assert.equal((await store.findBySelector(selector))?.id, active.id)
  assert.equal(harness.values.has(`prescription:public:${legacyPublicId}`), false)

  const revoked = { ...active, status: 'revoked', updatedAt: '2026-09-08T00:00:00.000Z' }
  await store.save(revoked, active)
  assert.equal(await store.findBySelector(selector), undefined)
  assert.equal(harness.values.has(`prescription:selector:${selector}`), false)
  assert.match(harness.values.get(`prescription:record:${active.id}`), /"algorithm":"AES-256-GCM"/)
  assert.ok(harness.commands.some(([operation, key]) => operation === 'DEL' && key === `prescription:public:${legacyPublicId}`))
})

test('reactivating a revoked prescription requires freshly issued access', async () => {
  const store = createMemoryPrescriptionStore()
  const issued = issuePrescriptionAccess(createPrescription({ ...baseInput, status: 'active' }))
  await store.save(issued.record)

  const revoked = updatePrescription(issued.record, { ...baseInput, status: 'revoked' })
  await store.save(revoked, issued.record)
  const reactivated = updatePrescription(revoked, { ...baseInput, status: 'active' })
  await store.save(reactivated, revoked)

  assert.equal(reactivated.access, undefined)
  assert.equal(await store.findBySelector(issued.selector), undefined)
})

test('persists opaque expiring access sessions and bounded rate counters in REST KV', async () => {
  const harness = createRestKvHarness()
  const store = createPrescriptionStore(harness)
  const { record } = issuePrescriptionAccess(createPrescription({ ...baseInput, status: 'active' }))
  const session = createPrescriptionSession(record, 1_788_891_200_000)

  await store.createAccessSession(session, 900)
  assert.deepEqual(await store.findAccessSession(session.digest), {
    recordId: session.recordId,
    selector: session.selector,
    accessVersion: session.accessVersion,
    expiresAt: session.expiresAt,
  })
  assert.equal(await store.consumeAccessAttempt('a'.repeat(64), 2, 300), true)
  assert.equal(await store.consumeAccessAttempt('a'.repeat(64), 2, 300), true)
  assert.equal(await store.consumeAccessAttempt('a'.repeat(64), 2, 300), false)
  assert.ok(harness.commands.some((args) => args[0] === 'SET' && args[1] === `prescription:session:${session.digest}` && args[3] === 'EX' && args[4] === 900))
  assert.ok(harness.commands.some((args) => args[0] === 'EVAL' && args[3] === `prescription:rate:${'a'.repeat(64)}` && args[4] === 300))
  assert.equal(harness.commands.some((args) => args[0] === 'INCR' || args[0] === 'EXPIRE'), false)

  await store.deleteAccessSession(session.digest)
  assert.equal(await store.findAccessSession(session.digest), undefined)
})

test('generates a download-safe PDF without internal notes or IDs and keeps remedy hyperlinks', () => {
  const record = createPrescription({ ...baseInput, status: 'active' })
  const document = getClientPrescription(record, 'en')
  const pdf = buildPrescriptionPdf(document, 'en', 'https://books.example.test')
  const source = pdf.toString('latin1')

  assert.match(source, /^%PDF-1\.7/)
  assert.match(source, /HOMEOPATHIC RECOMMENDATION/)
  assert.match(source, /\/URI \(https:\/\/books\.example\.test\/en\/homeopathy\/remedies\/arsenicum-album\)/)
  assert.equal(source.includes('Never show this note.'), false)
  assert.equal(source.includes(record.id), false)
})

test('embeds a Unicode Cyrillic font for Russian prescriptions instead of transliterating labels', () => {
  const record = createPrescription({ ...baseInput, status: 'active' })
  const source = buildPrescriptionPdf(getClientPrescription(record, 'ru'), 'ru', 'https://books.example.test').toString('latin1')

  assert.match(source, /\/Encoding \/Identity-H/)
  assert.match(source, /\/ToUnicode/)
  assert.doesNotMatch(source, /GOMEOPATICHESKOE|Klient|Preparat/)
})

test('keeps the PDF footer below general instructions instead of overlapping it', () => {
  const record = createPrescription({ ...baseInput, status: 'active' })
  const source = buildPrescriptionPdf(getClientPrescription(record, 'en'), 'en', 'https://books.example.test').toString('latin1')
  const instructionY = Number(source.match(/1 0 0 1 52 (\d+(?:\.\d+)?) Tm \(Fixture\/test content only/)?.[1])
  const updatedY = Number(source.match(/1 0 0 1 52 (\d+(?:\.\d+)?) Tm \(Updated:/)?.[1])

  assert.ok(updatedY <= instructionY - 20)
})

test('paginates a long bilingual-safe prescription without dropping items or instructions', () => {
  const items = Array.from({ length: 28 }, (_, index) => ({
    displayNameOverride: index === 0 ? 'FIRST-SYNTHETIC-REMEDY' : index === 27 ? 'FINAL-SYNTHETIC-REMEDY' : `SYNTHETIC-REMEDY-${index + 1}`,
    potency: '30C',
    dosage: 'Long synthetic dosage text '.repeat(10),
    notes: 'Long synthetic note text '.repeat(10),
  }))
  const record = createPrescription({
    ...baseInput,
    generalInstructions: `GENERAL-INSTRUCTIONS-FIRST ${'Long instruction text '.repeat(260)} GENERAL-INSTRUCTIONS-FINAL`,
    items,
    status: 'active',
  })
  const enSource = buildPrescriptionPdf(getClientPrescription(record, 'en'), 'en', 'https://books.example.test').toString('latin1')
  const ruSource = buildPrescriptionPdf(getClientPrescription(record, 'ru'), 'ru', 'https://books.example.test').toString('latin1')

  assert.ok((enSource.match(/\/Type \/Page\b/g) ?? []).length > 1)
  assert.match(enSource, /FIRST-SYNTHETIC-REMEDY/)
  assert.match(enSource, /FINAL-SYNTHETIC-REMEDY/)
  assert.match(enSource, /GENERAL-INSTRUCTIONS-FIRST/)
  assert.match(enSource, /GENERAL-INSTRUCTIONS-FINAL/)
  assert.match(ruSource, /\/Encoding \/Identity-H/)
  assert.match(ruSource, /\/ToUnicode/)
})
