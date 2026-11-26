import {readClarityCourseClock} from '@/lib/app/clarity-course-clock-store.js'
import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {listMyCoachProtocols} from '@/lib/app/personal-coaching'
import {clarityGrantStatus} from '@/lib/app/clarity-course-access.js'
import {clarityCourseResult} from '@/lib/coaching/clarity-course-results.mjs'
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
  const query=new URL(request.url).searchParams
  if([...query.keys()].some(k=>k!=='locale'))throw new AppError('INVALID_QUERY',400)
  const locale=['ru','en','es'].includes(query.get('locale'))?query.get('locale'):'en'
  const grant=await clarityGrantStatus(config,actor)
  const clock=await readClarityCourseClock(config,actor)
  const results=[]
  let cursor=null,complete=false
  for(let i=0;i<8;i++){
   const page=await listMyCoachProtocols(config,actor,cursor||{})
   for(const protocol of page.protocols){const result=clarityCourseResult(protocol,locale,{clock});if(result)results.push(result)}
   if(!page.hasMore){complete=true;break}
   if(!page.nextCursor)break
   cursor=page.nextCursor
  }
  return auth.apply(NextResponse.json({grant,results,complete},{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error),response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
