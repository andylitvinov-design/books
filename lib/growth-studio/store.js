// Dedicated editorial Redis namespace: never CRM contacts, reports or client data.
import {GrowthStudioError, isSavedGrowthPost, orderGrowthPosts} from './model.mjs'

const KEY = 'holistic-house:growth-studio:editorial:v1'
const MAX_RECORDS = 1200
const MAX_SERIALIZED = 6500
const TIMEOUT_MS = 5000
const MAX_BATCH = 20
const BATCH_SCRIPT = [
  "local count = tonumber(ARGV[1])",
  "local new = (#ARGV - 1) / 2",
  "if new < 1 or new > 20 then return -2 end",
  "if redis.call('HLEN',KEYS[1]) + new > count then return -1 end",
  "for i = 2, #ARGV, 2 do",
  "  if redis.call('HEXISTS',KEYS[1],ARGV[i]) == 1 then return 0 end",
  "end",
  "for i = 2, #ARGV, 2 do redis.call('HSET',KEYS[1],ARGV[i],ARGV[i+1]) end",
  "return 1",
].join('\n')
const SCRIPT = [
  "local old = redis.call('HGET', KEYS[1], ARGV[1])",
  "local expected = tonumber(ARGV[2])",
  "if old then",
  "  local ok, decoded = pcall(cjson.decode, old)",
  "  if not ok or type(decoded) ~= 'table' or decoded.id ~= ARGV[1] or decoded.revision ~= expected then return 0 end",
  "elseif expected ~= 0 then return 0 end",
  "if not old and redis.call('HLEN', KEYS[1]) >= tonumber(ARGV[4]) then return -1 end",
  "redis.call('HSET', KEYS[1], ARGV[1], ARGV[3])",
  "return 1",
].join('\n')

const failure = () => new GrowthStudioError('storage_unavailable')
function serialize(value, expectedRevision) {
  if (!isSavedGrowthPost(value) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 ||
      value.revision !== expectedRevision + 1) throw new GrowthStudioError('invalid_post')
  const data = JSON.stringify(value)
  if (data.length > MAX_SERIALIZED) throw new GrowthStudioError('invalid_post')
  return data
}
function parseRecord(raw, id) {
  if (typeof raw !== 'string' || raw.length > MAX_SERIALIZED) throw failure()
  let data
  try {data = JSON.parse(raw)} catch {throw failure()}
  if (!isSavedGrowthPost(data) || data.id !== id) throw failure()
  return data
}
function unpack(raw) {
  if (Array.isArray(raw) && raw.length % 2 === 0) {
    const list = []
    for (let i = 0; i < raw.length; i += 2) list.push([raw[i], raw[i+1]])
    return list
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return Object.entries(raw)
  throw failure()
}
function makeStore(command) {
  return {
    async list() {
      const pairs = unpack(await command(['HGETALL', KEY]))
      if (pairs.length > MAX_RECORDS) throw failure()
      return orderGrowthPosts(pairs.map(([key, raw]) => parseRecord(raw, key)))
    },
    async get(id) {
      if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw new GrowthStudioError('invalid_post')
      const raw = await command(['HGET',KEY,id])
      return raw === null ? null : parseRecord(raw,id)
    },
    async batchCreate(posts) {
      if (!Array.isArray(posts) || !posts.length || posts.length > MAX_BATCH ||
          new Set(posts.map(item=>item?.id)).size !== posts.length) throw new GrowthStudioError('invalid_post')
      const args=posts.flatMap(item=>[item.id,serialize(item,0)])
      const result=await command(['EVAL',BATCH_SCRIPT,1,KEY,MAX_RECORDS,...args])
      if (result === 0 || result === '0') throw new GrowthStudioError('conflict')
      if (result === -1 || result === '-1') throw new GrowthStudioError('capacity_reached')
      if (result !== 1 && result !== '1') throw failure()
      return posts
    },
    async save(post,expectedRevision) {
      const serialized = serialize(post,expectedRevision)
      const result = await command(['EVAL',SCRIPT,1,KEY,post.id,expectedRevision,serialized,MAX_RECORDS])
      if (result === 0 || result === '0') throw new GrowthStudioError('conflict')
      if (result === -1 || result === '-1') throw new GrowthStudioError('capacity_reached')
      if (result !== 1 && result !== '1') throw failure()
      return post
    },
  }
}
export function createMemoryGrowthStudioStore() {
  const values = new Map()
  return makeStore(async ([name,...args]) => {
    if (name === 'HGETALL') return [...values].flat()
    if (name === 'HGET') return values.get(args[1]) ?? null
    if (name === 'EVAL') {
      if (args[0] === BATCH_SCRIPT) {
        const limit=args[3], pairs=args.slice(4)
        if (pairs.length<2 || pairs.length%2 || pairs.length/2>MAX_BATCH) throw failure()
        if (values.size+pairs.length/2>limit) return -1
        for(let i=0;i<pairs.length;i+=2)if(values.has(pairs[i]))return 0
        for(let i=0;i<pairs.length;i+=2)values.set(pairs[i],pairs[i+1])
        return 1
      }
      const [, , , id, expected, raw, limit] = args
      const old = values.get(id)
      if (old && JSON.parse(old).revision !== expected) return 0
      if (!old && expected !== 0) return 0
      if (!old && values.size >= limit) return -1
      values.set(id,raw)
      return 1
    }
    throw failure()
  })
}
function redisUrl(value) {
  if (typeof value !== 'string' || /[\s\\]/.test(value)) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port &&
      !parsed.search && !parsed.hash ? parsed.toString().replace(/\/$/, '') : null
  } catch {return null}
}
export function createGrowthStudioStore({environment=process.env,fetchFn=fetch}={}) {
  if (typeof window !== 'undefined') return null
  const url = redisUrl(environment.PRESCRIPTIONS_KV_REST_API_URL)
  const token = environment.PRESCRIPTIONS_KV_REST_API_TOKEN
  if (!url || typeof token !== 'string' || !token.trim() || /[\r\n]/.test(token)) return null
  async function command(args) {
    const abort = new AbortController()
    const timeout = setTimeout(() => abort.abort(), TIMEOUT_MS)
    try {
      const response = await fetchFn(url,{
        method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify(args),cache:'no-store',credentials:'omit',redirect:'error',signal:abort.signal,
      })
      if (!response.ok) throw failure()
      const data = await response.json()
      if (!data || typeof data !== 'object' || data.error || !Object.hasOwn(data,'result')) throw failure()
      return data.result
    } catch {throw failure()}
    finally {clearTimeout(timeout)}
  }
  return makeStore(command)
}
const symbol = Symbol.for('holistic-house.growth-studio.editorial-store.v1')
export function getGrowthStudioStore() {
  if (typeof window !== 'undefined') return null
  if (globalThis[symbol]) return globalThis[symbol]
  const store = createGrowthStudioStore()
  if (store) globalThis[symbol] = store
  return store
}
