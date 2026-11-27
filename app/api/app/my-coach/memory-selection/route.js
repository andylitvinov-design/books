import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {coachMemorySelectionEnabled,manageMyCoachMemorySelection} from '@/lib/app/my-coach-memory-selection'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export async function POST(request){
 let auth
 try{
  const config=getAppConfig()
  requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  await consumeRate(config,{op:'my-coach-memory-selection',actorId:actor.id},60,3600)
  const input=await readBody(request,3072)
  // A disabled feature cannot prevent a verified owner from forgetting a ref.
  if(!coachMemorySelectionEnabled()&&input.action!=='forget')throw new AppError('MY_COACH_MEMORY_SELECTION_DISABLED',503)
  const result=await manageMyCoachMemorySelection(config,actor,input)
  return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const result=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(result):result
 }
}
