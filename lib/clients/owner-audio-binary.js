import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {isSameOriginRequest} from '../prescriptions/session.js'
import {OWNER_AUDIO_MIME_TYPES,OWNER_AUDIO_PROXY_MAX_BYTES} from './owner-audio-upload.js'

// Bounded binary transport for small iPhone/Android files. No multipart,
// JSON/base64 or third-party Storage write credentials. Reject spoofed request
// sizes before allocating RAM, then verify the actual stream length.
export async function readOwnerAudioBinary(request){
 if(!isSameOriginRequest(request)||request.headers.get('sec-fetch-site')==='cross-site')
  throw new AppError('ORIGIN_DENIED',403)
 const mime=(request.headers.get('content-type')||'').split(';')[0].toLowerCase()
 if(!OWNER_AUDIO_MIME_TYPES.includes(mime))throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
 const declared=request.headers.get('content-length')
 if(declared!==null&&(!/^[0-9]+$/.test(declared)||
   Number(declared)<128||Number(declared)>OWNER_AUDIO_PROXY_MAX_BYTES))
   throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
 if(!request.body)throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
 const chunks=[];let size=0
 const reader=request.body.getReader()
 try{
  while(true){
   const chunk=await reader.read()
   if(chunk.done)break
   size+=chunk.value.byteLength
   if(size>OWNER_AUDIO_PROXY_MAX_BYTES)throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
   chunks.push(Buffer.from(chunk.value))
  }
 }catch(error){await reader.cancel().catch(()=>{});throw error}
 finally{reader.releaseLock()}
 if(size<128||(declared!==null&&Number(declared)!==size))
   throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
 return {mime,body:Buffer.concat(chunks,size)}
}
