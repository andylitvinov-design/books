import { isSiteVideoRecord, SiteVideoError, videoKey } from './model.js'
import { builtInSiteVideoRecords } from './defaults.js'

// Public editorial data has its own namespace. Never read or mutate the
// prescriptions/client records that use the same server-side Redis connection.
const namespace = 'holistic-house:site-videos:v1'
const timeoutMs = 5000
// Both a draft and its current published snapshot may contain a full transcript.
// JSON escaping expands quotes, backslashes and line breaks in both copies.
const maxSerializedRecordLength = 200000
const compareAndSwapScript = `
local current = redis.call('HGET', KEYS[1], ARGV[1])
local expected = tonumber(ARGV[2])
if current then
  local ok, record = pcall(cjson.decode, current)
  if not ok or type(record) ~= 'table' or record.key ~= ARGV[1] then return 0 end
  if type(record.revision) ~= 'number' or record.revision < 1 or record.revision ~= expected then return 0 end
elseif expected ~= 0 then
  return 0
end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3])
return 1
`

const storageError = () => new SiteVideoError('storage', 'Video storage is unavailable. Please try again.')
const conflictError = () => new SiteVideoError('conflict', 'This video changed. Reload before saving again.')

function assertKey(key) {
  if (typeof key !== 'string') throw new SiteVideoError('validation')
  const [slot, locale, entityId = '', ...extra] = key.split(':')
  if (extra.length || videoKey(slot, locale, entityId) !== key) throw new SiteVideoError('validation')
}

function assertChange(record, expectedRevision) {
  if (!isSiteVideoRecord(record) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0
    || record.revision !== expectedRevision + 1) throw new SiteVideoError('validation')
  const serialized = JSON.stringify(record)
  if (serialized.length > maxSerializedRecordLength) throw new SiteVideoError('validation')
  return serialized
}

function storedRecord(value, key) {
  if (typeof value !== 'string' || value.length > maxSerializedRecordLength) return null
  try {
    const record = JSON.parse(value)
    return record?.key === key && record.revision >= 1 && isSiteVideoRecord(record) ? record : null
  } catch {
    return null
  }
}

/** Explicit test dependency only. Runtime configuration never falls back to memory. */
export function createMemorySiteVideoStore(initialRecords = []) {
  const records = new Map()
  for (const record of initialRecords) {
    if (!isSiteVideoRecord(record) || records.has(record.key)) throw new SiteVideoError('validation')
    records.set(record.key, structuredClone(record))
  }
  return {
    async list() {
      return [...records.values()].sort((a, b) => a.key.localeCompare(b.key)).map(record => structuredClone(record))
    },
    async get(key) {
      assertKey(key)
      return records.has(key) ? structuredClone(records.get(key)) : null
    },
    async save(record, expectedRevision) {
      assertChange(record, expectedRevision)
      if ((records.get(record.key)?.revision ?? 0) !== expectedRevision) throw conflictError()
      // No await between the comparison and mutation: concurrent writers have
      // the same atomic success/conflict behavior as the Redis implementation.
      records.set(record.key, structuredClone(record))
    },
  }
}

function restEndpoint(value) {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  if (/[\s\\]/.test(normalized)) return undefined
  try {
    const url = new URL(normalized)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return undefined
    const authority = normalized.match(/^https:\/\/([^/?#]+)/)?.[1]
    if (!authority || !/^[A-Za-z0-9.-]+(?::443)?$/.test(authority)) return undefined
    return url.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}

function createRestStore({ url, token, fetchFn, initialRecords }) {
  async function command(value) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchFn(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
        cache: 'no-store',
        redirect: 'error',
        credentials: 'omit',
        signal: controller.signal,
      })
      if (!response.ok) throw storageError()
      const result = await response.json()
      if (!result || typeof result !== 'object' || result.error || !Object.hasOwn(result, 'result')) throw storageError()
      return result.result
    } catch {
      // Endpoint, credentials, upstream errors, and record contents are private
      // server details and must never appear in returned errors or logs.
      throw storageError()
    } finally {
      clearTimeout(timeout)
    }
  }

  return {
    async list() {
      const result = await command(['HGETALL', namespace])
      let entries
      if (Array.isArray(result) && result.length % 2 === 0) {
        entries = []
        for (let index = 0; index < result.length; index += 2) entries.push([result[index], result[index + 1]])
      } else if (result && typeof result === 'object' && !Array.isArray(result)) entries = Object.entries(result)
      else throw storageError()
      const records = new Map(initialRecords.map(record => [record.key, structuredClone(record)]))
      for (const [key, value] of entries) {
        // Any persisted override takes precedence, including hidden records.
        // A malformed override must not resurrect the built-in publication.
        records.delete(key)
        const record = storedRecord(value, key)
        if (record) records.set(key, record)
      }
      return [...records.values()].sort((a, b) => a.key.localeCompare(b.key))
    },
    async get(key) {
      assertKey(key)
      const value = await command(['HGET', namespace, key])
      if (value === null) return structuredClone(initialRecords.find(record => record.key === key) ?? null)
      const record = storedRecord(value, key)
      if (!record) throw storageError()
      return record
    },
    async save(record, expectedRevision) {
      const serialized = assertChange(record, expectedRevision)
      const result = await command(['EVAL', compareAndSwapScript, 1, namespace, record.key, expectedRevision, serialized])
      if (result === 0 || result === '0') throw conflictError()
      if (result !== 1 && result !== '1') throw storageError()
    },
  }
}

/** Server use only; no NEXT_PUBLIC configuration or browser credentials. */
export function createSiteVideoStore({ environment = process.env, fetchFn = fetch, initialRecords = [] } = {}) {
  if (typeof window !== 'undefined') return undefined
  const url = restEndpoint(environment.PRESCRIPTIONS_KV_REST_API_URL)
  const token = environment.PRESCRIPTIONS_KV_REST_API_TOKEN
  if (!url || typeof token !== 'string' || !token.trim() || /[\r\n]/.test(token)) return undefined
  if (!Array.isArray(initialRecords) || initialRecords.some(record => record.revision !== 0 || !isSiteVideoRecord(record))) throw new SiteVideoError('validation')
  return createRestStore({ url, token: token.trim(), fetchFn, initialRecords })
}

const configuredStoreKey = Symbol.for('holistic-house.site-videos.store.v1')

export function getSiteVideoStore() {
  if (typeof window !== 'undefined') return undefined
  if (globalThis[configuredStoreKey]) return globalThis[configuredStoreKey]
  const store = createSiteVideoStore({ initialRecords: builtInSiteVideoRecords() })
  // A missing build-time configuration must not freeze the public module empty
  // after the server receives its runtime configuration.
  if (store) globalThis[configuredStoreKey] = store
  return store
}
