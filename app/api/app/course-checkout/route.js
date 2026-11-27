import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {consumeRate,transaction} from '@/lib/app/database'
import {createAppRepository} from '@/lib/app/repository'
import {onlyKeys,AppError} from '@/lib/assessments/contracts'
import {requireCommerceAccount} from '@/lib/commerce/account-binding'
import {courseCheckoutEnabled,quoteCourseCart} from '@/lib/commerce/course-cart.mjs'
import {prepareCourseOrder,listCoursePurchases,submitCourseReceipt,resumeUnpaidCoursePurchase} from '@/lib/commerce/course-order-store'
import {verifiedReikiGoogleEmail} from '@/lib/academy/reiki-registration-proof.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const json=(data,status=200)=>NextResponse.json(data,{status,headers:PRIVATE_HEADERS})
export async function GET(request){
 let auth
 try{
  if(process.env.HH_COURSE_CHECKOUT_SCHEMA_APPROVED!=='true')return json({enabled:false,accountId:null,orders:[]})
  const config=getAppConfig();requestOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  const account=await transaction(config,actor,async db=>(await db.query('select status,onboarding_state from app.accounts where id=$1',[actor.id])).rows[0])
  if(account?.status!=='active')throw new AppError('ACCOUNT_UNAVAILABLE',403)
  if(request.headers.has('x-hh-account-id'))requireCommerceAccount(request,actor)
  const purchases=account.onboarding_state==='active'?await listCoursePurchases(config,actor):{orders:[]}
  return auth.apply(json({enabled:courseCheckoutEnabled(),accountId:actor.id,onboardingState:account.onboarding_state,...purchases}))
 }catch(error){const safe=safeError(error),r=json({error:safe.code},safe.status);return auth?auth.apply(r):r}
}
export async function POST(request){
 let auth
 try{
  const config=getAppConfig();requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified();requireCommerceAccount(request,actor)
  await consumeRate(config,{op:'course-checkout',actor:actor.id},12,600)
  const input=await readBody(request,4096)
  if(Object.hasOwn(input,'retryUnpaid'))return auth.apply(json(await resumeUnpaidCoursePurchase(config,actor,input)))
  if(Object.hasOwn(input,'orderId'))return auth.apply(json(await submitCourseReceipt(config,actor,input)))
  if(!courseCheckoutEnabled())throw new AppError('COURSE_CHECKOUT_UNAVAILABLE',503)
  onlyKeys(input,['items','locale','confirmed','timezone'])
  if(input.confirmed!==true||typeof input.timezone!=='string'||input.timezone.length>80)throw new AppError('CONSENT_REQUIRED',400)
  try{quoteCourseCart(input.items,input.locale);new Intl.DateTimeFormat('en',{timeZone:input.timezone})}catch{throw new AppError('INVALID_COURSE_CART',400)}
  const {data,error}=await auth.client.auth.getUserIdentities()
  if(error||!verifiedReikiGoogleEmail(actor,data?.identities))throw new AppError('VERIFIED_GOOGLE_REQUIRED',403)
  const repo=createAppRepository(config)
  const account=await repo.ensureAccount(actor)
  if(account.onboardingState!=='active')await repo.onboarding(actor,{adult:true,necessary:true,marketing:false,uiLocale:input.locale==='ru'?'ru':'en',timezone:input.timezone,displayName:actor.displayName||''})
  const result=await prepareCourseOrder(config,actor,data.identities,input)
  return auth.apply(json(result))
 }catch(error){const safe=safeError(error),r=json({error:safe.code},safe.status);return auth?auth.apply(r):r}
}
