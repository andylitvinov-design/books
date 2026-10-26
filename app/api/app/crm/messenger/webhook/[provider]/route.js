import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { MESSENGER_CHANNELS } from '@/lib/crm/messenger-policy'
import { verifyMessengerWebhook,verifyMessengerChallenge,normalizeMessengerUpdates,ingestMessengerUpdate,processTelegramDiagnostic } from '@/lib/crm/messenger-webhook'
import { sendTelegramDiagnosticPrompt, acknowledgeTelegramDiagnosticButton } from '@/lib/crm/messenger-provider'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const rejected=()=>new NextResponse('Unauthorized',{status:401,headers:PRIVATE_HEADERS})
export async function GET(request,{params}){
  const {provider}=await params
  if(!MESSENGER_CHANNELS.includes(provider))return new NextResponse('Not Found',{status:404})
  const challenge=verifyMessengerChallenge(provider,request.url)
  return challenge===null?rejected():new NextResponse(challenge,{status:200,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}})
}
export async function POST(request,{params}){
  const {provider}=await params
  if(!MESSENGER_CHANNELS.includes(provider))return new NextResponse('Not Found',{status:404})
  let raw
  try{
    const length=Number(request.headers.get('content-length')||0)
    if(length>65536)return new NextResponse('Payload too large',{status:413})
    const data=await request.arrayBuffer()
    if(data.byteLength>65536)return new NextResponse('Payload too large',{status:413})
    raw=Buffer.from(data)
  }catch{return new NextResponse('Invalid body',{status:400})}
  if(!verifyMessengerWebhook(provider,raw,request.headers))return rejected()
  try{
    const config=getAppConfig()
    const body=JSON.parse(raw.toString('utf8'))
    const updates=normalizeMessengerUpdates(provider,body)
    for(const event of updates){
      if(provider==='telegram'){
        const intake=await processTelegramDiagnostic(event,config)
        if(intake.handled){
          if(event.callbackQueryId){
            // Acknowledge after the DB decision. This does not send a message.
            try{await acknowledgeTelegramDiagnosticButton({
              to:event.userId,id:event.callbackQueryId,stale:intake.stale===true,
              locale:intake.locale||event.callbackLocale||'en',
              approvedPilotGuest:intake.approvedPilotGuest===true,
            })}catch{ /* duplicate/stale callbacks never create extra messages */ }
          }
          if(intake.reply){
            // CRM and consent were committed before contacting the provider.
            // Unknown provider results are NOT automatically retried (no duplicate prompts).
            try{await sendTelegramDiagnosticPrompt({
              to:intake.to,text:intake.reply,keyboard:intake.keyboard,
              stage:intake.stage,flowVersion:intake.flowVersion,locale:intake.locale,
              approvedPilotGuest:intake.approvedPilotGuest===true,
              clearReplyKeyboard:!event.callbackQueryId &&
                /^\/(?:start|agree|situation|energy|skip|help)(?:@\w+)?(?:\s|$)/i.test(event.rawText||''),
            })}catch{ /* provider acceptance is not client delivery */ }
          }
          continue
        }
        // Callbacks are strictly diagnostic controls, never general CRM leads.
        if(event.callbackQueryId)continue
      }
      await ingestMessengerUpdate(provider,event,config)
    }
    return NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({ok:false},{status:safe.status>=500?503:400,headers:PRIVATE_HEADERS})
  }
}
