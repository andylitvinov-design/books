import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { createPrescription } from './service.js'

const recordKey = (id) => `prescription:record:${id}`
const publicKey = (publicId) => `prescription:public:${publicId}`

export function createMemoryPrescriptionStore(initialRecords = []) {
  const byId = new Map(initialRecords.map((record) => [record.id, record]))
  const byPublicId = new Map(initialRecords.filter((record) => record.status === 'active').map((record) => [record.publicId, record.id]))

  return {
    async findById(id) { return byId.get(id) },
    async findByPublicId(id) {
      const recordId = byPublicId.get(id)
      return recordId ? byId.get(recordId) : undefined
    },
    async save(record) {
      byId.set(record.id, record)
      if (record.status === 'active') byPublicId.set(record.publicId, record.id)
      else byPublicId.delete(record.publicId)
      return record
    },
  }
}

function encryptionKey(value) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const normalized = value.trim().replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) return undefined
  const unpadded = normalized.replace(/=+$/, '')
  if (unpadded.length % 4 === 1) return undefined
  const expectedPadding = (4 - (unpadded.length % 4)) % 4
  const suppliedPadding = normalized.length - unpadded.length
  if (suppliedPadding && suppliedPadding !== expectedPadding) return undefined
  const key = Buffer.from(unpadded.padEnd(unpadded.length + expectedPadding, '='), 'base64')
  return key.length === 32 ? key : undefined
}

function encryptedEnvelope(record, key) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(record), 'utf8'), cipher.final()])
  return JSON.stringify({
    version: 1,
    algorithm: 'AES-256-GCM',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  })
}

function encryptedRecord(value, key) {
  try {
    const envelope = JSON.parse(value)
    if (envelope?.version !== 1 || envelope.algorithm !== 'AES-256-GCM') return undefined
    const iv = Buffer.from(envelope.iv, 'base64')
    const tag = Buffer.from(envelope.tag, 'base64')
    const ciphertext = Buffer.from(envelope.ciphertext, 'base64')
    if (iv.length !== 12 || tag.length !== 16 || !ciphertext.length) return undefined
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'))
  } catch {
    return undefined
  }
}

function createRestKvStore({ url, token, encryptionKey: key, fetchFn }) {
  if (!url.startsWith('https://')) throw new Error('Prescription storage requires an HTTPS REST endpoint')
  const baseUrl = url.replace(/\/$/, '')

  async function command(value) {
    const response = await fetchFn(baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`Prescription storage request failed (${response.status})`)
    const body = await response.json()
    if (body.error) throw new Error(`Prescription storage error: ${body.error}`)
    return body.result
  }

  async function find(storageKey) {
    const value = await command(['GET', storageKey])
    return value ? encryptedRecord(value, key) : undefined
  }

  return {
    findById(id) { return find(recordKey(id)) },
    async findByPublicId(id) {
      const recordId = await command(['GET', publicKey(id)])
      return recordId ? find(recordKey(recordId)) : undefined
    },
    async save(record) {
      if (record.status === 'active') {
        await command(['SET', recordKey(record.id), encryptedEnvelope(record, key)])
        await command(['SET', publicKey(record.publicId), record.id])
      } else {
        await command(['DEL', publicKey(record.publicId)])
        await command(['SET', recordKey(record.id), encryptedEnvelope(record, key)])
      }
      return record
    },
  }
}

function demoRecord() {
  const record = createPrescription({
    patientName: 'Test Client',
    dateIssued: '2026-09-07',
    languagePreference: 'bilingual',
    practitionerName: 'Andrii Litvinov',
    practitionerRole: 'Homeopathy / Integrative Practice',
    practitionerBackground: 'Professional background: Ukraine',
    practitionerContact: 'contact@example.test',
    generalInstructions: 'Fixture/test content only. This preview contains no clinical guidance.',
    internalNotes: 'Preview fixture: never client-visible.',
    status: 'active',
    items: [
      { remedySlug: 'arsenicum-album', potency: '30C', dosage: 'fixture/test content', frequency: 'fixture/test content', duration: 'fixture/test content' },
      { remedySlug: 'natrum-muriaticum', potency: '200C', dosage: 'fixture/test content', frequency: 'fixture/test content', duration: 'fixture/test content' },
      { remedySlug: 'gelsemium', potency: '30C', dosage: 'fixture/test content', frequency: 'fixture/test content', duration: 'fixture/test content' },
    ],
  }, '2026-09-07T00:00:00.000Z')
  return { ...record, id: 'c849fe34-f095-46bf-af7b-d2df644ad2b8', publicId: 'R6YHO8oypwoaV1U_1SmPTuxWL2uB3TedLnGVUOqu7Uc' }
}

export function createPrescriptionStore({ environment = process.env, fetchFn = fetch } = {}) {
  const url = environment.PRESCRIPTIONS_KV_REST_API_URL
  const token = environment.PRESCRIPTIONS_KV_REST_API_TOKEN
  const key = encryptionKey(environment.PRESCRIPTIONS_DATA_ENCRYPTION_KEY)
  if (url || token || environment.PRESCRIPTIONS_DATA_ENCRYPTION_KEY) {
    if (!url || !token || !key) return undefined
    return createRestKvStore({ url, token, encryptionKey: key, fetchFn })
  }

  const isPreview = environment.VERCEL_ENV === 'preview'
  const isLocal = environment.NODE_ENV === 'development' || environment.NODE_ENV === 'test'
  if (isPreview || isLocal) return createMemoryPrescriptionStore([demoRecord()])
  return undefined
}

let configuredStore

export function getPrescriptionStore() {
  configuredStore ??= createPrescriptionStore()
  return configuredStore
}
