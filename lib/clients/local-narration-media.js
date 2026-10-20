import 'server-only'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { AppError } from '../assessments/contracts.js'
import { PRIVATE_MEDIA_BUCKET } from './delivery-model.js'

const maxBytes=3_000_000
const unavailable=()=>new AppError('LOCAL_NARRATION_MEDIA_UNAVAILABLE',503)
const objectKeyValid=key=>typeof key==='string'&&
  /^narration\/[a-f0-9-]{36}\/[a-f0-9]{64}\.mp3$/.test(key)

function storage(config) {
  if(!config.secretKey||typeof config.supabaseUrl!=='string')throw unavailable()
  const origin=new URL(config.supabaseUrl).origin
  return createClient(config.supabaseUrl,config.secretKey,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{'x-client-info':'hh-andrey-voice-private/1'},fetch:(input,init)=>{
      const target=new URL(typeof input==='string'?input:input.url||String(input))
      if(target.origin!==origin||target.protocol!=='https:')throw unavailable()
      const headers=new Headers(init?.headers)
      if(config.secretKey.startsWith('sb_secret_')&&
         headers.get('authorization')==='Bearer '+config.secretKey)
        headers.delete('authorization')
      return fetch(input,{...init,headers,redirect:'error',cache:'no-store'})
    }},
  }).storage.from(PRIVATE_MEDIA_BUCKET)
}

export async function privateVoiceStorage(config) {
  const sdk=createClient(config.supabaseUrl,config.secretKey,{
    auth:{persistSession:false,autoRefreshToken:false},
  })
  const {data,error}=await sdk.storage.getBucket(PRIVATE_MEDIA_BUCKET)
  if(error||!data||data.public!==false)throw unavailable()
  return storage(config)
}

export async function createLocalVoiceUpload(config,objectKey) {
  if(!objectKeyValid(objectKey))throw unavailable()
  const bucket=await privateVoiceStorage(config)
  const {data,error}=await bucket.createSignedUploadUrl(objectKey)
  if(error||!data?.signedUrl)throw unavailable()
  const uri=new URL(data.signedUrl)
  if(uri.origin!==new URL(config.supabaseUrl).origin||
    !uri.pathname.includes('/storage/v1/object/upload/sign/'+PRIVATE_MEDIA_BUCKET+'/')||
    !uri.searchParams.get('token'))throw unavailable()
  // Signed URL exists only in authenticated worker response; never on client pages.
  return uri.href
}

export async function verifyLocalVoiceUpload(config,{objectKey,mime,bytes,sha256}) {
  if(!objectKeyValid(objectKey)||mime!=='audio/mpeg'||!Number.isSafeInteger(bytes)||
    bytes<128||bytes>maxBytes||!/^[a-f0-9]{64}$/.test(sha256||''))throw unavailable()
  const bucket=await privateVoiceStorage(config)
  const {data:info,error:infoErr}=await bucket.info(objectKey)
  const size=Number(info?.size??info?.metadata?.size)
  const reported=(info?.content_type||info?.contentType||info?.mimetype||
    info?.metadata?.mimetype||'').split(';')[0].toLowerCase()
  if(infoErr||size!==bytes||reported!=='audio/mpeg')throw unavailable()
  const {data,error}=await bucket.download(objectKey)
  if(error||!data||data.size!==bytes)throw unavailable()
  const buffer=Buffer.from(await data.arrayBuffer())
  const mp3=buffer.subarray(0,3).toString('ascii')==='ID3'||
    (buffer[0]===255&&(buffer[1]&224)===224)
  if(!mp3||createHash('sha256').update(buffer).digest('hex')!==sha256)throw unavailable()
  return true
}

/**
 * Only called AFTER fresh authorization and exact report version lookup.
 * Returns a Node Response-sized buffer (<=3 MB), not a signed storage URL.
 */
export async function readPrivateLocalVoice(config,{objectKey,mime,bytes,range}) {
  if(!objectKeyValid(objectKey)||mime!=='audio/mpeg'||!Number.isSafeInteger(bytes)||
    bytes<128||bytes>maxBytes)throw unavailable()
  const bucket=await privateVoiceStorage(config)
  const {data,error}=await bucket.download(objectKey)
  if(error||!data||data.size!==bytes)throw unavailable()
  const buffer=Buffer.from(await data.arrayBuffer())
  if(buffer.length!==bytes)throw unavailable()
  let start=0,end=bytes-1,status=200
  if(range!==null&&range!==undefined) {
    const match=typeof range==='string'&&/^bytes=(\d+)-(\d*)$/.exec(range)
    if(!match)throw new AppError('LOCAL_NARRATION_BAD_RANGE',416)
    start=Number(match[1])
    end=match[2]===''?bytes-1:Number(match[2])
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||
      start>=bytes||end<start)throw new AppError('LOCAL_NARRATION_BAD_RANGE',416)
    end=Math.min(end,bytes-1);status=206
  }
  return {
    bytes:buffer.subarray(start,end+1),status,
    headers:{
      'Content-Type':mime,
      'Content-Length':String(end-start+1),
      'Accept-Ranges':'bytes',
      ...(status===206?{'Content-Range':`bytes ${start}-${end}/${bytes}`}:{}),
    },
  }
}
