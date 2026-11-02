import {ownerDelivery,privateJson} from '@/lib/clients/delivery-http'
import {isSameOriginRequest} from '@/lib/prescriptions/session'
import {AppError} from '@/lib/assessments/contracts'
import {OWNER_AUDIO_MIME_TYPES,OWNER_AUDIO_PROXY_MAX_BYTES} from '@/lib/clients/owner-audio-upload'
import {OWNER_PHOTO_MIME_TYPES,OWNER_PHOTO_PROXY_MAX_BYTES} from '@/lib/clients/owner-photo-upload'
import {uploadPrivateOwnerAudio,uploadPrivateOwnerPhoto} from '@/lib/clients/session-delivery-storage'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60

// Authenticated and same-origin only. No JSON/base64 or multipart body:
// the binary request stays below Vercel's request-size ceiling.
export async function POST(request,{params}) {
  return ownerDelivery(request,async({config,store})=>{
    if(!isSameOriginRequest(request)||request.headers.get('sec-fetch-site')==='cross-site')
      throw new AppError('ORIGIN_DENIED',403)
    const mime=(request.headers.get('content-type')||'').split(';')[0].toLowerCase()
    const photo=OWNER_PHOTO_MIME_TYPES.includes(mime)
    const limit=photo?OWNER_PHOTO_PROXY_MAX_BYTES:OWNER_AUDIO_PROXY_MAX_BYTES
    if(!photo&&!OWNER_AUDIO_MIME_TYPES.includes(mime))
      throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
    const declared=request.headers.get('content-length')
    if(declared!==null&&(!/^[0-9]+$/.test(declared)||Number(declared)>limit||
      Number(declared)<128))
      throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
    if(!request.body)throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
    const chunks=[]
    let size=0
    const reader=request.body.getReader()
    try{
      while(true){
        const part=await reader.read()
        if(part.done)break
        size+=part.value.byteLength
        if(size>limit)
          throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
        chunks.push(Buffer.from(part.value))
      }
    }catch(error){
      await reader.cancel().catch(()=>{})
      throw error
    }finally{reader.releaseLock()}
    if(size<128||(declared!==null&&Number(declared)!==size))
      throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
    const {id,sessionId,assetId}=await params
    const body=Buffer.concat(chunks,size)
    const result=photo?
      await uploadPrivateOwnerPhoto(config,store,id,sessionId,assetId,{mime,body}):
      await uploadPrivateOwnerAudio(config,store,id,sessionId,assetId,{mime,body})
    return privateJson(result)
  })
}
