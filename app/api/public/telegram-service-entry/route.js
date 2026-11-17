import {NextResponse} from 'next/server'
import {channelTransportReady} from '@/lib/crm/messenger-policy'
import {telegramDiagnosticPublicUrl} from '@/lib/crm/telegram-diagnostic.mjs'
import {v3CanStart} from '@/lib/crm/telegram-ai-diagnostic-v3.mjs'
import {telegramServiceRequestUrl} from '@/lib/assist/telegram-business-request.mjs'
import {resolveTelegramServiceEntry,isTelegramServiceDraft} from '@/lib/app/telegram-entry-url.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const headers={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
const invalid=()=>new NextResponse('Not Found',{status:404,headers})

// Only an explicit customer click reaches this handler. The URL contains
// public service and locale codes only; no customer text, CRM write or PII.
export async function GET(request){
 const params=new URL(request.url).searchParams
 if([...params.keys()].length!==2||
    params.getAll('service').length!==1||params.getAll('locale').length!==1||
    !params.has('service')||!params.has('locale'))return invalid()
 const service=params.get('service'),locale=params.get('locale')
 const manual=telegramServiceRequestUrl(service,locale)
 if(!manual||!isTelegramServiceDraft(manual,locale))return invalid()
 let target=manual
 const env=process.env
 // Personal chat when enabled; otherwise verified V3 AI bot. A missing
 // provider/model keeps the honest human chat instead of a broken bot link.
 if(env.HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true'&&
    env.HH_CRM_TG_AI_V3_SCHEMA_READY==='true'&&
    channelTransportReady('telegram',env)&&v3CanStart(env)){
   const bot=telegramDiagnosticPublicUrl(locale,env)
   if(typeof bot==='string'){
     const entry=resolveTelegramServiceEntry({
       available:true,aiInterviewAvailable:true,url:bot.split('?')[0],
     },manual,locale)
     if(entry)target=entry.href
   }
 }
 return NextResponse.redirect(target,{status:307,headers})
}
