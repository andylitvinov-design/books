import {createYoutubeRedisCommand} from './upload-history-store.js'
import {practitionerYoutubeAccountId,practitionerYoutubeSlot,practitionerYoutubeChannel,practitionerYoutubeUpload,practitionerYoutubeParseChannel,practitionerYoutubeParseUpload,PRACTITIONER_YOUTUBE_NAMESPACE,PRACTITIONER_YOUTUBE_HISTORY_LIMIT} from './practitioner-upload-model.mjs'

const key=(actor,type)=>PRACTITIONER_YOUTUBE_NAMESPACE+':'+practitionerYoutubeAccountId(actor)+':'+type
const assertMutationResult=value=>{if(![0,1,'0','1'].includes(value))throw new Error('history_unavailable')}
function pairs(value){
  if(Array.isArray(value)){
    if(value.length%2)throw new Error('history_unavailable')
    const items=[]
    for(let i=0;i<value.length;i+=2)items.push([value[i],value[i+1]])
    return items
  }
  if(value&&typeof value==='object')return Object.entries(value)
  throw new Error('history_unavailable')
}
export function createPractitionerYoutubeStore(command){
  if(typeof command!=='function')return null
  return {
    async channels(accountId){
      const base=key(accountId,'channels')
      const [a,b]=await Promise.all([command(['HGET',base,'1']),command(['HGET',base,'2'])])
      return {'1':practitionerYoutubeParseChannel(a),'2':practitionerYoutubeParseChannel(b)}
    },
    async pair(accountId,slot,channel){
      const owner=practitionerYoutubeAccountId(accountId)
      const target=practitionerYoutubeSlot(slot)
      const candidate=practitionerYoutubeChannel(channel)
      const current=await this.channels(owner)
      const other=target==='1'?'2':'1'
      if(current[other]?.id===candidate.id)throw new Error('channel_already_connected')
      const result=await command(['HSETNX',key(owner,'channels'),target,JSON.stringify(candidate)])
      assertMutationResult(result)
      const saved=practitionerYoutubeParseChannel(await command(['HGET',key(owner,'channels'),target]))
      if(!saved)throw new Error('history_unavailable')
      if(saved.id!==candidate.id)throw new Error('channel_conflict')
      return saved
    },
    async disconnect(accountId,slot){
      const owner=practitionerYoutubeAccountId(accountId),target=practitionerYoutubeSlot(slot)
      const result=await command(['HDEL',key(owner,'channels'),target])
      assertMutationResult(result)
      return true
    },
    async history(accountId){
      const raw=pairs(await command(['HGETALL',key(accountId,'history')]))
      return raw.map(([id,value])=>{
        const entry=practitionerYoutubeParseUpload(value)
        return entry?.videoId===id?entry:null
      }).filter(Boolean)
        .sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt)||a.videoId.localeCompare(b.videoId))
        .slice(0,PRACTITIONER_YOUTUBE_HISTORY_LIMIT)
    },
    async save(accountId,input){
      const owner=practitionerYoutubeAccountId(accountId)
      const channel=(await this.channels(owner))[practitionerYoutubeSlot(input?.slot)]
      if(!channel)throw new Error('invalid_channel')
      const record=practitionerYoutubeUpload(input,channel.id)
      const result=await command(['HSETNX',key(owner,'history'),record.videoId,JSON.stringify(record)])
      assertMutationResult(result)
      if(result===1||result==='1')return record
      const previous=practitionerYoutubeParseUpload(await command(['HGET',key(owner,'history'),record.videoId]))
      if(!previous||previous.channelId!==record.channelId||previous.slot!==record.slot)
        throw new Error('history_conflict')
      return previous
    },
  }
}
export function getPractitionerYoutubeStore(){
  return createPractitionerYoutubeStore(createYoutubeRedisCommand())
}
/** Test-only Redis fixture: no runtime fallback if the real ledger is down. */
export function createMemoryPractitionerYoutubeStore(){
  const maps=new Map()
  return createPractitionerYoutubeStore(async ([operation,bucket,...rest])=>{
    if(!maps.has(bucket))maps.set(bucket,new Map())
    const values=maps.get(bucket)
    if(operation==='HGET')return values.get(rest[0])??null
    if(operation==='HGETALL')return [...values].flat()
    if(operation==='HSETNX'){if(values.has(rest[0]))return 0;values.set(rest[0],rest[1]);return 1}
    if(operation==='HDEL'){const existed=values.delete(rest[0]);return existed?1:0}
    throw Error('history_unavailable')
  })
}
