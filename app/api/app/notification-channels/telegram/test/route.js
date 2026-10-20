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
   // This action has no parameters. Reject even streamed request bodies
   // without buffering user-controlled bytes into server memory.
   if(request.body!==null||Number(request.headers.get('content-length')||0)>0)
     throw new AppError('INVALID_BODY',400)
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
