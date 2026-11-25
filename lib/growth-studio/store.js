// Dedicated editorial Redis namespace: never CRM contacts, reports or client data.
import {randomUUID} from 'node:crypto'
import {GrowthStudioError, isSavedGrowthPost, nextGrowthPost, orderGrowthPosts} from './model.mjs'

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
const SOURCE_BATCH_SCRIPT = [
  "local old = redis.call('HGET',KEYS[1],ARGV[1])",
  "if not old then return -3 end",
  "local ok, original = pcall(cjson.decode, old)",
  "if not ok or type(original) ~= 'table' or original.id ~= ARGV[1] or original.revision ~= tonumber(ARGV[2]) then return -3 end",
  "if original.status ~= 'approved' and original.status ~= 'planned_manual' and original.status ~= 'published' then return -3 end",
  "local count = tonumber(ARGV[3])",
  "local new = (#ARGV - 3) / 2",
  "if new < 1 or new > 20 then return -2 end",
  "if redis.call('HLEN',KEYS[1]) + new > count then return -1 end",
  "for i = 4, #ARGV, 2 do",
  "  if redis.call('HEXISTS',KEYS[1],ARGV[i]) == 1 then return 0 end",
  "end",
  "for i = 4, #ARGV, 2 do redis.call('HSET',KEYS[1],ARGV[i],ARGV[i+1]) end",
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

// A short-lived isolated HASH exercises the same EVAL/CAS path as a real
// editor Save, never the real editorial key or any private record.
// The first creation and 30-second expiry are atomic, even on function exit.
const PROBE_HASH_INIT_SCRIPT = [
  "if redis.call('EXISTS',KEYS[1]) ~= 0 then return 0 end",
  "redis.call('HSET',KEYS[1],ARGV[1],ARGV[2])",
  "redis.call('EXPIRE',KEYS[1],30)",
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
// A manual owner-only, three-command read/write/delete smoke test in a separate
// random, 30-second TTL namespace. It never reads or mutates editorial drafts,
// client data or other Redis keys and is NOT a substitute for owner UI save QA.
const HEALTH_PREFIX = 'holistic-house:growth-studio:healthcheck:v1:'
function makeStore(command) {
  return {
    async verifyEditorialRoundTrip() {
      // Completely synthetic, unlisted, unapproved public-only copy.
      // The diagnostic never touches the main editorial hash or posts.
      const key = HEALTH_PREFIX + randomUUID()
      const id = randomUUID()
      const fields = {
        brand:'holistic_house',channel:'manual',locale:'en',
        title:'Growth Studio isolated connectivity test',
        caption:'Diagnostic draft, never published',
        sourceUrl:'',campaign:'',scheduledAt:'',mediaUrl:'',mediaAlt:'',
      }
      const draft = nextGrowthPost({action:'save',id,fields})
      const approved = nextGrowthPost({action:'approve',current:draft})
      let created = false
      let removed = false
      try {
        const init = await command(['EVAL',PROBE_HASH_INIT_SCRIPT,1,key,id,serialize(draft,0)])
        if (init !== 1 && init !== '1') throw failure()
        created = true
        const entries = unpack(await command(['HGETALL',key]))
        if (entries.length !== 1 || entries[0][0] !== id ||
            parseRecord(entries[0][1],id).revision !== 1) throw failure()
        const updated = await command(['EVAL',SCRIPT,1,key,id,1,serialize(approved,1),1])
        if (updated !== 1 && updated !== '1') throw failure()
        const saved = parseRecord(await command(['HGET',key,id]),id)
        if (saved.revision !== 2 || saved.status !== 'approved' ||
            saved.caption !== approved.caption) throw failure()
        // An outdated optimistic-CAS writer must not replace revision 2.
        const stale = await command(['EVAL',SCRIPT,1,key,id,1,serialize(approved,1),1])
        if (stale !== 0 && stale !== '0') throw failure()
        const deleted = await command(['DEL',key])
        if (deleted !== 1 && deleted !== '1') throw failure()
        removed = true
        return true
      } catch {
        throw failure()
      } finally {
        if (created && !removed) {
          try { await command(['DEL',key]) } catch { /* short expiry fallback */ }
        }
      }
    },
    async verifyPersistence() {
      const key = HEALTH_PREFIX + randomUUID()
      const expected = randomUUID()
      let written = false
      let removed = false
      try {
        const response = await command(['SET',key,expected,'EX',30,'NX'])
        if (response !== 'OK') throw failure()
        written = true
        if (await command(['GET',key]) !== expected) throw failure()
        const deleted = await command(['DEL',key])
        if (deleted !== 1 && deleted !== '1') throw failure()
        removed = true
        return true
      } catch {
        throw failure()
      } finally {
        // A failed read still gets best-effort cleanup. TTL also guarantees
        // eventual expiry after an unexpected function termination.
        if (written && !removed) {
          try { await command(['DEL',key]) } catch { /* TTL cleanup fallback */ }
        }
      }
    },
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
    async batchCreateFromSource(posts,sourceId,expectedRevision) {
      if (typeof sourceId!=='string'||!/^[a-f0-9-]{36}$/i.test(sourceId)||
          !Number.isSafeInteger(expectedRevision)||expectedRevision<1||
          !Array.isArray(posts)||!posts.length||posts.length>MAX_BATCH||
          posts.some(item=>item?.id===sourceId)||
          new Set(posts.map(item=>item?.id)).size!==posts.length)
        throw new GrowthStudioError('invalid_post')
      const args=posts.flatMap(item=>[item.id,serialize(item,0)])
      const result=await command(['EVAL',SOURCE_BATCH_SCRIPT,1,KEY,
        sourceId,expectedRevision,MAX_RECORDS,...args])
      if (result === 0 || result === '0' || result === -3 || result === '-3')
        throw new GrowthStudioError('conflict')
      if (result === -1 || result === '-1')throw new GrowthStudioError('capacity_reached')
      if (result !== 1 && result !== '1')throw failure()
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
      if (args[0] === SOURCE_BATCH_SCRIPT) {
        const sourceId=args[3],expected=args[4],limit=args[5],pairs=args.slice(6)
        const current=values.get(sourceId)
        let item=null
        try {item=current?JSON.parse(current):null}catch {}
        if(!item||item.id!==sourceId||item.revision!==expected||
           !['approved','planned_manual','published'].includes(item.status))return -3
        if(pairs.length<2||pairs.length%2||pairs.length/2>MAX_BATCH)return -2
        if(values.size+pairs.length/2>limit)return -1
        for(let i=0;i<pairs.length;i+=2)if(values.has(pairs[i]))return 0
        for(let i=0;i<pairs.length;i+=2)values.set(pairs[i],pairs[i+1])
        return 1
      }
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
