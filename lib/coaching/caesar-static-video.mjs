import {simliPresetForRole} from './live-avatar-pilot.mjs'

export const STATIC_ENDPOINT='https://api.simli.ai/static/audio'
const JOBS=new Set(['greeting-en','greeting-ru','neutral'])
const MAX_BYTES=1024*1024
const MAX_SECONDS=60
const DAY=86400000
// One explicitly approved production job, within a single UTC day. Never enabled by the live-video pilot alone.
export function staticApproval(env=process.env,now=Date.now()){
  if(env.VERCEL_ENV!=='production'||env.HH_SIMLI_FREE_ACCOUNT_VERIFIED!=='true'||!env.SIMLI_API_KEY)return null
  let a;try{a=JSON.parse(env.HH_SIMLI_STATIC_VIDEO_APPROVAL||'null')}catch{return null}
  if(!a||!JOBS.has(a.job)||a.freeStaticAndHardStopVerified!==true||a.editorialUseVerified!==true||!Number.isSafeInteger(a.maxSeconds)||a.maxSeconds<5||a.maxSeconds>MAX_SECONDS)return null
  const start=Date.parse(a.notBefore),end=Date.parse(a.expiresAt)
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>now||now>=end||end-start>DAY||Math.floor(start/DAY)!==Math.floor((end-1)/DAY))return null
  return {job:a.job,maxSeconds:a.maxSeconds,expiresAt:new Date(end).toISOString()}
}
export function validStaticRequest(body,approval){
  return Boolean(approval&&body&&Object.keys(body).length===3&&body.job===approval.job&&body.freeOnly===true&&body.editorialOnly===true)
}
// Parse complete MPEG Layer III frames, never estimate duration from a file size or truncate speech.
export function mp3Info(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length<4||bytes.length>MAX_BYTES)throw Error('STATIC_AUDIO_INVALID')
  let p=0,seconds=0,sampleRate=0,channels=0,frames=0
  if(bytes[0]===73&&bytes[1]===68&&bytes[2]===51){
    if(bytes.length<10||bytes.subarray(6,10).some(n=>n>127))throw Error('STATIC_AUDIO_INVALID')
    p=10+bytes[6]*2097152+bytes[7]*16384+bytes[8]*128+bytes[9]+(bytes[3]===4&&(bytes[5]&16)?10:0)
  }
  const rates1=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]
  const rates2=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160]
  while(p<bytes.length){
    if(bytes.length-p===128&&bytes[p]===84&&bytes[p+1]===65&&bytes[p+2]===71){p+=128;break}
    const a=bytes[p],b=bytes[p+1],c=bytes[p+2],d=bytes[p+3],version=(b>>3)&3,index=(c>>4)&15,rateIndex=(c>>2)&3
    if(p+4>bytes.length||a!==255||(b&224)!==224||version===1||((b>>1)&3)!==1||index===0||index===15||rateIndex===3)throw Error('STATIC_AUDIO_INVALID')
    const hz=[44100,48000,32000][rateIndex]/(version===3?1:version===2?2:4),ch=(d>>6)===3?1:2
    const size=Math.floor((version===3?144000:72000)*(version===3?rates1:rates2)[index]/hz)+((c>>1)&1)
    if(size<4||p+size>bytes.length||(sampleRate&&sampleRate!==hz)||(channels&&channels!==ch))throw Error('STATIC_AUDIO_INVALID')
    sampleRate=hz;channels=ch;seconds+=(version===3?1152:576)/hz;frames++;p+=size
    if(seconds>MAX_SECONDS)throw Error('STATIC_AUDIO_TOO_LONG')
  }
  if(!frames||p!==bytes.length||channels!==1)throw Error('STATIC_AUDIO_INVALID')
  return {seconds,sampleRate,channels}
}
export async function boundedBytes(response,limit){
  if(!response?.body||Number(response.headers.get('content-length'))>limit)throw Error('STATIC_RESPONSE_INVALID')
  const reader=response.body.getReader(),chunks=[];let count=0
  try{for(;;){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>limit)throw Error('STATIC_RESPONSE_INVALID');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
  return Buffer.concat(chunks,count)
}
// Simli documents the response as any; only accept an actual private MP4 URL on its exact documented host/path.
export function privateMp4Url(value,depth=0){
  if(depth>5)return null
  if(typeof value==='string'){
    try{const u=new URL(value);return value.length<=4096&&u.origin==='https://api.simli.ai'&&!u.username&&!u.password&&!u.hash&&/^\/static\/mp4\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(u.pathname)&&Boolean(u.search)?u.href:null}catch{return null}
  }
  if(value&&typeof value==='object'){for(const child of Object.values(value).slice(0,100)){const url=privateMp4Url(child,depth+1);if(url)return url}}
  return null
}
export async function generateCaesarStatic(body,{env=process.env,now=Date.now,readGreeting,reserve,fetcher=fetch,signal}={}){
  const approval=staticApproval(env,now())
  if(!approval)throw Error('STATIC_NOT_APPROVED')
  if(!validStaticRequest(body,approval))throw Error('STATIC_INVALID_REQUEST')
  let bytes,info,format
  if(body.job==='neutral'){bytes=Buffer.alloc(16000*2*5);info={seconds:5,sampleRate:16000,channels:1};format='pcm16'}
  else{bytes=await readGreeting(body.job.slice(-2));info=mp3Info(bytes);format='mp3'}
  if(info.seconds>approval.maxSeconds)throw Error('STATIC_AUDIO_TOO_LONG')
  if(!validStaticRequest(body,staticApproval(env,now())))throw Error('STATIC_NOT_APPROVED')
  // Global durable daily reservation is committed before the only provider POST. Unknown outcomes are NOT retryable.
  await reserve()
  if(signal?.aborted||!validStaticRequest(body,staticApproval(env,now())))throw Error('STATIC_ATTEMPT_LOCKED')
  try{
    const response=await fetcher(STATIC_ENDPOINT,{method:'POST',redirect:'error',cache:'no-store',headers:{'Content-Type':'application/json','x-simli-api-key':env.SIMLI_API_KEY},body:JSON.stringify({faceId:simliPresetForRole('coach').faceId,audioBase64:Buffer.from(bytes).toString('base64'),audioFormat:format,audioSampleRate:info.sampleRate,audioChannelCount:info.channels,videoStartingFrame:0,streaming_width:1080,streaming_height:1920}),signal:AbortSignal.any([AbortSignal.timeout(45000),...(signal?[signal]:[])])})
    if(!response.ok)throw Error('STATIC_PROVIDER_REJECTED')
    const mp4Url=privateMp4Url(JSON.parse((await boundedBytes(response,65536)).toString('utf8')))
    if(!mp4Url)throw Error('STATIC_PROVIDER_UNRECOGNIZED')
    return {job:body.job,seconds:info.seconds,mp4Url,status:'PROVIDER_URL_RECEIVED_QA_PENDING'}
  }catch{throw Error('STATIC_ATTEMPT_LOCKED')}
}
