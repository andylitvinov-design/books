import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {revealPublicEnquiryContact} from '@/lib/practitioners/public-enquiry-operator-contact'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function POST(request,{params}){
 let auth
 try{
  const config=getAppConfig()
  requestOrigin(request,config)
  requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  const {id}=await params
  const contact=await revealPublicEnquiryContact(config,actor,id)
  return auth.apply(NextResponse.json({contact},{headers:PRIVATE_HEADERS}))
 }catch(error){
  // Never format or log errors here: provider/crypto details could contain PII.
  const allowed=new Set(['SIGN_IN_REQUIRED','ACCOUNT_CHANGED','NOT_FOUND','AUDIT_UNAVAILABLE'])
  const safe=error instanceof AppError&&allowed.has(error.code)
   ? {code:error.code,status:error.status} : {code:'SERVICE_UNAVAILABLE',status:503}
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
