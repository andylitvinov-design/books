import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { createCrmRepository, crmEnabled } from '@/lib/crm/repository'
import { retrievePrivateTelegramPhoto } from '@/lib/crm/messenger-provider'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

// Photo proxy for an EXISTING Telegram message in the logged-in owner's CRM
// thread. No file_id, provider URL, CDN token or image is made public.
export async function GET(request){
  let auth
  try {
    if(!crmEnabled())throw new AppError('CRM_UNAVAILABLE',503)
    const config=getAppConfig()
    requestOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)
    const params=new URL(request.url).searchParams
    if([...params.keys()].some(key=>!['threadId','messageId'].includes(key))||
       params.getAll('threadId').length!==1||params.getAll('messageId').length!==1)
      throw new AppError('INVALID_MESSAGE',400)
    const repo=createCrmRepository(config)
    const fileId=await repo.withOwner(actor,store=>store.readTelegramPhotoRef({
      threadId:params.get('threadId'),messageId:params.get('messageId'),
    }))
    const photo=await retrievePrivateTelegramPhoto(fileId)
    return auth.apply(new NextResponse(photo.bytes,{headers:{
      ...PRIVATE_HEADERS,'Content-Type':photo.contentType,
      'Content-Disposition':'inline; filename="telegram-enquiry-photo"',
      'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
    }}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{
      status:safe.status,headers:PRIVATE_HEADERS,
    })
    return auth?auth.apply(response):response
  }
}
