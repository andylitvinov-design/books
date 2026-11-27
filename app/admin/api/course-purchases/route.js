import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {consumeRate} from '@/lib/app/database'
import {createAppRepository} from '@/lib/app/repository'
import {listCourseReview,reviewCoursePurchase} from '@/lib/commerce/course-order-store'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
async function handle(request){
 let auth
 try{
  const config=getAppConfig();requestOrigin(request,config)
  if(request.method==='POST')requireSameOrigin(request,config)
  if(!await requireAdminRequest())throw new AppError('SIGN_IN_REQUIRED',401)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(!practitionerEmailAllowed(actor)||!(await createAppRepository(config).isPractitioner(actor)))throw new AppError('ACCESS_DENIED',403)
  await consumeRate(config,{op:'course-payment-review',owner:actor.id},30,60)
  const result=request.method==='GET'?await listCourseReview(config,actor):await reviewCoursePurchase(config,actor,await readBody(request,4096))
  return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
 }catch(error){const safe=safeError(error),r=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});return auth?auth.apply(r):r}
}
export {handle as GET,handle as POST}
