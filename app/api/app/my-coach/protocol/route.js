import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {listMyCoachProtocols,saveMyCoachProtocol,deleteMyCoachProtocol} from '@/lib/app/personal-coaching'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'

// This endpoint never sends a transcript to an LLM, analytics or a PDF vendor.
// GET returns records exclusively to the signed-in verified owner.
export async function GET(request){
  let auth
  try{
    const config=getAppConfig()
    // GET requests commonly carry no Origin header; validate the serving host.
    requestOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const provided=request.headers.get('x-hh-account-id')
    if(provided&&provided!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
    const result=await listMyCoachProtocols(config,actor)
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(result):result
  }
}

export async function POST(request){
  let auth
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const provided=request.headers.get('x-hh-account-id')
    if(provided&&provided!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
    const input=await readBody(request,100000)
    if(!input||typeof input!=='object'||Array.isArray(input))
      throw new AppError('MY_COACH_PROTOCOL_INVALID',400)
    await consumeRate(config,{op:'my-coach-protocol',actor:actor.id},15,3600)
    let result
    if(input.action==='save'){
      if(Object.keys(input).some(key=>!['action','consent','protocol'].includes(key)))
        throw new AppError('MY_COACH_PROTOCOL_INVALID',400)
      result=await saveMyCoachProtocol(config,actor,input)
    }else if(input.action==='delete'){
      if(Object.keys(input).some(key=>!['action','id','confirmed'].includes(key)))
        throw new AppError('MY_COACH_PROTOCOL_INVALID',400)
      result=await deleteMyCoachProtocol(config,actor,input)
    }else throw new AppError('MY_COACH_PROTOCOL_INVALID',400)
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(result):result
  }
}
