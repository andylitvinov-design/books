import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {safeError,PRIVATE_HEADERS} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {DIRECT_MEDIA_PROXY_MAX_BYTES,directMediaSpec} from '@/lib/practitioners/direct-message-policy.mjs'
import {createDirectMessages} from '@/lib/practitioners/direct-messages'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60

// For iPhone/Safari: small private images and voice notes use our own origin.
// The immutable asset intent, not client input, defines the thread and object.
export async function POST(request,{params}){
  let auth
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    const mime=(request.headers.get('content-type')||'').split(';')[0].toLowerCase()
    try{directMediaSpec(mime,128)}catch{throw new AppError('MEDIA_TYPE_NOT_ALLOWED',415)}
    const declared=request.headers.get('content-length')
    if(declared!==null&&(!/^[0-9]+$/.test(declared)||Number(declared)<128||
      Number(declared)>DIRECT_MEDIA_PROXY_MAX_BYTES))
      throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
    if(!request.body)throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
    const reader=request.body.getReader(),chunks=[]
    let bytes=0
    try{
      while(true){
        const {done,value}=await reader.read()
        if(done)break
        bytes+=value.byteLength
        if(bytes>DIRECT_MEDIA_PROXY_MAX_BYTES)throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
        chunks.push(Buffer.from(value))
      }
    }catch(e){await reader.cancel().catch(()=>{});throw e}
    finally{reader.releaseLock()}
    if(bytes<128||(declared!==null&&Number(declared)!==bytes))
      throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
    const {assetId}=await params
    const result=await createDirectMessages(config).upload(actor,assetId,{
      mime,body:Buffer.concat(chunks,bytes)})
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
