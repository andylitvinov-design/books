import 'server-only'
import { AppError } from '../assessments/contracts.js'

const PREFIX='hh:local-narration:v1:'
const QUEUE=PREFIX+'due'
const TTL_SECONDS=14*24*60*60
const TIMEOUT_MS=6500
const noStorage=()=>new AppError('LOCAL_NARRATION_STORAGE_UNAVAILABLE',503)
const safeKey=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)
const safeId=value=>typeof value==='string'&&/^[0-9a-f-]{36}$/i.test(value)
const keyFor=hash=>PREFIX+'item:'+hash
const byId=id=>PREFIX+'id:'+id

function safeRestEndpoint(value) {
  try {
    const u=new URL(value)
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||
      !u.hostname||u.pathname.length>200||/\s/.test(value))return null
    return u.href.replace(/\/$/,'')
  }catch{return null}
}
function parseJob(value) {
  if(typeof value!=='string'||value.length>18000)return null
  try {
    const row=JSON.parse(value)
    return row&&safeId(row.id)&&safeKey(row.queueKey)&&safeKey(row.version)&&
      ['ru','en'].includes(row.locale)&&Number.isInteger(row.part)&&row.part>=0&&row.part<8
      ?row:null
  }catch{return null}
}

const ENQUEUE_SCRIPT=`
if redis.call('EXISTS',KEYS[1])==1 then return redis.call('GET',KEYS[1]) end
redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2])
redis.call('SET',KEYS[3],KEYS[1],'EX',ARGV[2])
redis.call('ZADD',KEYS[2],ARGV[3],KEYS[1])
return ARGV[1]
`

const CLAIM_SCRIPT=`
for i=1,20 do
  local keys=redis.call('ZRANGEBYSCORE',KEYS[1],'-inf',ARGV[1],'LIMIT',0,1)
  if #keys==0 then return false end
  local k=keys[1]
  local raw=redis.call('GET',k)
  if not raw then redis.call('ZREM',KEYS[1],k)
  else
    local ok,job=pcall(cjson.decode,raw)
    if not ok then redis.call('ZREM',KEYS[1],k)
    elseif job.status=='leased' then
      if tonumber(job.attempts)>=3 then
        job.status='failed'; job.leaseId=cjson.null; job.leaseExpiresAt=cjson.null
        job.nextAttemptAt=cjson.null; job.objectKey=cjson.null
        job.encryptedPayload=cjson.null
        redis.call('SET',k,cjson.encode(job),'EX',ARGV[5])
        redis.call('ZREM',KEYS[1],k)
      else
        job.status='retry_wait'; job.leaseId=cjson.null; job.leaseExpiresAt=cjson.null
        job.objectKey=cjson.null
        local delay=60000*(2^(math.max(0,tonumber(job.attempts)-1)))
        job.nextAttemptAt=tonumber(ARGV[1])+math.min(1800000,delay)
        redis.call('SET',k,cjson.encode(job),'EX',ARGV[5])
        redis.call('ZADD',KEYS[1],job.nextAttemptAt,k)
      end
    elseif job.status=='queued' or job.status=='retry_wait' then
      if tonumber(job.attempts)>=3 then redis.call('ZREM',KEYS[1],k)
      else
        job.status='leased'; job.attempts=tonumber(job.attempts)+1
        job.leaseId=ARGV[2]; job.leaseExpiresAt=tonumber(ARGV[1])+tonumber(ARGV[3])
        job.nextAttemptAt=cjson.null; job.objectKey=ARGV[4]
        redis.call('SET',k,cjson.encode(job),'EX',ARGV[5])
        redis.call('ZADD',KEYS[1],job.leaseExpiresAt,k)
        return cjson.encode(job)
      end
    else redis.call('ZREM',KEYS[1],k) end
  end
end
return false
`

const COMPLETE_SCRIPT=`
local raw=redis.call('GET',KEYS[1])
if not raw then return false end
local ok,job=pcall(cjson.decode,raw)
if not ok or job.status~='leased' or job.leaseId~=ARGV[1] or
   tonumber(job.leaseExpiresAt)<=tonumber(ARGV[2]) then return false end
job.status='ready'; job.leaseId=cjson.null; job.leaseExpiresAt=cjson.null
job.nextAttemptAt=cjson.null
-- No private text or visitor session proof is required for future playback.
job.encryptedPayload=cjson.null
job.audio={mime=ARGV[3],bytes=tonumber(ARGV[4]),sha256=ARGV[5],
  assetPath=job.objectKey,completedAt=tonumber(ARGV[2])}
redis.call('SET',KEYS[1],cjson.encode(job),'EX',ARGV[6])
redis.call('ZREM',KEYS[2],KEYS[1])
return cjson.encode(job)
`

const FAILURE_SCRIPT=`
local raw=redis.call('GET',KEYS[1])
if not raw then return false end
local ok,job=pcall(cjson.decode,raw)
if not ok or job.status~='leased' or job.leaseId~=ARGV[1] or
   tonumber(job.leaseExpiresAt)<=tonumber(ARGV[2]) then return false end
job.leaseId=cjson.null; job.leaseExpiresAt=cjson.null; job.objectKey=cjson.null
if tonumber(job.attempts)>=3 then
  job.status='failed'; job.nextAttemptAt=cjson.null
  job.encryptedPayload=cjson.null
  redis.call('ZREM',KEYS[2],KEYS[1])
else
  job.status='retry_wait'
  local delay=60000*(2^(math.max(0,tonumber(job.attempts)-1)))
  job.nextAttemptAt=tonumber(ARGV[2])+math.min(1800000,delay)
  redis.call('ZADD',KEYS[2],job.nextAttemptAt,KEYS[1])
end
redis.call('SET',KEYS[1],cjson.encode(job),'EX',ARGV[3])
return cjson.encode(job)
`

// Permanently invalid queued access is removed atomically rather than retried.
// Subsequent *independently authorized* readers may request a fresh job.
// Only a worker owning the exact current lease may cancel it.
const CANCEL_STALE_SCRIPT=`
local raw=redis.call('GET',KEYS[1])
if not raw then return 0 end
local ok,job=pcall(cjson.decode,raw)
if not ok or job.status~='leased' or job.leaseId~=ARGV[1] then return 0 end
redis.call('ZREM',KEYS[2],KEYS[1])
redis.call('DEL',KEYS[3])
redis.call('DEL',KEYS[1])
return 1
`

export function makeLocalNarrationStore(command) {
  return {
    async get(queueKey) {
      if(!safeKey(queueKey))throw noStorage()
      return parseJob(await command(['GET',keyFor(queueKey)]))
    },
    async ensure(job) {
      if(!safeKey(job?.queueKey)||!safeId(job?.id)||
        typeof job?.encryptedPayload!=='string'||job.encryptedPayload.length>12000)throw noStorage()
      const raw=await command(['EVAL',ENQUEUE_SCRIPT,'3',
        keyFor(job.queueKey),QUEUE,byId(job.id),
        JSON.stringify(job),String(TTL_SECONDS),String(job.createdAt)])
      const existing=parseJob(raw)
      if(!existing||existing.queueKey!==job.queueKey)throw noStorage()
      return existing
    },
    async claim({now,leaseId,leaseMs,objectKey}) {
      if(!Number.isSafeInteger(now)||!safeId(leaseId)||
        !Number.isSafeInteger(leaseMs)||leaseMs<10000||leaseMs>600000||
        typeof objectKey!=='string'||!/^narration\/[0-9a-f-]{36}\/[a-f0-9]{64}\.mp3$/.test(objectKey))
        throw noStorage()
      const raw=await command(['EVAL',CLAIM_SCRIPT,'1',QUEUE,
        String(now),leaseId,String(leaseMs),objectKey,String(TTL_SECONDS)])
      if(raw===null||raw===false)return null
      const job=parseJob(raw)
      if(!job||job.status!=='leased'||job.leaseId!==leaseId)throw noStorage()
      return job
    },
    async byId(id) {
      if(!safeId(id))throw noStorage()
      const key=await command(['GET',byId(id)])
      if(typeof key!=='string'||!key.startsWith(PREFIX+'item:')||
        !safeKey(key.slice((PREFIX+'item:').length)))return null
      const row=parseJob(await command(['GET',key]))
      return row?.id===id?row:null
    },
    async complete({job,leaseId,now,mime,bytes,sha256}) {
      if(!safeKey(job?.queueKey)||!safeId(leaseId)||!Number.isSafeInteger(now)||
        mime!=='audio/mpeg'||!Number.isSafeInteger(bytes)||bytes<128||bytes>3000000||
        !safeKey(sha256))throw noStorage()
      const raw=await command(['EVAL',COMPLETE_SCRIPT,'2',
        keyFor(job.queueKey),QUEUE,leaseId,String(now),mime,String(bytes),sha256,String(TTL_SECONDS)])
      return raw?parseJob(raw):null
    },
    async fail({job,leaseId,now}) {
      if(!safeKey(job?.queueKey)||!safeId(leaseId)||!Number.isSafeInteger(now))throw noStorage()
      const raw=await command(['EVAL',FAILURE_SCRIPT,'2',
        keyFor(job.queueKey),QUEUE,leaseId,String(now),String(TTL_SECONDS)])
      return raw?parseJob(raw):null
    },
    async cancelStale({job,leaseId}) {
      if(!safeKey(job?.queueKey)||!safeId(job?.id)||!safeId(leaseId))throw noStorage()
      const result=await command(['EVAL',CANCEL_STALE_SCRIPT,'3',
        keyFor(job.queueKey),QUEUE,byId(job.id),leaseId])
      return result===1
    }
  }
}
export function createLocalNarrationStore(env=process.env,fetchFn=fetch) {
  const url=safeRestEndpoint(env.PRESCRIPTIONS_KV_REST_API_URL||'')
  const token=env.PRESCRIPTIONS_KV_REST_API_TOKEN
  if(!url||typeof token!=='string'||token.length<10)return null
  async function command(args) {
    const abort=new AbortController()
    const timeout=setTimeout(()=>abort.abort(),TIMEOUT_MS)
    try {
      const response=await fetchFn(url,{method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify(args),redirect:'error',cache:'no-store',signal:abort.signal})
      if(!response.ok)throw noStorage()
      const result=await response.json()
      if(!result||typeof result!=='object'||result.error||
        !Object.hasOwn(result,'result'))throw noStorage()
      return result.result
    }catch{throw noStorage()}finally{clearTimeout(timeout)}
  }
  return makeLocalNarrationStore(command)
}
