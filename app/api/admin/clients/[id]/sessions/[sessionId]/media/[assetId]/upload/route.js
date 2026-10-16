import {ownerDelivery,privateJson} from '@/lib/clients/delivery-http'
import {isSameOriginRequest} from '@/lib/prescriptions/session'
import {AppError} from '@/lib/assessments/contracts'
import {OWNER_AUDIO_MIME_TYPES,OWNER_AUDIO_PROXY_MAX_BYTES} from '@/lib/clients/owner-audio-upload'
import {uploadPrivateOwnerAudio} from '@/lib/clients/session-delivery-storage'

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
    if(!OWNER_AUDIO_MIME_TYPES.includes(mime))
      throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)
    const declared=request.headers.get('content-length')
    if(declared!==null&&(!/^\\d+$/.test(declared)||Number(declared)>OWNER_AUDIO_PROXY_MAX_BYTES||
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
        if(size>OWNER_AUDIO_PROXY_MAX_BYTES)
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
    const result=await uploadPrivateOwnerAudio(config,store,id,sessionId,assetId,{
      mime,body:Buffer.concat(chunks,size),
    })
    return privateJson(result)
  })
}
