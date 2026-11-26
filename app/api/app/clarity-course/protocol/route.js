import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {readMyCoachProtocol} from '@/lib/app/personal-coaching'
import {clarityProtocolView} from '@/lib/coaching/clarity-course-protocol.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
export async function GET(request){
 let auth
 try{
  const config=getAppConfig();requestOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  const q=new URL(request.url).searchParams
  if([...q.keys()].some(k=>!['id','day'].includes(k)||q.getAll(k).length!==1)||!['1','2','3'].includes(q.get('day')))throw new AppError('INVALID_QUERY',400)
  await consumeRate(config,{op:'clarity-course-protocol-read',actor:actor.id},60,3600)
  const result=clarityProtocolView(await readMyCoachProtocol(config,actor,q.get('id')),Number(q.get('day')))
  if(!result)throw new AppError('MY_COACH_PROTOCOL_NOT_FOUND',404)
  return auth.apply(NextResponse.json({protocol:result},{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
