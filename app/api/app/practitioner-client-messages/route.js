import { NextResponse, after } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { createPractitionerClientMessages } from '@/lib/practitioners/client-messages'
import { dispatchClientMessagePush,dispatchPractitionerMessagePush } from '@/lib/app/client-message-push'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handler(request){
  let auth
  try {
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    const store=createPractitionerClientMessages(config)
    let data
    if(request.method==='GET'){
      const params=new URL(request.url).searchParams
      const keys=['requestId','before']
      if([...params.keys()].some(key=>!keys.includes(key))||
         keys.some(key=>params.getAll(key).length>1)||
         !params.get('requestId'))
        throw new AppError('INVALID_REQUEST',400)
      data=await store.list(actor,params.get('requestId'),params.get('before'))
    }else{
      // The 1,200-character limit is enforced by the message store. Leave room
      // for UTF-8 and JSON escaping so the same limit works in every language.
      const body=await readBody(request,8192)
      if(body?.action==='mark_seen'){
        onlyKeys(body,['action','requestId','messageId'])
        data=await store.markSeen(actor,body)
      }else{
        onlyKeys(body,['requestId','operationId','text','visibility'])
        data=await store.send(actor,body)
      }
    }
    // A saved reply remains saved even if its optional Web Push delivery fails.
    // Never return an internal notification flag to the browser.
    if(request.method==='POST'&&data.duplicate===false){
      const id=data.id
      if(data.notifyClient===true)
        after(async()=>{try{await dispatchClientMessagePush(config,id)}catch{/* best effort; no private logs */}})
      else if(data.notifyMaster===true)
        after(async()=>{try{await dispatchPractitionerMessagePush(config,id)}catch{/* best effort; no private logs */}})
    }
    const safeData={...data}
    delete safeData.notifyClient
    delete safeData.notifyMaster
    return auth.apply(NextResponse.json(safeData,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export const GET=handler
export const POST=handler
