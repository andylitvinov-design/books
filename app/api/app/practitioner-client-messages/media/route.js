import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError,onlyKeys} from '@/lib/assessments/contracts'
import {consumeRate} from '@/lib/app/database'
import {createRequestMedia,ORDER_AUDIO_PROXY_MAX_BYTES} from '@/lib/practitioners/request-media'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

async function action(request){
  let auth
  try{
    const config=getAppConfig()
    requestOrigin(request,config)
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    await consumeRate(config,{op:'request-media',actor:actor.id},18,3600)
    const media=createRequestMedia(config)
    let result
    if(request.method==='POST'){
      if(new URL(request.url).search)throw new AppError('INVALID_QUERY',400)
      const body=await readBody(request,4096)
      if(body?.action==='intent'){
        onlyKeys(body,['action','requestId','mime','bytes'])
        result=await media.intent(actor,body)
      }else if(body?.action==='complete'){
        onlyKeys(body,['action','assetId'])
        result=await media.complete(actor,body.assetId)
      }else throw new AppError('INVALID_ACTION',400)
    }else if(request.method==='PUT'){
      const query=new URL(request.url).searchParams
      if([...query.keys()].some(key=>key!=='assetId')||
         query.getAll('assetId').length!==1)
        throw new AppError('INVALID_QUERY',400)
      const mime=String(request.headers.get('content-type')||'').split(';')[0].toLowerCase()
      const declared=Number(request.headers.get('content-length'))
      if(request.headers.has('content-length')&&(!Number.isSafeInteger(declared)||declared>ORDER_AUDIO_PROXY_MAX_BYTES))
        throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
      if(!request.body)throw new AppError('INVALID_REQUEST',400)
      const reader=request.body.getReader(),chunks=[]
      let size=0
      try{
        while(true){
          const chunk=await reader.read()
          if(chunk.done)break
          size+=chunk.value.byteLength
          if(size>ORDER_AUDIO_PROXY_MAX_BYTES)throw new AppError('MEDIA_SIZE_NOT_ALLOWED',413)
          chunks.push(Buffer.from(chunk.value))
        }
      }catch(e){await reader.cancel().catch(()=>{});throw e}
      result=await media.upload(actor,query.get('assetId'),{mime,body:Buffer.concat(chunks,size)})
    }else throw new AppError('NOT_FOUND',404)
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export const POST=action
export const PUT=action
