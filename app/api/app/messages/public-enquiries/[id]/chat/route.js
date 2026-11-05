import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {transaction} from '@/lib/app/database'
import {AppError,onlyKeys,requireUUID} from '@/lib/assessments/contracts'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {readPublicEnquiryChat,writePublicEnquiryChat} from '@/lib/practitioners/public-enquiry-chat-store'
import {publicEnquiryGuestChatReady} from '@/lib/practitioners/public-enquiry-chat-policy.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
async function handle(request,{params}){
  let auth
  try{
    const config=getAppConfig()
    if(!publicEnquiryGuestChatReady())throw new AppError('GUEST_CHAT_UNAVAILABLE',503)
    requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)
    const {id}=await params
    requireUUID(id)
    const body=request.method==='POST'?await readBody(request,8192):null
    if(body)onlyKeys(body,['operationId','text'])
    const result=await transaction(config,actor,async db=>{
      const enquiry=(await db.query(
        `select e.id,e.status,e.reference_code,p.trusted_auth_user_id as owner_id
           from app.public_service_enquiries e
           join app.practitioners p on p.id=e.recipient_practitioner_id
          where e.id=$1 and p.trusted_auth_user_id=$2 and p.active
            and p.status in ('approved','submitted','changes_requested') limit 1`,
        [id,actor.id])).rows[0]
      if(!enquiry)throw new AppError('NOT_FOUND',404)
      if(body){
        if(!['requested','contacted'].includes(enquiry.status))
          throw new AppError('CHAT_CLOSED',409)
        return writePublicEnquiryChat(db,{ownerId:actor.id,enquiryId:id,
          operationId:body.operationId,text:body.text,author:'operator'},config)
      }
      const transcript=await readPublicEnquiryChat(db,{ownerId:actor.id,enquiryId:id},config)
      return {enquiry:{id,referenceCode:enquiry.reference_code,status:enquiry.status},
        ...transcript,mode:'owner_private_enquiry'}
    })
    return auth.apply(NextResponse.json(result,{
      status:request.method==='POST'?201:200,headers:PRIVATE_HEADERS,
    }))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export const GET=handle
export const POST=handle
