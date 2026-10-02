// Additive namespace within the existing store. Never a separate client database.
import { AssessmentError } from './assessments.js'
const recordKey = id => `client:assessment:${id}`
const indexKey = id => `client:assessments:${id}`
const requestKey = (clientId, id) => `client:assessment-request:${clientId}:${id}`
const clientKey = id => `client:record:${id}`
const documentKey = id => `prescription:record:${id}`
const clone = value => value === undefined ? undefined : structuredClone(value)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
function conflict() { throw new AssessmentError('CONFLICT') }
function unavailable() { throw new AssessmentError('UNAVAILABLE') }
function needsRelations(previous, next) {
  return !previous || next.status === 'shared' || (previous.status === 'draft' && next.status === 'draft')
}
function validUpdate(previous, next) {
  return previous?.id === next?.id && previous?.clientId === next?.clientId && next.revision === previous.revision + 1
}
export function createMemoryAssessmentStore({ clients, documents }) {
  const records = new Map(), indexes = new Map(), requests = new Map()
  function check(record, relations) {
    if (clients.get(record.clientId)?.status !== 'active') unavailable()
    if (relations && record.relatedDocumentIds.some(id => { const doc = documents.get(id); return !doc || doc.clientId !== record.clientId || doc.status !== 'active' })) throw new AssessmentError('VALIDATION')
  }
  return {
    assessmentStorage: 'memory',
    async findClientAssessment(id) { return clone(records.get(id)) },
    async listClientAssessments(clientId) { return [...(indexes.get(clientId) ?? [])].map(id => clone(records.get(id))).filter(r => r?.clientId === clientId) },
    async createClientAssessment(record, { requestId, fingerprint }) {
      check(record, true)
      const key = requestKey(record.clientId, requestId), prior = requests.get(key)
      if (prior) { if (prior.fingerprint !== fingerprint) conflict(); return clone(records.get(prior.id)) }
      if (records.has(record.id)) conflict()
      // No await between validation and the record/index/idempotency commit.
      const ids = indexes.get(record.clientId) ?? new Set()
      records.set(record.id, clone(record)); ids.add(record.id); indexes.set(record.clientId, ids)
      requests.set(key, { id: record.id, fingerprint })
      return clone(record)
    },
    async updateClientAssessmentIfUnchanged(previous, next) {
      if (!validUpdate(previous, next) || !same(records.get(previous.id), previous)) return false
      check(next, needsRelations(previous, next))
      records.set(next.id, clone(next)); return true
    },
  }
}
const createScript = `
local prior = redis.call('GET', KEYS[3])
if prior then return { 'retry', prior } end
if redis.call('EXISTS', KEYS[1]) == 1 then return { 'conflict' } end
if redis.call('GET', KEYS[4]) ~= ARGV[4] then return { 'conflict' } end
local docs = cjson.decode(ARGV[5])
for i=5,#KEYS do if redis.call('GET', KEYS[i]) ~= docs[i-4] then return { 'conflict' } end end
redis.call('MSET', KEYS[1], ARGV[1], KEYS[3], ARGV[3])
redis.call('SADD', KEYS[2], ARGV[2])
return { 'created', ARGV[1] }
`
const updateScript = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if redis.call('GET', KEYS[2]) ~= ARGV[3] then return 0 end
local docs = cjson.decode(ARGV[4])
for i=3,#KEYS do if redis.call('GET', KEYS[i]) ~= docs[i-2] then return 0 end end
redis.call('SET', KEYS[1], ARGV[2])
return 1
`
export function createKvAssessmentStore({ command, encode, decode }) {
  async function find(id) { const raw = await command(['GET', recordKey(id)]); return raw ? decode(raw) : undefined }
  async function constraints(record, relations) {
    const clientRaw = await command(['GET', clientKey(record.clientId)])
    const client = clientRaw && decode(clientRaw)
    if (client?.id !== record.clientId || client.status !== 'active') unavailable()
    const keys = relations ? record.relatedDocumentIds.map(documentKey) : []
    const values = keys.length ? await command(['MGET', ...keys]) : []
    for (const value of values) {
      const doc = value && decode(value)
      if (!doc || doc.clientId !== record.clientId || doc.status !== 'active') throw new AssessmentError('VALIDATION')
    }
    return { clientRaw, keys, values }
  }
  return {
    assessmentStorage: 'encrypted-kv',
    findClientAssessment: find,
    async listClientAssessments(clientId) {
      const ids = await command(['SMEMBERS', indexKey(clientId)])
      if (!ids?.length) return []
      const values = await command(['MGET', ...ids.map(recordKey)])
      return values.map(raw => raw && decode(raw)).filter(r => r && r.clientId === clientId)
    },
    async createClientAssessment(record, { requestId, fingerprint }) {
      const state = await constraints(record, true)
      const keys = [recordKey(record.id), indexKey(record.clientId), requestKey(record.clientId, requestId), clientKey(record.clientId), ...state.keys]
      // The fingerprint and all record content live inside encrypted envelopes.
      const marker = encode({ id: record.id, clientId: record.clientId, fingerprint })
      const result = await command(['EVAL', createScript, keys.length, ...keys, encode(record), record.id, marker, state.clientRaw, JSON.stringify(state.values)])
      if (result?.[0] === 'created') return decode(result[1])
      if (result?.[0] === 'retry') {
        const prior = decode(result[1])
        if (prior?.clientId !== record.clientId || prior.fingerprint !== fingerprint) conflict()
        const saved = await find(prior.id)
        if (!saved || saved.clientId !== record.clientId) unavailable()
        return saved
      }
      conflict()
    },
    async updateClientAssessmentIfUnchanged(previous, next) {
      if (!validUpdate(previous, next)) return false
      const raw = await command(['GET', recordKey(previous.id)])
      if (!raw || !same(decode(raw), previous)) return false
      const state = await constraints(next, needsRelations(previous, next))
      const keys = [recordKey(next.id), clientKey(next.clientId), ...state.keys]
      return Number(await command(['EVAL', updateScript, keys.length, ...keys, raw, encode(next), state.clientRaw, JSON.stringify(state.values)])) === 1
    },
  }
}
