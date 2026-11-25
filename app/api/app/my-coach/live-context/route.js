import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { readMyCoachLiveContext } from '@/lib/app/my-coach-live-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'yul1'

// No provider call, transcript storage or model inference. Server revalidates
// signed identity/stage, source revisions and every item grant. Only the
// selected explicitly approved reference packet is returned to its owner.
export async function POST(request){
  let auth
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const provided=request.headers.get('x-hh-account-id')
    if(provided&&provided!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
    await consumeRate(config,{op:'my-coach-live-context',actor:actor.id},12,3600)
    const data=await readBody(request,2048)
    const result=await readMyCoachLiveContext(config,actor,data)
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
