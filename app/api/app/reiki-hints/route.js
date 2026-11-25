import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {AppError} from '@/lib/assessments/contracts'
import {createReikiHintsRepository} from '@/lib/app/reiki-hints-repository'
import {createMessengerNotificationRepository} from '@/lib/app/messenger-notification-repository'
import {CRM_ACCOUNT_LINK_NOTICE_VERSION,MESSENGER_CONTACT_NOTICE_VERSION} from '@/lib/app/messenger-notification-policy'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request){
 let auth
 try{
  const config=getAppConfig()
  requestOrigin(request,config)
  if(request.method==='POST')requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  await consumeRate(config,{scope:'reiki-hints',method:request.method,accountId:actor.id},
    request.method==='POST'?8:40,60)
  const repo=createReikiHintsRepository(config)
  let data
  if(request.method==='GET')data=await repo.state(actor)
  else{
   const raw=await readBody(request,1300)
   if(raw?.action==='confirm'){
    const {action,crmNoticeVersion,...input}=raw
    if(crmNoticeVersion!==CRM_ACCOUNT_LINK_NOTICE_VERSION||input.enabled!==true)throw new AppError('REIKI_HINTS_INVALID',400)
    data=await repo.mutate(actor,input)
    if(data.preferences&&['stopped','completed','disconnected'].includes(data.preferences.status))throw new AppError('REIKI_HINTS_SERIES_CLOSED',409)
    const channels=createMessengerNotificationRepository(config)
    const current=await channels.state(actor)
    if(data.telegramConnected){
     const linked=current.crmLinked?current:await channels.mutate(actor,{action:'link_crm',channel:'telegram',noticeVersion:CRM_ACCOUNT_LINK_NOTICE_VERSION,permissionAccepted:true})
     data={...data,crmLinked:linked.crmLinked===true}
    }else{
     const result=await channels.mutate(actor,{action:'begin_telegram',channel:'telegram',
       topics:current.channels.telegram.status==='pending'?current.channels.telegram.topics:{messages:false,booking:false,reports:false,courses:false,news:false},
       locale:input.locale,noticeVersion:MESSENGER_CONTACT_NOTICE_VERSION,permissionAccepted:true,crmNoticeVersion:CRM_ACCOUNT_LINK_NOTICE_VERSION})
     data={...data,linkUrl:result.linkUrl}
    }
   }else data=await repo.mutate(actor,raw)
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
