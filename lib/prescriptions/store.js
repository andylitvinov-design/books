import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const recordKey = (id) => `prescription:record:${id}`
const selectorKey = (selector) => `prescription:selector:${selector}`
const legacyPublicKey = (publicId) => `prescription:public:${publicId}`
const sessionKey = (digest) => `prescription:session:${digest}`
const consultationRequestKey = (id) => `consultation:request:${id}`
const clientKey = id => `client:record:${id}`
const clientSelectorKey = selector => `client:selector:${selector}`
const clientDocumentsKey = id => `client:documents:${id}`
const clientSessionKey = digest => `client:session:${digest}`
const assignmentKey = id => `client:assignment:${id}`
function assignmentResult(records, clientId) { return { clientId, records, recommendation: records.find(r => r.kind !== 'payment'), payment: records.find(r => r.kind === 'payment') } }
const clientDirectoryKey = 'client:index:v1'
const cabinetSessionValue = s => ({ clientId: s.clientId, selector: s.selector, accessVersion: s.accessVersion, expiresAt: s.expiresAt })
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
  const assignments = new Map()
  const clients = new Map()
  const history = new Map()
  const cabinetSessions = new Map()
  const sessions = new Map()
  const attempts = new Map()

  return {
    async findLegacyAssignment(requestId, documentId) {
      const prior = assignments.get(requestId)
      if (!prior) return undefined
      if (prior.documentId !== documentId) throw new Error('Assignment request conflict')
      return assignmentResult(prior.ids.map(id => byId.get(id)), prior.clientId)
    },
    async assignLegacyDocuments(records, { client, newClient, requestId, documentId }) {
      const prior = requestId && assignments.get(requestId)
      if (prior) {
        if (prior.documentId !== documentId) throw new Error('Assignment request conflict')
        return assignmentResult(prior.ids.map(id => byId.get(id)), prior.clientId)
      }
      if (records.some(r => r.clientId || JSON.stringify(byId.get(r.id)) !== JSON.stringify(r))) throw new Error('Document changed; reload')
      if (newClient ? clients.has(client.id) : JSON.stringify(clients.get(client.id)) !== JSON.stringify(client)) throw new Error('Client changed; reload')
      const next = records.map(r => {
        const recommendation = r.kind === 'payment' && records.find(candidate => candidate.kind !== 'payment' && candidate.paymentDocumentId === r.id)
        return { ...r, clientId: client.id, ...(recommendation ? { consultationId: recommendation.id } : {}) }
      })
      if (newClient) clients.set(client.id, client)
      const ids = history.get(client.id) ?? new Set()
      next.forEach(r => { byId.set(r.id, r); ids.add(r.id) }); history.set(client.id, ids)
      if (requestId) assignments.set(requestId, { documentId, ids: next.map(r => r.id), clientId: client.id })
      return assignmentResult(next, client.id)
    },
    async findClientById(id) { return clients.get(id) },
    async listClients() { return [...clients.values()] },
    async findClientBySelector(selector) { return [...clients.values()].find(c => c.status === 'active' && !c.cabinetAccess?.revoked && c.cabinetAccess?.selector === selector) },
    async saveClient(client, previous) {
      if (previous && JSON.stringify(clients.get(client.id)) !== JSON.stringify(previous)) throw new Error('Client changed; reload')
      if (!previous && clients.has(client.id)) throw new Error('Client conflict')
      clients.set(client.id, client); return client
    },
    async saveClientIfUnchanged(previous, next) {
      if (next.id !== previous.id || JSON.stringify(clients.get(previous.id)) !== JSON.stringify(previous)) return false
      clients.set(next.id, next); return true
    },
    async listClientDocuments(id) { return [...(history.get(id) ?? [])].map(id => byId.get(id)).filter(Boolean) },
    async listUnassignedConsultations({ cursor = '0', limit = 50 } = {}) {
      const count = Math.max(1, Math.min(100, Number(limit) || 50)); const start = Math.max(0, Number(cursor) || 0)
      const all = [...byId.values()]; const page = all.slice(start, start + count)
      return { cursor: start + count >= all.length ? '0' : String(start + count), records: page.filter(r => !r.clientId && !(r.kind === 'payment' && r.consultationId)) }
    },
    async createCabinetSession(session, ttlSeconds) { cabinetSessions.set(session.digest, { ...cabinetSessionValue(session), expiresAt: Math.min(session.expiresAt, Date.now() + ttlSeconds * 1000) }) },
    async findCabinetSession(digest) { const s = cabinetSessions.get(digest); return s?.expiresAt > Date.now() ? s : undefined },
    async deleteCabinetSession(digest) { cabinetSessions.delete(digest) },
    async findById(id) { return byId.get(id) },
    async findBySelector(selector) {
      const recordId = bySelector.get(selector)
      return recordId ? byId.get(recordId) : undefined
    },
    async save(record, previousRecord = byId.get(record.id)) {
      const current = byId.get(record.id)
      if (previousRecord && JSON.stringify(current) !== JSON.stringify(previousRecord)) throw new Error('Document changed; reload')
      if (current?.clientId && current.clientId !== record.clientId) throw new Error('Client identity is immutable')
      if (previousRecord?.clientId && previousRecord.clientId !== record.clientId) throw new Error('Client identity is immutable')
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
    async attachPaymentToRecommendation(existing, pair) {
      if (JSON.stringify(byId.get(existing.id)) !== JSON.stringify(existing) || existing.paymentDocumentId || byId.has(pair.payment.id)) throw new Error('Document changed; reload')
      byId.set(existing.id, pair.recommendation); byId.set(pair.payment.id, pair.payment)
      if (pair.payment.status === 'active' && pair.payment.access?.selector) bySelector.set(pair.payment.access.selector, pair.payment.id)
      if (existing.clientId) { const ids = history.get(existing.clientId) ?? new Set(); ids.add(existing.id); ids.add(pair.payment.id); history.set(existing.clientId, ids) }
      return pair
    },
    async saveConsultationPair(pair, { requestId, previousRecommendation, previousPayment, newClient, existingClient } = {}) {
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
      const clientId = pair.recommendation.clientId
      if (clientId !== pair.payment.clientId) throw new Error('Client mismatch')
      previous.forEach((p, i) => { if (p?.clientId && p.clientId !== records[i].clientId) throw new Error('Client identity is immutable') })
      if (clientId) {
        if (newClient ? clients.has(clientId) || newClient.id !== clientId : !clients.has(clientId) || clients.get(clientId).status !== 'active') throw new Error('Client unavailable')
        if (existingClient && JSON.stringify(clients.get(clientId)) !== JSON.stringify(existingClient)) throw new Error('Client changed; reload')
      }
      // No await between checking both records and committing both records/indexes.
      records.forEach((record, index) => {
        const selector = previous[index]?.access?.selector
        if (selector) bySelector.delete(selector)
        byId.set(record.id, record)
        if (record.status === 'active' && record.access?.selector) bySelector.set(record.access.selector, record.id)
      })
      if (newClient) clients.set(newClient.id, newClient)
      if (clientId) { const ids = history.get(clientId) ?? new Set(); records.forEach(r => ids.add(r.id)); history.set(clientId, ids) }
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

const newRecordCompareAndSwapScript = `
if redis.call('EXISTS', KEYS[1]) ~= 0 then return 0 end
local values = cjson.decode(ARGV[2])
local removed = cjson.decode(ARGV[3])
redis.call('MSET', unpack(values))
for _, key in ipairs(removed) do redis.call('DEL', key) end
return 1
`

const attachPaymentScript = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] or redis.call('EXISTS', KEYS[2]) ~= 0 then return 0 end
redis.call('MSET', KEYS[1], ARGV[2], KEYS[2], ARGV[3])
if ARGV[4] ~= '' then redis.call('SADD', ARGV[4], ARGV[5], ARGV[6]) end
if ARGV[7] ~= '' then redis.call('SET', ARGV[7], ARGV[6]) end
return 1
`

const legacyAssignmentScript = `
local state = cjson.decode(ARGV[1])
if state.requestKey then
  local prior = redis.call('GET', state.requestKey)
  if prior then
    local saved = cjson.decode(prior)
    if saved.documentId ~= state.documentId then return redis.error_reply('Assignment request conflict') end
    return redis.call('MGET', unpack(saved.keys))
  end
end
for i, key in ipairs(state.keys) do
  if redis.call('GET', key) ~= state.expected[i] then return redis.error_reply('Document changed') end
end
local current = redis.call('GET', state.clientKey)
if state.isNew then
  if current then return redis.error_reply('Client conflict') end
elseif current ~= state.clientExpected then return redis.error_reply('Client changed') end
local values = cjson.decode(ARGV[2])
redis.call('MSET', unpack(values))
redis.call('SADD', state.directory, state.clientId)
redis.call('SADD', state.history, unpack(state.ids))
return redis.call('MGET', unpack(state.keys))
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
if ARGV[6] and ARGV[6] ~= '' then
  local client = cjson.decode(ARGV[6])
  local current = redis.call('GET', client.key)
  if client.isNew then
    if current then return redis.error_reply('Client conflict') end
  elseif current ~= client.expected then return redis.error_reply('Client changed') end
end
local removed = cjson.decode(ARGV[4])
local values = cjson.decode(ARGV[5])
redis.call('MSET', unpack(values))
for _, key in ipairs(removed) do redis.call('DEL', key) end
if ARGV[6] and ARGV[6] ~= '' then
  local client = cjson.decode(ARGV[6])
  redis.call('SADD', client.directory, client.id)
  redis.call('SADD', client.history, client.documents[1], client.documents[2])
end
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
    async findLegacyAssignment(requestId, documentId) {
      const value = await command(['GET', assignmentKey(requestId)])
      if (!value) return undefined
      const prior = JSON.parse(value)
      if (prior.documentId !== documentId) throw new Error('Assignment request conflict')
      const records = (await command(['MGET', ...prior.keys])).map(v => v && encryptedRecord(v, key))
      if (records.some(r => !r || r.clientId !== prior.clientId)) throw new Error('Assignment unavailable')
      return assignmentResult(records, prior.clientId)
    },
    async assignLegacyDocuments(records, { client, newClient, requestId, documentId }) {
      const keys = records.map(r => recordKey(r.id)); const expected = await command(['MGET', ...keys])
      // A winner may have committed between the service read and this read.
      if (requestId) { const prior = await this.findLegacyAssignment(requestId, documentId); if (prior) return prior }
      if (records.some((r, i) => r.clientId || !expected[i] || JSON.stringify(encryptedRecord(expected[i], key)) !== JSON.stringify(r))) throw new Error('Document changed; reload')
      const clientExpected = newClient ? undefined : await command(['GET', clientKey(client.id)])
      if (!newClient && (!clientExpected || JSON.stringify(encryptedRecord(clientExpected, key)) !== JSON.stringify(client))) throw new Error('Client changed; reload')
      const next = records.map(r => {
        const recommendation = r.kind === 'payment' && records.find(candidate => candidate.kind !== 'payment' && candidate.paymentDocumentId === r.id)
        return { ...r, clientId: client.id, ...(recommendation ? { consultationId: recommendation.id } : {}) }
      })
      const values = next.flatMap(r => [recordKey(r.id), encryptedEnvelope(r, key)])
      if (newClient) values.push(clientKey(client.id), encryptedEnvelope(client, key))
      const requestKey = requestId ? assignmentKey(requestId) : undefined
      if (requestKey) values.push(requestKey, JSON.stringify({ documentId, keys, clientId: client.id }))
      const state = { requestKey, documentId, keys, expected, clientKey: clientKey(client.id), clientExpected, isNew: newClient, directory: clientDirectoryKey, history: clientDocumentsKey(client.id), clientId: client.id, ids: records.map(r => r.id) }
      const saved = (await command(['EVAL', legacyAssignmentScript, 0, JSON.stringify(state), JSON.stringify(values)])).map(v => v && encryptedRecord(v, key))
      if (saved.some(r => !r) || !saved[0]?.clientId || saved.some(r => r.clientId !== saved[0].clientId)) throw new Error('Assignment unavailable')
      return assignmentResult(saved, saved[0].clientId)
    },
    findClientById(id) { return find(clientKey(id)) },
    async listClients() {
      const ids = await command(['SMEMBERS', clientDirectoryKey])
      if (!ids?.length) return []
      const values = await command(['MGET', ...ids.map(clientKey)])
      return values.map(v => v && encryptedRecord(v, key)).filter(Boolean)
    },
    async findClientBySelector(selector) { const id = await command(['GET', clientSelectorKey(selector)]); return id ? find(clientKey(id)) : undefined },
    async saveClient(client, previous) {
      if (previous) { if (!await this.saveClientIfUnchanged(previous, client)) throw new Error('Client changed; reload'); return client }
      const result = await command(['EVAL', "if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end; redis.call('SET', KEYS[1], ARGV[1]); redis.call('SADD', KEYS[2], ARGV[2]); return 1", 2, clientKey(client.id), clientDirectoryKey, encryptedEnvelope(client, key), client.id])
      if (Number(result) !== 1) throw new Error('Client conflict')
      return client
    },
    async saveClientIfUnchanged(previous, next) {
      if (previous.id !== next.id) return false
      const storageKey = clientKey(previous.id); const expected = await command(['GET', storageKey])
      if (!expected || JSON.stringify(encryptedRecord(expected, key)) !== JSON.stringify(previous)) return false
      const values = [storageKey, encryptedEnvelope(next, key)]; const removed = []
      if (previous.cabinetAccess?.selector) removed.push(clientSelectorKey(previous.cabinetAccess.selector))
      if (next.status === 'active' && !next.cabinetAccess?.revoked && next.cabinetAccess?.selector) {
        const selector = clientSelectorKey(next.cabinetAccess.selector); values.push(selector, next.id)
        const i = removed.indexOf(selector); if (i >= 0) removed.splice(i, 1)
      }
      return Number(await command(['EVAL', accessCompareAndSwapScript, 1, storageKey, expected, JSON.stringify(values), JSON.stringify(removed)])) === 1
    },
    async listClientDocuments(id) {
      const ids = await command(['SMEMBERS', clientDocumentsKey(id)])
      if (!ids?.length) return []
      return (await command(['MGET', ...ids.map(recordKey)])).map(v => v && encryptedRecord(v, key)).filter(r => r && r.clientId === id)
    },
    async listUnassignedConsultations({ cursor = '0', limit = 50 } = {}) {
      if (!/^\d+$/.test(String(cursor))) throw new Error('Invalid cursor')
      const [next, keys] = await command(['SCAN', String(cursor), 'MATCH', 'prescription:record:*', 'COUNT', Math.max(1, Math.min(100, Number(limit) || 50))])
      const records = keys.length ? (await command(['MGET', ...keys])).map(v => v && encryptedRecord(v, key)).filter(r => r && !r.clientId && !(r.kind === 'payment' && r.consultationId)) : []
      return { cursor: String(next), records }
    },
    async createCabinetSession(session, ttlSeconds) { await command(['SET', clientSessionKey(session.digest), JSON.stringify(cabinetSessionValue(session)), 'EX', ttlSeconds]) },
    async findCabinetSession(digest) { const v = await command(['GET', clientSessionKey(digest)]); try { const s = JSON.parse(v); return s?.expiresAt > Date.now() ? s : undefined } catch { return undefined } },
    async deleteCabinetSession(digest) { await command(['DEL', clientSessionKey(digest)]) },
    findById(id) { return find(recordKey(id)) },
    async findBySelector(selector) {
      const recordId = await command(['GET', selectorKey(selector)])
      return recordId ? find(recordKey(recordId)) : undefined
    },
    async save(record, previousRecord) {
      const storageKey = recordKey(record.id)
      const expected = await command(['GET', storageKey])
      const current = expected && encryptedRecord(expected, key)
      if (previousRecord && (!current || JSON.stringify(current) !== JSON.stringify(previousRecord))) throw new Error('Document changed; reload')
      if (current?.clientId && current.clientId !== record.clientId) throw new Error('Client identity is immutable')
      const values = [storageKey, encryptedEnvelope(record, key)]
      const removed = new Set()
      const old = current ?? previousRecord
      if (old?.access?.selector) removed.add(selectorKey(old.access.selector))
      if (record.access?.selector) removed.add(selectorKey(record.access.selector))
      if (old?.publicId ?? record.publicId) removed.add(legacyPublicKey(old?.publicId ?? record.publicId))
      if (record.status === 'active' && record.access?.selector) {
        const selector = selectorKey(record.access.selector); values.push(selector, record.id); removed.delete(selector)
      }
      const script = expected ? accessCompareAndSwapScript : newRecordCompareAndSwapScript
      if (Number(await command(['EVAL', script, 1, storageKey, expected ?? '', JSON.stringify(values), JSON.stringify([...removed])])) !== 1) throw new Error('Document changed; reload')
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
    async attachPaymentToRecommendation(existing, pair) {
      const expected = await command(['GET', recordKey(existing.id)])
      if (!expected || existing.paymentDocumentId || JSON.stringify(encryptedRecord(expected, key)) !== JSON.stringify(existing)) throw new Error('Document changed; reload')
      const { recommendation, payment } = pair
      const result = await command(['EVAL', attachPaymentScript, 2, recordKey(existing.id), recordKey(payment.id), expected, encryptedEnvelope(recommendation, key), encryptedEnvelope(payment, key), existing.clientId ? clientDocumentsKey(existing.clientId) : '', existing.id, payment.id, payment.status === 'active' && payment.access?.selector ? selectorKey(payment.access.selector) : ''])
      if (Number(result) !== 1) throw new Error('Document changed; reload')
      return pair
    },
    async saveConsultationPair(pair, { requestId, previousRecommendation, previousPayment, newClient, existingClient } = {}) {
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
      const clientId = pair.recommendation.clientId
      if (clientId !== pair.payment.clientId) throw new Error('Client mismatch')
      previous.forEach((p, i) => { if (p?.clientId && p.clientId !== records[i].clientId) throw new Error('Client identity is immutable') })
      let clientState = ''
      if (clientId) {
        const expectedClient = newClient ? undefined : await command(['GET', clientKey(clientId)])
        const currentClient = expectedClient && encryptedRecord(expectedClient, key)
        if (newClient ? newClient.id !== clientId : !currentClient || currentClient.status !== 'active' || (existingClient && JSON.stringify(currentClient) !== JSON.stringify(existingClient))) throw new Error('Client unavailable or changed')
        if (newClient) values.push(clientKey(clientId), encryptedEnvelope(newClient, key))
        clientState = JSON.stringify({ key: clientKey(clientId), id: clientId, isNew: Boolean(newClient), expected: expectedClient, directory: clientDirectoryKey, history: clientDocumentsKey(clientId), documents: records.map(r => r.id) })
      }
      const result = await command(['EVAL', consultationPairScript, 3, ...keys, requestId ? consultationRequestKey(requestId) : keys[0], requestId ? 'create' : 'update', ...expected, JSON.stringify([...removed]), JSON.stringify(values), clientState])
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
