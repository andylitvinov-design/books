import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {normalizeMyCoachQaIntent} from '@/lib/coaching/my-coach-qa-ingest.mjs'
import {recordMyCoachQaIntent} from '@/lib/app/my-coach-qa-store'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

export async function POST(request){
  let auth
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const raw=await readBody(request,600)
    const input=normalizeMyCoachQaIntent(raw)
    // Revocation must work even when optional collection has been disabled.
    if(input.action!=='revoke'&&process.env.HH_MY_COACH_QA_ENABLED!=='true')
      throw new AppError('MY_COACH_QA_DISABLED',503)
    await consumeRate(config,{op:'my-coach-qa-intent',actor:actor.id},45,3600)
    const result=await recordMyCoachQaIntent(config,actor,raw)
    return auth.apply(NextResponse.json(result,{status:200,headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
