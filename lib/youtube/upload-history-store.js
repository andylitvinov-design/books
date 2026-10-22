import {RUSSIAN_CHANNEL_ID, normalizeChannelConfig, validateHistoryRecord, parseHistoryRecord, sortHistory, normalizeGoogleOauthClientId} from './upload-history-model.mjs'

const HISTORY_KEY = 'holistic-house:youtube:phone-history:v1'
const CHANNEL_KEY = 'holistic-house:youtube:phone-channels:v1'
const OAUTH_KEY = 'holistic-house:youtube:phone-oauth:v1'
const TIMEOUT_MS = 5000
const CHANNEL_RU = {id:RUSSIAN_CHANNEL_ID, name:'Академия Древних Культур', handle:'@shamanic_academy'}

function historyError() {return new Error('history_unavailable')}
function validateRestUrl(value) {
  try {
    if (typeof value !== 'string' || /[\\\s]/.test(value)) return null
    const uri = new URL(value)
    if (uri.protocol !== 'https:' || uri.username || uri.password || uri.port || uri.search || uri.hash) return null
    return uri.toString().replace(/\/$/, '')
  } catch {return null}
}
function unpackPairs(raw) {
  if (Array.isArray(raw)) {
    if (raw.length % 2 !== 0) throw historyError()
    const result = []
    for (let index = 0; index < raw.length; index += 2) result.push([raw[index], raw[index+1]])
    return result
  }
  if (raw && typeof raw === 'object') return Object.entries(raw)
  throw historyError()
}
function parseChannel(raw) {
  if (typeof raw !== 'string' || raw.length > 300) return null
  try { return normalizeChannelConfig(JSON.parse(raw)) } catch { return null }
}
function makeStore(command) {
  return {
    async oauthConfig() {
      const stored = await command(['HGET',OAUTH_KEY,'web_client_id'])
      return normalizeGoogleOauthClientId(stored)
    },
    async configureOauthClientId(clientId) {
      const id = normalizeGoogleOauthClientId(clientId)
      if (!id) throw new Error('invalid_oauth_client')
      const accepted = await command(['HSET',OAUTH_KEY,'web_client_id',id])
      if (typeof accepted !== 'number' && !/^[01]$/.test(String(accepted))) throw historyError()
      const actual = await command(['HGET',OAUTH_KEY,'web_client_id'])
      if (actual !== id) throw historyError()
      return true
    },
    async channels() {
      const en = parseChannel(await command(['HGET',CHANNEL_KEY,'en']))
      return {ru:CHANNEL_RU,en}
    },
    async pairEnglish(input) {
      const pairing = normalizeChannelConfig(input)
      if (!pairing) throw new Error('invalid_channel')
      const result = await command(['HSETNX', CHANNEL_KEY, 'en', JSON.stringify(pairing)])
      if (result !== 1 && result !== '1' && result !== 0 && result !== '0') throw historyError()
      const saved = parseChannel(await command(['HGET',CHANNEL_KEY,'en']))
      if (!saved) throw historyError()
      if (saved.id !== pairing.id) throw new Error('channel_conflict')
      return saved
    },
    async list() {
      const raw = unpackPairs(await command(['HGETALL',HISTORY_KEY]))
      const items = []
      for (const [id,value] of raw) {
        const parsed = parseHistoryRecord(value)
        if (parsed?.videoId === id) items.push(parsed)
      }
      return sortHistory(items)
    },
    async save(input) {
      const channels = await this.channels()
      const expected = channels[input?.target]?.id
      if (!expected) throw new Error('invalid_channel')
      const entry = validateHistoryRecord(input,expected)
      const result = await command(['HSETNX',HISTORY_KEY,entry.videoId,JSON.stringify(entry)])
      if (result !== 1 && result !== '1' && result !== 0 && result !== '0') throw historyError()
      if (result === 1 || result === '1') return entry
      const old = parseHistoryRecord(await command(['HGET',HISTORY_KEY,entry.videoId]))
      if (!old || old.channelId !== entry.channelId || old.target !== entry.target) throw new Error('history_conflict')
      return old
    },
  }
}

/** In-memory fixture for tests, never a runtime fallback. */
export function createMemoryYoutubeHistoryStore() {
  const kv = new Map()
  return makeStore(async ([op,key,...args]) => {
    let data = kv.get(key)
    if (!data) {data = new Map(); kv.set(key,data)}
    if (op === 'HGET') return data.get(args[0]) ?? null
    if (op === 'HGETALL') return [...data].flat()
    if (op === 'HSET') {const wasNew = !data.has(args[0]);data.set(args[0],args[1]);return wasNew ? 1 : 0}
    if (op === 'HSETNX') {
      if (data.has(args[0])) return 0
      data.set(args[0],args[1])
      return 1
    }
    throw historyError()
  })
}

/** Shared server-only Redis transport for owner and practitioner upload ledgers. */
export function createYoutubeRedisCommand({environment=process.env,fetchFn=fetch} = {}) {
  if (typeof window !== 'undefined') return null
  const url = validateRestUrl(environment.PRESCRIPTIONS_KV_REST_API_URL)
  const token = environment.PRESCRIPTIONS_KV_REST_API_TOKEN
  if (!url || typeof token !== 'string' || !token.trim() || /[\r\n]/.test(token)) return null
  return async function command(args) {
    const abort = new AbortController()
    const timeout = setTimeout(() => abort.abort(), TIMEOUT_MS)
    try {
      const result = await fetchFn(url, {
        method:'POST',
        headers:{Authorization:'Bearer ' + token,'Content-Type':'application/json'},
        body:JSON.stringify(args),redirect:'error',credentials:'omit',cache:'no-store',signal:abort.signal,
      })
      if (!result.ok) throw historyError()
      const json = await result.json()
      if (!json || typeof json !== 'object' || json.error || !Object.hasOwn(json,'result')) throw historyError()
      return json.result
    } catch { throw historyError() }
    finally { clearTimeout(timeout) }
  }
}
export function createYoutubeHistoryStore(options = {}) {
  const command = createYoutubeRedisCommand(options)
  return command ? makeStore(command) : null
}
const instanceKey = Symbol.for('holistic-house.youtube.phone-history.v1')
export function getYoutubeHistoryStore() {
  if (typeof window !== 'undefined') return null
  if (globalThis[instanceKey]) return globalThis[instanceKey]
  const store = createYoutubeHistoryStore()
  if (store) globalThis[instanceKey] = store
  return store
}
