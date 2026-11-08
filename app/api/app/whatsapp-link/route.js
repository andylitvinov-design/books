import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {readBody,safeError,PRIVATE_HEADERS} from '@/lib/app/http'
import {AppError,onlyKeys} from '@/lib/assessments/contracts'
import {createWhatsAppAccountLinkRepository} from '@/lib/app/whatsapp-account-link-repository'
import {WHATSAPP_LINK_NOTICE} from '@/lib/crm/whatsapp-account-link.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
async function handle(request){
 let auth
 try{
  const config=getAppConfig()
  requestOrigin(request,config)
  if(request.method==='POST')requireSameOrigin(request,config)
  if(new URL(request.url).search)throw new AppError('INVALID_REQUEST',400)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  const service=createWhatsAppAccountLinkRepository(config)
  let data
  if(request.method==='GET')data=await service.status(actor)
  else{
   const body=await readBody(request,512)
   if(body?.action==='begin'){
    onlyKeys(body,['action','noticeVersion','permissionAccepted'])
    if(body.noticeVersion!==WHATSAPP_LINK_NOTICE||body.permissionAccepted!==true)
     throw new AppError('CONSENT_REQUIRED',403)
    data=await service.begin(actor)
   }else if(body?.action==='unlink'){
    onlyKeys(body,['action'])
    data=await service.unlink(actor)
   }else throw new AppError('INVALID_ACTION',400)
  }
  return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
export const GET=handle
export const POST=handle
