import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const recordKey = (id) => `prescription:record:${id}`
const selectorKey = (selector) => `prescription:selector:${selector}`
const legacyPublicKey = (publicId) => `prescription:public:${publicId}`
const sessionKey = (digest) => `prescription:session:${digest}`
const consultationRequestKey = (id) => `consultation:request:${id}`
const rateKey = (digest) => `prescription:rate:${digest}`
const incrementWithExpiryScript = "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count"

function sessionValue(session) {
  return {
    recordId: session.recordId,
    selector: session.selector,
    accessVersion: session.accessVersion,
    expiresAt: session.expiresAt,
  }
}

export function createMemoryPrescriptionStore(initialRecords = []) {
  const byId = new Map(initialRecords.map((record) => [record.id, record]))
  const bySelector = new Map(initialRecords
    .filter((record) => record.status === 'active' && record.access?.selector)
    .map((record) => [record.access.selector, record.id]))
  const consultationRequests = new Map()
  const sessions = new Map()
  const attempts = new Map()

  return {
    async findById(id) { return byId.get(id) },
    async findBySelector(selector) {
      const recordId = bySelector.get(selector)
      return recordId ? byId.get(recordId) : undefined
    },
    async save(record, previousRecord = byId.get(record.id)) {
      const previousSelector = previousRecord?.access?.selector
      if (previousSelector && (record.status !== 'active' || previousSelector !== record.access?.selector)) {
        bySelector.delete(previousSelector)
      }
      byId.set(record.id, record)
      if (record.status === 'active' && record.access?.selector) bySelector.set(record.access.selector, record.id)
      return record
    },
    async saveAccessIfUnchanged(existing, next) {
      if (!existing || next?.id !== existing.id || existing.status !== 'active' || next.status !== 'active') return false
      if (JSON.stringify(byId.get(existing.id)) !== JSON.stringify(existing)) return false
      const previousSelector = existing.access?.selector
      if (previousSelector && previousSelector !== next.access?.selector) bySelector.delete(previousSelector)
      byId.set(next.id, next)
      if (next.access?.selector) bySelector.set(next.access.selector, next.id)
      return true
    },
    async saveConsultationPair(pair, { requestId, previousRecommendation, previousPayment } = {}) {
      if (requestId && consultationRequests.has(requestId)) {
        const ids = consultationRequests.get(requestId)
        return { recommendation: byId.get(ids[0]), payment: byId.get(ids[1]) }
      }
      const records = [pair.recommendation, pair.payment]
      const previous = [previousRecommendation, previousPayment]
      records.forEach((record, index) => {
        const current = byId.get(record.id)
        if (requestId ? current : !previous[index] || JSON.stringify(current) !== JSON.stringify(previous[index])) throw new Error('Consultation changed; reload before saving')
      })
      // No await between checking both records and committing both records/indexes.
      records.forEach((record, index) => {
        const selector = previous[index]?.access?.selector
        if (selector) bySelector.delete(selector)
        byId.set(record.id, record)
        if (record.status === 'active' && record.access?.selector) bySelector.set(record.access.selector, record.id)
      })
      if (requestId) consultationRequests.set(requestId, records.map((record) => record.id))
      return pair
    },
    async createAccessSession(session, ttlSeconds) {
      sessions.set(session.digest, { ...sessionValue(session), expiresAt: Math.min(session.expiresAt, Date.now() + ttlSeconds * 1000) })
    },
    async findAccessSession(digest) {
      const session = sessions.get(digest)
      if (!session || session.expiresAt <= Date.now()) {
        sessions.delete(digest)
        return undefined
      }
      return session
    },
    async deleteAccessSession(digest) { sessions.delete(digest) },
    async consumeAccessAttempt(digest, limit, windowSeconds) {
      const now = Date.now()
      const current = attempts.get(digest)
      const next = !current || current.expiresAt <= now
        ? { count: 1, expiresAt: now + windowSeconds * 1000 }
        : { ...current, count: current.count + 1 }
      attempts.set(digest, next)
      return next.count <= limit
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


const accessCompareAndSwapScript = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
local values = cjson.decode(ARGV[2])
local removed = cjson.decode(ARGV[3])
redis.call('MSET', unpack(values))
for _, key in ipairs(removed) do redis.call('DEL', key) end
return 1
`

const consultationPairScript = `
if ARGV[1] == 'create' then
  local prior = redis.call('GET', KEYS[3])
  if prior then
    local ids = cjson.decode(prior)
    return redis.call('MGET', ids[1], ids[2])
  end
  if redis.call('EXISTS', KEYS[1], KEYS[2]) > 0 then return redis.error_reply('Consultation conflict') end
else
  if redis.call('GET', KEYS[1]) ~= ARGV[2] or redis.call('GET', KEYS[2]) ~= ARGV[3] then return redis.error_reply('Consultation conflict') end
end
local removed = cjson.decode(ARGV[4])
local values = cjson.decode(ARGV[5])
redis.call('MSET', unpack(values))
for _, key in ipairs(removed) do redis.call('DEL', key) end
return {values[2], values[4]}
`

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
    if (body.error) throw new Error('Prescription storage command failed')
    return body.result
  }

  async function find(storageKey) {
    const value = await command(['GET', storageKey])
    return value ? encryptedRecord(value, key) : undefined
  }

  return {
    findById(id) { return find(recordKey(id)) },
    async findBySelector(selector) {
      const recordId = await command(['GET', selectorKey(selector)])
      return recordId ? find(recordKey(recordId)) : undefined
    },
    async save(record, previousRecord) {
      const previousSelector = previousRecord?.access?.selector
      const nextSelector = record.access?.selector
      if (previousSelector && (record.status !== 'active' || previousSelector !== nextSelector)) {
        await command(['DEL', selectorKey(previousSelector)])
      }
      const legacyPublicId = previousRecord?.publicId ?? record.publicId
      if (legacyPublicId) await command(['DEL', legacyPublicKey(legacyPublicId)])

      if (record.status === 'active' && nextSelector) {
        await command(['SET', recordKey(record.id), encryptedEnvelope(record, key)])
        await command(['SET', selectorKey(nextSelector), record.id])
      } else {
        if (nextSelector) await command(['DEL', selectorKey(nextSelector)])
        await command(['SET', recordKey(record.id), encryptedEnvelope(record, key)])
      }
      return record
    },
    async saveAccessIfUnchanged(existing, next) {
      if (!existing || next?.id !== existing.id || existing.status !== 'active' || next.status !== 'active') return false
      const storageKey = recordKey(existing.id)
      const expected = await command(['GET', storageKey])
      if (!expected || JSON.stringify(encryptedRecord(expected, key)) !== JSON.stringify(existing)) return false
      const values = [storageKey, encryptedEnvelope(next, key)]
      const removed = []
      if (next.access?.selector) values.push(selectorKey(next.access.selector), next.id)
      if (existing.access?.selector && existing.access.selector !== next.access?.selector) removed.push(selectorKey(existing.access.selector))
      if (existing.publicId) removed.push(legacyPublicKey(existing.publicId))
      return Number(await command(['EVAL', accessCompareAndSwapScript, 1, storageKey, expected, JSON.stringify(values), JSON.stringify(removed)])) === 1
    },
    async saveConsultationPair(pair, { requestId, previousRecommendation, previousPayment } = {}) {
      const records = [pair.recommendation, pair.payment]
      const keys = records.map((record) => recordKey(record.id))
      const previous = [previousRecommendation, previousPayment]
      let expected = ['', '']
      if (!requestId) {
        expected = await command(['MGET', ...keys])
        if (expected.some((value, index) => !value || !previous[index] || JSON.stringify(encryptedRecord(value, key)) !== JSON.stringify(previous[index]))) throw new Error('Consultation changed; reload before saving')
      }
      const values = records.flatMap((record) => [recordKey(record.id), encryptedEnvelope(record, key)])
      const removed = new Set()
      records.forEach((record, index) => {
        for (const selector of [previous[index]?.access?.selector, record.access?.selector]) if (selector) removed.add(selectorKey(selector))
        const publicId = previous[index]?.publicId ?? record.publicId
        if (publicId) removed.add(legacyPublicKey(publicId))
        if (record.status === 'active' && record.access?.selector) {
          values.push(selectorKey(record.access.selector), record.id)
          removed.delete(selectorKey(record.access.selector))
        }
      })
      if (requestId) values.push(consultationRequestKey(requestId), JSON.stringify(keys))
      const result = await command(['EVAL', consultationPairScript, 3, ...keys, requestId ? consultationRequestKey(requestId) : keys[0], requestId ? 'create' : 'update', ...expected, JSON.stringify([...removed]), JSON.stringify(values)])
      const saved = result?.map((value) => value && encryptedRecord(value, key))
      if (!saved?.[0] || !saved[1]) throw new Error('Consultation storage result unavailable')
      return { recommendation: saved[0], payment: saved[1] }
    },
    async createAccessSession(session, ttlSeconds) {
      await command(['SET', sessionKey(session.digest), JSON.stringify(sessionValue(session)), 'EX', ttlSeconds])
    },
    async findAccessSession(digest) {
      const value = await command(['GET', sessionKey(digest)])
      if (!value) return undefined
      try { return JSON.parse(value) } catch { return undefined }
    },
    async deleteAccessSession(digest) { await command(['DEL', sessionKey(digest)]) },
    async consumeAccessAttempt(digest, limit, windowSeconds) {
      const keyName = rateKey(digest)
      const count = Number(await command(['EVAL', incrementWithExpiryScript, 1, keyName, windowSeconds]))
      return Number.isFinite(count) && count <= limit
    },
  }
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
  if (isPreview || isLocal) return createMemoryPrescriptionStore()
  return undefined
}

const configuredStoreKey = Symbol.for('psialchemy.prescription-store.v2')

export function getPrescriptionStore() {
  globalThis[configuredStoreKey] ??= createPrescriptionStore()
  return globalThis[configuredStoreKey]
}
