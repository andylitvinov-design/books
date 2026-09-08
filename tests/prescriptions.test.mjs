import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createPrescription,
  getClientPrescription,
  validatePrescriptionInput,
} from '../lib/prescriptions/service.js'
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

test('creates non-sequential internal and public identifiers', () => {
  const first = createPrescription(baseInput)
  const second = createPrescription(baseInput)

  assert.match(first.id, /^[0-9a-f-]{36}$/)
  assert.match(first.publicId, /^[A-Za-z0-9_-]{43}$/)
  assert.notEqual(first.id, first.publicId)
  assert.notEqual(first.publicId, second.publicId)
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

  assert.equal(ru.publicId, record.publicId)
  assert.equal(en.publicId, record.publicId)
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

test('keeps private lookup IDs server-only while resolving a public token', async () => {
  const store = createMemoryPrescriptionStore()
  const record = createPrescription({ ...baseInput, status: 'active' })

  await store.save(record)
  assert.deepEqual(await store.findById(record.id), record)
  assert.deepEqual(await store.findByPublicId(record.publicId), record)
  assert.equal(await store.findByPublicId(record.id), undefined)
})

test('fails closed when the persistent REST-KV configuration is absent outside demo runtime', () => {
  assert.equal(createPrescriptionStore({ environment: { NODE_ENV: 'production' } }), undefined)
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

test('keeps the PDF footer below general instructions instead of overlapping it', () => {
  const record = createPrescription({ ...baseInput, status: 'active' })
  const source = buildPrescriptionPdf(getClientPrescription(record, 'en'), 'en', 'https://books.example.test').toString('latin1')
  const instructionY = Number(source.match(/1 0 0 1 52 (\d+(?:\.\d+)?) Tm \(Fixture\/test content only/)?.[1])
  const updatedY = Number(source.match(/1 0 0 1 52 (\d+(?:\.\d+)?) Tm \(Updated:/)?.[1])

  assert.ok(updatedY <= instructionY - 20)
})
