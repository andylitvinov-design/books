import {NextResponse} from 'next/server'
import {AppError} from '@/lib/assessments/contracts'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {createVideoCreditService} from '@/lib/video-credits/service'
import {videoCreditCatalog} from '@/lib/video-credits/model.mjs'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request,{params}){
  let auth
  try{
    const {action}=await params
    if(request.method==='GET'&&action==='catalog')
      return NextResponse.json(videoCreditCatalog(),{headers:PRIVATE_HEADERS})
    const config=getAppConfig()
    if(request.method==='POST')requireSameOrigin(request,config)
    else requestOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.has('x-hh-account-id')&&
      request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    const credits=createVideoCreditService(config)
    let result
    if(request.method==='GET'&&action==='status'){
      await consumeRate(config,{op:'video-credit-status',actor:actor.id},60,60)
      result=await credits.status(actor)
    }else if(request.method==='POST'&&action==='hold'){
      await consumeRate(config,{op:'video-credit-hold',actor:actor.id},20,3600)
      result=await credits.hold(actor,await readBody(request,512))
    }else if(request.method==='POST'&&['complete','release'].includes(action)){
      await consumeRate(config,{op:'video-credit-'+action,actor:actor.id},60,3600)
      result=await credits.finish(actor,await readBody(request,512),
        action==='complete'?'completed':'released')
    }else throw new AppError('NOT_FOUND',404)
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export {handle as GET,handle as POST}
