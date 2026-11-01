// Durable, Redis-backed SIMULATION queue for owner-approved public Growth Studio drafts.
// Deliberately cannot call Telegram, Meta, YouTube or any other provider.
// The feature is OFF unless the owner enables HH_GROWTH_QUEUE_DRY_RUN_ENABLED=true.
import {createHash, randomUUID} from 'node:crypto'
import {GrowthStudioError,isSavedGrowthPost} from './model.mjs'

export const GROWTH_DRY_RUN_FLAG='HH_GROWTH_QUEUE_DRY_RUN_ENABLED'
const SOURCE_KEY='holistic-house:growth-studio:editorial:v1'
const JOBS_KEY='holistic-house:growth-studio:dry-run-queue:v1'
const DUE_KEY='holistic-house:growth-studio:dry-run-due:v1'
const MAX_JOBS=1200
const MAX_BATCH=10
const TIMEOUT_MS=5000
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const fail=code=>new GrowthStudioError(code)
const iso=value=>typeof value==='string'&&ISO.test(value)&&
  Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value
const hex=value=>createHash('sha256').update(value).digest('hex')
const uuidFromHash=value=>{
  const h=hex(value)
  return h.slice(0,8)+'-'+h.slice(8,12)+'-5'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32)
}
const comparable=post=>JSON.stringify([
  post.id,post.revision,post.brand,post.channel,post.locale,post.title,post.caption,
  post.sourceUrl,post.campaign,post.mediaUrl,post.mediaAlt,
])

export function createDryRunJob(source,{expectedRevision,scheduledAt,occurrenceId='single',now=new Date()}={}) {
  if(!isSavedGrowthPost(source)||!['approved','planned_manual'].includes(source.status)||
     source.revision!==expectedRevision||!Number.isSafeInteger(expectedRevision)||
     expectedRevision<1||!iso(scheduledAt)||typeof occurrenceId!=='string'||
     !/^[a-z0-9][a-z0-9_-]{0,39}$/i.test(occurrenceId)||
     !(now instanceof Date)||!Number.isFinite(now.getTime()))
    throw fail('invalid_queue_request')
  const when=Date.parse(scheduledAt)
  if(when<now.getTime()+60_000||when>now.getTime()+90*86_400_000)
    throw fail('invalid_queue_time')
  const payloadHash=hex(comparable(source))
  const id=uuidFromHash(source.id+'|'+expectedRevision+'|'+scheduledAt+'|'+occurrenceId)
  return {
    id,postId:source.id,postRevision:source.revision,brand:source.brand,
    channel:source.channel,locale:source.locale,scheduledAt,occurrenceId,payloadHash,
    deliveryMode:'dry_run_only',state:'queued',revision:1,attempts:0,
    createdAt:now.toISOString(),updatedAt:now.toISOString(),
  }
}
export function isValidDryRunJob(job) {
  return Boolean(job&&typeof job==='object'&&!Array.isArray(job)&&
    UUID.test(job.id)&&UUID.test(job.postId)&&
    Number.isSafeInteger(job.postRevision)&&job.postRevision>=1&&
    typeof job.brand==='string'&&typeof job.channel==='string'&&
    ['en','ru','es'].includes(job.locale)&&iso(job.scheduledAt)&&
    /^[a-z0-9][a-z0-9_-]{0,39}$/i.test(job.occurrenceId)&&
    /^[a-f0-9]{64}$/.test(job.payloadHash)&&
    job.deliveryMode==='dry_run_only'&&
    ['queued','claimed_dry_run','simulated','cancelled','needs_review'].includes(job.state)&&
    Number.isSafeInteger(job.revision)&&job.revision>=1&&
    Number.isSafeInteger(job.attempts)&&job.attempts>=0&&
    iso(job.createdAt)&&iso(job.updatedAt))
}
function validated(job){if(!isValidDryRunJob(job))throw fail('storage_unavailable');return job}
const ENQUEUE_SCRIPT=[
  "local raw = redis.call('HGET', KEYS[1], ARGV[1])",
  "if not raw then return -3 end",
  "local ok, source = pcall(cjson.decode, raw)",
  "if not ok or type(source) ~= 'table' or source.id ~= ARGV[1] or source.revision ~= tonumber(ARGV[2]) then return -3 end",
  "if source.status ~= 'approved' and source.status ~= 'planned_manual' then return -3 end",
  "if redis.call('HEXISTS', KEYS[2], ARGV[3]) == 1 then return 2 end",
  "if redis.call('HLEN', KEYS[2]) >= tonumber(ARGV[6]) then return -1 end",
  "redis.call('HSET', KEYS[2], ARGV[3], ARGV[4])",
  "redis.call('ZADD', KEYS[3], tonumber(ARGV[5]), ARGV[3])",
  "return 1",
].join('\n')
const CLAIM_SCRIPT=[
  "local ids = redis.call('ZRANGEBYSCORE', KEYS[3], '-inf', ARGV[1], 'LIMIT', 0, 20)",
  "for _, id in ipairs(ids) do",
  "  local raw = redis.call('HGET', KEYS[2], id)",
  "  if not raw then redis.call('ZREM', KEYS[3], id)",
  "  else",
  "    local ok, job = pcall(cjson.decode, raw)",
  "    if not ok or type(job) ~= 'table' then redis.call('ZREM',KEYS[3],id)",
  "    elseif job.state == 'queued' or (job.state == 'claimed_dry_run' and tonumber(job.leaseUntilMs or 0) <= tonumber(ARGV[1])) then",
  "      local sourceRaw = redis.call('HGET',KEYS[1],job.postId)",
  "      local good, source = pcall(cjson.decode,sourceRaw or '')",
  "      if not good or type(source) ~= 'table' or source.revision ~= job.postRevision or (source.status ~= 'approved' and source.status ~= 'planned_manual') then",
  "        job.state='needs_review'; job.revision=job.revision+1; job.updatedAt=ARGV[4]; job.leaseToken=nil; job.leaseUntilMs=nil",
  "        redis.call('HSET',KEYS[2],id,cjson.encode(job)); redis.call('ZREM',KEYS[3],id)",
  "      elseif tonumber(job.attempts or 0) >= 10 then",
  "        job.state='needs_review'; job.revision=job.revision+1; job.updatedAt=ARGV[4]; job.leaseToken=nil; job.leaseUntilMs=nil",
  "        redis.call('HSET',KEYS[2],id,cjson.encode(job)); redis.call('ZREM',KEYS[3],id)",
  "      else",
  "        job.state='claimed_dry_run'; job.revision=job.revision+1; job.attempts=job.attempts+1",
  "        job.leaseToken=ARGV[2]; job.leaseUntilMs=tonumber(ARGV[1])+60000; job.updatedAt=ARGV[4]",
  "        redis.call('HSET',KEYS[2],id,cjson.encode(job)); redis.call('ZADD',KEYS[3],job.leaseUntilMs,id)",
  "        return cjson.encode(job)",
  "      end",
  "    else redis.call('ZREM',KEYS[3],id) end",
  "  end",
  "end",
  "return nil",
].join('\n')
const FINISH_SCRIPT=[
  "local raw=redis.call('HGET',KEYS[1],ARGV[1])",
  "if not raw then return -3 end",
  "local ok,job=pcall(cjson.decode,raw)",
  "if not ok or type(job)~='table' or job.state~='claimed_dry_run' or job.leaseToken~=ARGV[2] then return 0 end",
  "job.state='simulated'; job.revision=job.revision+1; job.updatedAt=ARGV[3]",
  "job.simulatedAt=ARGV[3]; job.leaseToken=nil; job.leaseUntilMs=nil",
  "redis.call('HSET',KEYS[1],ARGV[1],cjson.encode(job)); redis.call('ZREM',KEYS[2],ARGV[1])",
  "return cjson.encode(job)",
].join('\n')
const CANCEL_SCRIPT=[
  "local raw=redis.call('HGET',KEYS[1],ARGV[1])",
  "if not raw then return -3 end",
  "local ok,job=pcall(cjson.decode,raw)",
  "if not ok or type(job)~='table' or job.revision~=tonumber(ARGV[2]) or job.state~='queued' then return 0 end",
  "job.state='cancelled';job.revision=job.revision+1;job.updatedAt=ARGV[3]",
  "redis.call('HSET',KEYS[1],ARGV[1],cjson.encode(job));redis.call('ZREM',KEYS[2],ARGV[1])",
  "return cjson.encode(job)",
].join('\n')
const readJob=value=>{
  if(typeof value!=='string'||value.length>4000)throw fail('storage_unavailable')
  try{return validated(JSON.parse(value))}catch{throw fail('storage_unavailable')}
}
function unpack(raw){
  if(Array.isArray(raw)&&raw.length%2===0){
    const out=[];for(let i=0;i<raw.length;i+=2)out.push([raw[i],raw[i+1]]);return out
  }
  if(raw&&typeof raw==='object'&&!Array.isArray(raw))return Object.entries(raw)
  throw fail('storage_unavailable')
}
function makeStore(command){
  return {
    async enqueue(job){
      validated(job)
      if(job.state!=='queued'||job.revision!==1)throw fail('invalid_queue_request')
      const v=await command(['EVAL',ENQUEUE_SCRIPT,3,SOURCE_KEY,JOBS_KEY,DUE_KEY,
        job.postId,job.postRevision,job.id,JSON.stringify(job),Date.parse(job.scheduledAt),MAX_JOBS])
      if(v===-3||v==='-3')throw fail('source_changed')
      if(v===-1||v==='-1')throw fail('capacity_reached')
      if(v===2||v==='2'){
        const existing=await this.get(job.id)
        if(!existing||existing.postId!==job.postId||existing.payloadHash!==job.payloadHash||
          existing.scheduledAt!==job.scheduledAt||existing.postRevision!==job.postRevision)
          throw fail('conflict')
        return {job:existing,reused:true}
      }
      if(v!==1&&v!=='1')throw fail('storage_unavailable')
      return {job,reused:false}
    },
    async get(id){
      if(typeof id!=='string'||!UUID.test(id))throw fail('invalid_queue_request')
      const raw=await command(['HGET',JOBS_KEY,id])
      return raw==null?null:readJob(raw)
    },
    async list(){
      const items=unpack(await command(['HGETALL',JOBS_KEY]))
      if(items.length>MAX_JOBS)throw fail('storage_unavailable')
      return items.map(([key,raw])=>{const job=readJob(raw);if(job.id!==key)throw fail('storage_unavailable');return job})
        .sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)||a.id.localeCompare(b.id))
    },
    async claimDue(now=new Date()){
      if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw fail('invalid_queue_time')
      const token=randomUUID(),value=await command(['EVAL',CLAIM_SCRIPT,3,
        SOURCE_KEY,JOBS_KEY,DUE_KEY,now.getTime(),token,MAX_JOBS,now.toISOString()])
      return value==null?null:readJob(value)
    },
    async finish(id,token,now=new Date()){
      if(typeof id!=='string'||!UUID.test(id)||typeof token!=='string'||!UUID.test(token)||
        !(now instanceof Date)||!Number.isFinite(now.getTime()))throw fail('invalid_queue_request')
      const raw=await command(['EVAL',FINISH_SCRIPT,2,JOBS_KEY,DUE_KEY,id,token,now.toISOString()])
      if(raw===-3||raw==='-3')throw fail('not_found')
      if(!raw||raw==='0')throw fail('conflict')
      return readJob(raw)
    },
    async cancel(id,expectedRevision,now=new Date()){
      if(typeof id!=='string'||!UUID.test(id)||!Number.isSafeInteger(expectedRevision)||expectedRevision<1||
         !(now instanceof Date)||!Number.isFinite(now.getTime()))throw fail('invalid_queue_request')
      const raw=await command(['EVAL',CANCEL_SCRIPT,2,JOBS_KEY,DUE_KEY,id,expectedRevision,now.toISOString()])
      if(raw===-3||raw==='-3')throw fail('not_found')
      if(!raw||raw==='0')throw fail('conflict')
      return readJob(raw)
    },
  }
}
function redisUrl(value){
  if(typeof value!=='string'||/[\s\\]/.test(value))return null
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
    !u.search&&!u.hash?u.toString().replace(/\/$/,''):null}catch{return null}
}
export function createGrowthDryRunQueueStore({environment=process.env,fetchFn=fetch}={}){
  if(typeof window!=='undefined')return null
  const url=redisUrl(environment.PRESCRIPTIONS_KV_REST_API_URL),token=environment.PRESCRIPTIONS_KV_REST_API_TOKEN
  if(!url||typeof token!=='string'||!token.trim()||/[\r\n]/.test(token))return null
  return makeStore(async args=>{
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),TIMEOUT_MS)
    try{
      const response=await fetchFn(url,{method:'POST',headers:{
        Authorization:'Bearer '+token,'Content-Type':'application/json',
      },body:JSON.stringify(args),cache:'no-store',credentials:'omit',redirect:'error',signal:abort.signal})
      if(!response.ok)throw fail('storage_unavailable')
      const data=await response.json()
      if(!data||typeof data!=='object'||data.error||!Object.hasOwn(data,'result'))
        throw fail('storage_unavailable')
      return data.result
    }catch{throw fail('storage_unavailable')}
    finally{clearTimeout(timer)}
  })
}
// No external provider calls, even when env flag is true. This only records simulation.
export async function simulateDueDryRunJobs(store,{now=new Date(),limit=MAX_BATCH}={}){
  if(!store||!(now instanceof Date)||!Number.isFinite(now.getTime())||
     !Number.isSafeInteger(limit)||limit<1||limit>MAX_BATCH)throw fail('invalid_queue_request')
  const finished=[]
  for(let i=0;i<limit;i++){
    const claimed=await store.claimDue(now)
    if(!claimed)break
    if(claimed.state!=='claimed_dry_run'||typeof claimed.leaseToken!=='string')
      throw fail('storage_unavailable')
    finished.push(await store.finish(claimed.id,claimed.leaseToken,now))
  }
  return finished
}
// Synthetic deterministic adapter for unit tests. Never represents provider success.
export function createMemoryGrowthDryRunQueueStore({getSource}={}){
  if(typeof getSource!=='function')throw fail('invalid_queue_request')
  const jobs=new Map()
  return {
    async enqueue(job){
      validated(job)
      const original=await getSource(job.postId)
      if(!original||!isSavedGrowthPost(original)||original.revision!==job.postRevision||
         !['approved','planned_manual'].includes(original.status))throw fail('source_changed')
      const current=jobs.get(job.id)
      if(current){
        if(current.payloadHash!==job.payloadHash||current.scheduledAt!==job.scheduledAt)throw fail('conflict')
        return {job:{...current},reused:true}
      }
      if(jobs.size>=MAX_JOBS)throw fail('capacity_reached')
      jobs.set(job.id,{...job});return {job:{...job},reused:false}
    },
    async get(id){return jobs.has(id)?{...jobs.get(id)}:null},
    async list(){return [...jobs.values()].sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)).map(x=>({...x}))},
    async claimDue(now=new Date()){
      const candidate=[...jobs.values()].filter(j=>(j.state==='queued'&&Date.parse(j.scheduledAt)<=now.getTime())||
        (j.state==='claimed_dry_run'&&j.leaseUntilMs<=now.getTime()))
        .sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt))[0]
      if(!candidate)return null
      const source=await getSource(candidate.postId)
      if(!source||source.revision!==candidate.postRevision||!['approved','planned_manual'].includes(source.status)){
        Object.assign(candidate,{state:'needs_review',revision:candidate.revision+1,updatedAt:now.toISOString()})
        return null
      }
      if(candidate.attempts>=10){
        Object.assign(candidate,{state:'needs_review',revision:candidate.revision+1,updatedAt:now.toISOString()})
        return null
      }
      Object.assign(candidate,{state:'claimed_dry_run',revision:candidate.revision+1,
        attempts:candidate.attempts+1,leaseToken:randomUUID(),leaseUntilMs:now.getTime()+60000,
        updatedAt:now.toISOString()})
      return {...candidate}
    },
    async finish(id,token,now=new Date()){
      const j=jobs.get(id)
      if(!j)throw fail('not_found')
      if(j.state!=='claimed_dry_run'||j.leaseToken!==token)throw fail('conflict')
      Object.assign(j,{state:'simulated',revision:j.revision+1,updatedAt:now.toISOString(),simulatedAt:now.toISOString()})
      delete j.leaseToken;delete j.leaseUntilMs
      return {...j}
    },
    async cancel(id,revision,now=new Date()){
      const j=jobs.get(id)
      if(!j)throw fail('not_found')
      if(j.state!=='queued'||j.revision!==revision)throw fail('conflict')
      Object.assign(j,{state:'cancelled',revision:j.revision+1,updatedAt:now.toISOString()})
      return {...j}
    },
  }
}
