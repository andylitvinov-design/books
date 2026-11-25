import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {sendOwnerTelegramPilot} from '@/lib/app/client-telegram-owner-pilot'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'

// Sends exactly one fixed benign TEST message to the owner's own verified chat.
// This endpoint cannot enable any customer sends and takes no recipient/text input.
export async function POST(request){
 let auth
 try{
   const config=getAppConfig()
   requestOrigin(request,config)
   requireSameOrigin(request,config)
   auth=createRequestAuth(request,config)
   const actor=await auth.verified()
   if(request.headers.get('x-hh-account-id')!==actor.id)
     throw new AppError('ACCOUNT_CHANGED',409)
   if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)
   // Next's Node adapter wraps even an empty POST in a stream. Check EOF,
   // never parse a payload or buffer it; a nonempty or stalled stream fails closed.
   const length=request.headers.get('content-length')
   if(length!==null&&length!=='0')throw new AppError('INVALID_BODY',400)
   if(request.body){
     const reader=request.body.getReader()
     let timeout
     try{
       const chunk=await Promise.race([
         reader.read(),
         new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new AppError('INVALID_BODY',400)),1000)}),
       ])
       if(!chunk.done)throw new AppError('INVALID_BODY',400)
     }finally{
       clearTimeout(timeout)
       void reader.cancel().catch(()=>{})
     }
   }
   const result=await sendOwnerTelegramPilot(config,actor)
   return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
 }catch(error){
   const safe=safeError(error)
   const response=NextResponse.json({error:safe.code},{
     status:safe.status,headers:PRIVATE_HEADERS,
   })
   return auth?auth.apply(response):response
 }
}
export async function GET(){
 return new NextResponse('Not Found',{status:404,headers:PRIVATE_HEADERS})
}
