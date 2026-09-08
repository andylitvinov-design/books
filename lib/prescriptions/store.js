import { createPrescription } from './service.js'

const recordKey = (id) => `prescription:record:${id}`
const publicKey = (publicId) => `prescription:public:${publicId}`

export function createMemoryPrescriptionStore(initialRecords = []) {
  const byId = new Map(initialRecords.map((record) => [record.id, record]))
  const byPublicId = new Map(initialRecords.map((record) => [record.publicId, record.id]))

  return {
    async findById(id) { return byId.get(id) },
    async findByPublicId(id) {
      const recordId = byPublicId.get(id)
      return recordId ? byId.get(recordId) : undefined
    },
    async save(record) {
      byId.set(record.id, record)
      byPublicId.set(record.publicId, record.id)
      return record
    },
  }
}

function createRestKvStore({ url, token, fetchFn }) {
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

  async function find(key) {
    const value = await command(['GET', key])
    return value ? JSON.parse(value) : undefined
  }

  return {
    findById(id) { return find(recordKey(id)) },
    async findByPublicId(id) {
      const recordId = await command(['GET', publicKey(id)])
      return recordId ? find(recordKey(recordId)) : undefined
    },
    async save(record) {
      await command(['SET', recordKey(record.id), JSON.stringify(record)])
      await command(['SET', publicKey(record.publicId), record.id])
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
  if (url && token) return createRestKvStore({ url, token, fetchFn })

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
