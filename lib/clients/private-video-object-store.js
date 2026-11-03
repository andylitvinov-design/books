// Server-only S3-compatible adapter for optional private per-session video.
// R2 is cost-friendly but does not guarantee Canadian residency. For Canada-only
// storage configure S3 in ca-central-1. Neither provider is enabled by default.
import 'server-only'
import {createHash,createHmac} from 'node:crypto'
import {AppError} from '../assessments/contracts.js'

const unavailable=()=>{throw new AppError('MEDIA_STORAGE_NOT_CONFIGURED',503)}
const failure=()=>{throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)}
const providers=new Set(['r2','s3_ca'])
const keyPattern=/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(?:mp4|mov)$/i
const bucketPattern=/^(?!\d+\.\d+\.\d+\.\d+$)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/
const hex=(value)=>createHash('sha256').update(value).digest('hex')
const hmac=(key,value)=>createHmac('sha256',key).update(value).digest()
const escape=(value)=>encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())

function validatedConfig(provider,env=process.env){
  if(env.HH_CLIENT_VIDEO_EXTERNAL_ENABLED!=='true'||!providers.has(provider)||
    env.HH_CLIENT_VIDEO_BACKEND!==provider)unavailable()
  const bucket=env.HH_CLIENT_VIDEO_BUCKET||''
  const accessId=env.HH_CLIENT_VIDEO_ACCESS_KEY_ID||''
  const secret=env.HH_CLIENT_VIDEO_SECRET_ACCESS_KEY||''
  if(!bucketPattern.test(bucket)||bucket.includes('..')||!accessId||
     accessId.length>150||!secret||secret.length>250)unavailable()
  let host,region
  if(provider==='r2'){
    const account=env.HH_CLIENT_R2_ACCOUNT_ID||''
    if(!/^[a-f0-9]{32}$/i.test(account))unavailable()
    host=account+'.r2.cloudflarestorage.com'
    region='auto'
  }else{
    host='s3.ca-central-1.amazonaws.com'
    region='ca-central-1'
  }
  return {provider,bucket,accessId,secret,host,region,origin:'https://'+host}
}
// Only new videos use the configured backend. Old Supabase files are untouched.
export function configuredVideoUploadStore(env=process.env){
  if(env.HH_CLIENT_VIDEO_EXTERNAL_ENABLED!=='true')return null
  return validatedConfig(env.HH_CLIENT_VIDEO_BACKEND,env)
}
export function videoObjectOrigin(provider,env=process.env){
  return validatedConfig(provider,env).origin
}
// SigV4 presigning uses only Node crypto: no browser SDK, credentials or
// regional bucket URL are ever embedded in the public application.
export function signPrivateVideoRequest(provider,key,{method='GET',mime=null,expires=60,at=new Date(),env=process.env}={}){
  const c=validatedConfig(provider,env)
  const expectedMime=key.toLowerCase().endsWith('.mov')?'video/quicktime':'video/mp4'
  if(!keyPattern.test(key)||!['GET','PUT','HEAD','DELETE'].includes(method)||
    !Number.isInteger(expires)||expires<1||expires>900||
    ((method==='PUT'&&mime!==expectedMime)||(mime!==null&&method!=='PUT')))failure()
  const timestamp=at.toISOString().replace(/[:-]|\.\d{3}/g,'').slice(0,15)+'Z'
  const day=timestamp.slice(0,8)
  const scope=day+'/'+c.region+'/s3/aws4_request'
  const path='/'+c.bucket+'/'+key.split('/').map(escape).join('/')
  // Create-once PUT: signed If-None-Match prevents replacing any existing
  // client video with the same key, including while a URL has not expired.
  const headers={'host':c.host,...(mime?{'content-type':mime,'if-none-match':'*'}:{})}
  const headerNames=Object.keys(headers).sort()
  const signedHeaders=headerNames.join(';')
  const canonicalHeaders=headerNames.map(name=>name+':'+headers[name].trim()+'\n').join('')
  const queryPairs=[
    ['X-Amz-Algorithm','AWS4-HMAC-SHA256'],
    ['X-Amz-Content-Sha256','UNSIGNED-PAYLOAD'],
    ['X-Amz-Credential',c.accessId+'/'+scope],
    ['X-Amz-Date',timestamp],
    ['X-Amz-Expires',String(expires)],
    ['X-Amz-SignedHeaders',signedHeaders],
  ]
  const query=queryPairs.map(([k,v])=>escape(k)+'='+escape(v)).sort().join('&')
  const request=[method,path,query,canonicalHeaders,signedHeaders,'UNSIGNED-PAYLOAD'].join('\n')
  const textToSign=['AWS4-HMAC-SHA256',timestamp,scope,hex(request)].join('\n')
  const signingKey=hmac(hmac(hmac(hmac('AWS4'+c.secret,day),c.region),'s3'),'aws4_request')
  const signature=createHmac('sha256',signingKey).update(textToSign).digest('hex')
  return c.origin+path+'?'+query+'&X-Amz-Signature='+signature
}

export function createVideoUploadUrl(provider,key,env=process.env,mime='video/mp4'){
  return signPrivateVideoRequest(provider,key,{method:'PUT',mime,expires:900,env})
}
export function createVideoReadUrl(provider,key,method='GET',expires=60){
  return signPrivateVideoRequest(provider,key,{method,expires})
}
async function fetchSigned(provider,key,method,headers){
  let result
  try {
    result=await fetch(createVideoReadUrl(provider,key,method),{
      method,headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),
    })
  }catch{failure()}
  return result
}
export async function inspectUploadedVideo(provider,key){
  const response=await fetchSigned(provider,key,'HEAD')
  if(!response.ok)failure()
  const raw=response.headers.get('content-length')||''
  const bytes=Number(raw)
  const mime=(response.headers.get('content-type')||'').split(';')[0].toLowerCase()
  const expected=key.toLowerCase().endsWith('.mov')?'video/quicktime':'video/mp4'
  if(!/^\d+$/.test(raw)||!Number.isSafeInteger(bytes)||mime!==expected)
    throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  return {bytes,mime}
}
export async function verifyUploadedVideoHeader(provider,key,bytes){
  const response=await fetchSigned(provider,key,'GET',{Range:'bytes=0-31'})
  if(response.status!==206||!response.body||
    response.headers.get('content-range')!=='bytes 0-31/'+bytes){
    await response.body?.cancel().catch(()=>{})
    failure()
  }
  const reader=response.body.getReader()
  let read=0
  const header=new Uint8Array(32)
  try{
    while(read<32){
      const part=await reader.read()
      if(part.done)break
      const chunk=part.value.subarray(0,32-read)
      header.set(chunk,read);read+=chunk.length
    }
  }finally{await reader.cancel().catch(()=>{})}
  // MOV may start with an ftyp, moov, mdat or QuickTime wide atom.
  // Recognize its actual container without claiming any codec conversion.
  const box=String.fromCharCode(...header.subarray(4,8))
  const size=new DataView(header.buffer).getUint32(0)
  const mov=key.toLowerCase().endsWith('.mov')
  if(read<12||size<8||size>bytes||
    !(mov?['ftyp','moov','mdat','wide','free','skip'].includes(box):box==='ftyp'))
    throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
  return true
}
export async function deletePrivateVideo(provider,key){
  const response=await fetchSigned(provider,key,'DELETE')
  if(!response.ok&&response.status!==404)failure()
  return true
}
