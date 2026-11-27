import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {coachOwnerMemoryEnabled,readMyCoachOwnerMemory} from '@/lib/app/my-coach-owner-memory'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'

// Explicit first-party review only. No GET query string, no model tools,
// no automatic replay and no new provider permission.
export async function POST(request){
 let auth
 try{
  const config=getAppConfig()
  requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  if(!coachOwnerMemoryEnabled())throw new AppError('MY_COACH_MEMORY_SEARCH_DISABLED',503)
  await consumeRate(config,{op:'my-coach-owner-memory-search',actorId:actor.id},20,3600)
  const input=await readBody(request,2048)
  const result=await readMyCoachOwnerMemory(config,actor,input)
  return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(result):result
 }
}
