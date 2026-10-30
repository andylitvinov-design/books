import 'server-only'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {createYoutubeRedisCommand} from './upload-history-store.js'
import {ownerEnYoutubeAccessToken,ownerYoutubeExpectedChannel} from '../practitioners/owner-telegram-video-service.js'
import {cleanHeygenPublication,transferHeygenToEnglishYoutube,
  verifyHeygenYoutubeUpload,validHeygenVideoId} from './heygen-en-upload.mjs'

const PREFIX='holistic-house:youtube:heygen-en:v1:'
const TTL=60*60*24*30
const LIMIT_ERROR=new Set(['HEYGEN_VIDEO_NOT_COMPLETED','HEYGEN_API_KEY_MISSING',
  'HEYGEN_STATUS_UNAVAILABLE','HEYGEN_CAPTIONED_MEDIA_UNAVAILABLE',
  'HEYGEN_SOURCE_SIZE_INVALID','HEYGEN_VIDEO_TOO_LARGE',
  'HEYGEN_SOURCE_RANGE_UNSUPPORTED','HEYGEN_SOURCE_RANGE_MISMATCH',
  'HEYGEN_SOURCE_BYTES_MISMATCH','HEYGEN_SOURCE_NOT_MP4'])
const fail=code=>{throw Error(code)}
const key=id=>PREFIX+id
function store(){
 const command=createYoutubeRedisCommand()
 if(!command)fail('YOUTUBE_EN_QUEUE_UNAVAILABLE')
 return command
}
function publicJob(job){
 if(!job)return null
 return {videoId:job.videoId,title:job.title,
   state:job.state,createdAt:job.createdAt,
   updatedAt:job.updatedAt,youtubeVideoId:job.youtubeVideoId??null,
   error:job.error??null,channelId:job.channelId,
   privacyStatus:job.privacyStatus??null}
}
async function get(command,videoId){
 const value=await command(['GET',key(videoId)])
 if(!value)return null
 try{
   const job=JSON.parse(value)
   if(job.videoId!==videoId||!['queued','checking','uploading','processing',
       'uncertain','uploaded','failed'].includes(job.state))
     fail('YOUTUBE_EN_QUEUE_CORRUPT')
   return job
 }catch{fail('YOUTUBE_EN_QUEUE_CORRUPT')}
}
async function set(command,job){
 const value={...job,updatedAt:new Date().toISOString()}
 const result=await command(['SET',key(value.videoId),JSON.stringify(value),'EX',String(TTL)])
 if(result!=='OK')fail('YOUTUBE_EN_QUEUE_UNAVAILABLE')
 return value
}
export async function getHeygenEnglishPublication(videoId){
 if(!validHeygenVideoId(videoId))fail('HEYGEN_INVALID_VIDEO_ID')
 return publicJob(await get(store(),videoId.toLowerCase()))
}
export async function queueHeygenEnglishPublication(config,input,{env=process.env}={}){
 const payload=cleanHeygenPublication(input)
 if(!payload.mediaUrl&&!String(env.HH_HEYGEN_API_KEY||env.HEYGEN_API_KEY||'').trim())
   fail('HEYGEN_API_KEY_MISSING')
 const channelId=await ownerYoutubeExpectedChannel('en')
 const command=store()
 const job={videoId:payload.videoId,title:payload.title,
   description:payload.description,channelId,state:'queued',
   createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
   youtubeVideoId:null,privacyStatus:null,error:null}
 // One immutable upload intent per exact HeyGen render: no blind duplicates.
 // The owner may approve it again, but never repeat a consumed POST/PUT.
 const created=await command(['SET',key(payload.videoId),JSON.stringify(job),
   'NX','EX',String(TTL)])
 if(created==='OK')return {job:publicJob(job),start:true,mediaUrl:payload.mediaUrl}
 const existing=await get(command,payload.videoId)
 if(!existing)fail('YOUTUBE_EN_QUEUE_UNAVAILABLE')
 if(existing.channelId!==channelId)fail('YOUTUBE_EN_CHANNEL_CHANGED')
 return {job:publicJob(existing),start:false,mediaUrl:null}
}
export async function runHeygenEnglishPublication(config,videoId,{mediaUrl=null,
  env=process.env,fetcher=fetch}={}){
 if(!validHeygenVideoId(videoId))fail('HEYGEN_INVALID_VIDEO_ID')
 const command=store()
 let job=await get(command,videoId.toLowerCase())
 if(!job||job.state!=='queued')return publicJob(job)
 let begun=false
 try{
   job=await set(command,{...job,state:'checking'})
   const {token,channelId}=await ownerEnYoutubeAccessToken(config,fetcher,env)
   if(channelId!==job.channelId)fail('YOUTUBE_EN_CHANNEL_CHANGED')
   const outcome=await transferHeygenToEnglishYoutube({
     videoId:job.videoId,title:job.title,description:job.description,
     mediaUrl,apiKey:env.HH_HEYGEN_API_KEY||env.HEYGEN_API_KEY||null,
     token,channelId,fetcher,
     onUploadStart:async()=>{
       begun=true
       job=await set(command,{...job,state:'uploading'})
     },
     onVideoId:async video=>{
       job=await set(command,{...job,state:'processing',youtubeVideoId:video})
     },
     onProgress:async()=>{}
   })
   job=await set(command,{...job,state:'uploaded',
     youtubeVideoId:outcome.id,privacyStatus:outcome.privacyStatus,error:null})
 }catch(error){
   // An uploaded ID is retained for safe READ-ONLY reconciliation. Without it
   // an ambiguous transfer can NEVER be automatically retried.
   const errorCode=String(error?.message||'YOUTUBE_EN_UPLOAD_UNCERTAIN')
   job=await set(command,{...job,
     state:begun&&!LIMIT_ERROR.has(errorCode)?'uncertain':'failed',
     error:errorCode})
 }
 return publicJob(job)
}
export async function verifyHeygenEnglishPublication(config,videoId,{
  env=process.env,fetcher=fetch}={}){
 if(!validHeygenVideoId(videoId))fail('HEYGEN_INVALID_VIDEO_ID')
 const command=store()
 let job=await get(command,videoId.toLowerCase())
 if(!job)fail('YOUTUBE_EN_PUBLICATION_NOT_FOUND')
 if(!job.youtubeVideoId)return publicJob(job)
 const {token,channelId}=await ownerEnYoutubeAccessToken(config,fetcher,env)
 if(channelId!==job.channelId)fail('YOUTUBE_EN_CHANNEL_CHANGED')
 try{
   const state=await verifyHeygenYoutubeUpload(job.youtubeVideoId,
     token,channelId,fetcher)
   job=await set(command,{...job,state:'uploaded',privacyStatus:state.privacyStatus,error:null})
 }catch(error){
   if(['YOUTUBE_EN_PROCESSING','YOUTUBE_EN_READBACK_PENDING'].includes(error.message))
     job=await set(command,{...job,state:'uncertain',error:error.message})
   else throw error
 }
 return publicJob(job)
}
