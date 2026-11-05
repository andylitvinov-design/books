import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {transaction,consumeRate} from '@/lib/app/database'
import {AppError,onlyKeys,requireUUID} from '@/lib/assessments/contracts'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {guestChatCookieName,verifyGuestEnquiryCapability} from '@/lib/practitioners/public-enquiry-chat-capability.mjs'
import {publicEnquiryGuestChatReady} from '@/lib/practitioners/public-enquiry-chat-policy.mjs'
import {readPublicEnquiryChat,writePublicEnquiryChat} from '@/lib/practitioners/public-enquiry-chat-store'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request){
  try{
    const config=getAppConfig()
    if(!publicEnquiryGuestChatReady())throw new AppError('GUEST_CHAT_UNAVAILABLE',503)
    requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    const url=new URL(request.url)
    if([...url.searchParams.keys()].some(k=>k!=='enquiry')||
       url.searchParams.getAll('enquiry').length!==1)
      throw new AppError('INVALID_ENQUIRY',400)
    const id=url.searchParams.get('enquiry')
    requireUUID(id)
    const token=request.cookies.get(guestChatCookieName(id))?.value
    const proof=verifyGuestEnquiryCapability(token,id,config)
    if(!proof)throw new AppError('GUEST_CHAT_VERIFICATION_REQUIRED',401)
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'
    await consumeRate(config,{op:request.method==='POST'?'guest-enquiry-chat-write':'guest-enquiry-chat-read',id,ip},
      request.method==='POST'?10:120,3600)
    const body=request.method==='POST'?await readBody(request,8192):null
    if(body)onlyKeys(body,['operationId','text'])
    const result=await transaction(config,null,async db=>{
      await db.query("select set_config('hh.public_enquiry_operation',$1,true)",[proof.operationId])
      await db.query("select set_config('hh.guest_chat_enquiry',$1,true)",[id])
      if(body){
        requireUUID(body.operationId)
        await db.query("select set_config('hh.guest_chat_message',$1,true)",[body.operationId])
      }
      const enquiry=(await db.query(
        `select e.id,e.operation_id,e.status,e.reference_code,e.service_title,
                p.trusted_auth_user_id as owner_id
           from app.public_service_enquiries e
           join app.practitioners p on p.id=e.recipient_practitioner_id
          where e.id=$1 and e.operation_id=$2 and e.contact_ciphertext is not null
            and p.active and p.trusted_auth_user_id is not null limit 1`,
        [id,proof.operationId])).rows[0]
      if(!enquiry)throw new AppError('NOT_FOUND',404)
      if(body){
        if(!['requested','contacted'].includes(enquiry.status))
          throw new AppError('CHAT_CLOSED',409)
        return writePublicEnquiryChat(db,{
          ownerId:enquiry.owner_id,enquiryId:id,
          operationId:body.operationId,text:body.text,author:'guest',
        },config)
      }
      const transcript=await readPublicEnquiryChat(db,{
        ownerId:enquiry.owner_id,enquiryId:id,
      },config)
      return {enquiry:{id,referenceCode:enquiry.reference_code,
        serviceTitle:enquiry.service_title,status:enquiry.status},
        ...transcript,mode:'verified_guest_browser'}
    },{server:true})
    return NextResponse.json(result,{status:request.method==='POST'?201:200,headers:PRIVATE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  }
}
export const GET=handle
export const POST=handle
