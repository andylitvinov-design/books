import {NextResponse} from 'next/server'
import {channelTransportReady} from '@/lib/crm/messenger-policy'
import {telegramDiagnosticPublicUrl} from '@/lib/crm/telegram-diagnostic.mjs'
import {v3CanStart} from '@/lib/crm/telegram-ai-diagnostic-v3.mjs'
import {telegramServiceRequestUrl,telegramBusinessStrategyRequestUrl} from '@/lib/assist/telegram-business-request.mjs'
import {resolveTelegramServiceEntry,isTelegramServiceDraft} from '@/lib/app/telegram-entry-url.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const headers={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
const invalid=()=>new NextResponse('Not Found',{status:404,headers})

// A click is not a submitted enquiry. Only public offer/locale codes enter
// the URL; Telegram Send and (for model processing) explicit consent remain
// required. Do not send customers to a silent personal account when the
// already-approved V3 bot is actually ready; human Business is the fallback.
export async function GET(request){
 const params=new URL(request.url).searchParams
 const keys=[...params.keys()]
 if((keys.length!==2&&keys.length!==3)||new Set(keys).size!==keys.length||
    params.getAll('service').length!==1||params.getAll('locale').length!==1||
    !params.has('service')||!params.has('locale')||
    (keys.length===3&&!params.has('offer')))return invalid()
 const service=params.get('service'),locale=params.get('locale')
 const offer=params.get('offer')
 if(offer!==null&&(offer!=='business_strategy'||service!=='business'))return invalid()
 const manual=offer==='business_strategy'
   ?telegramBusinessStrategyRequestUrl(locale)
   :telegramServiceRequestUrl(service,locale)
 if(!manual||!isTelegramServiceDraft(manual,locale))return invalid()
 const env=process.env
 let target=manual
 // Human Business chat automation and the bot are independent channels.
 // A service CTA enters the existing private bot when verified and ready.
 // Otherwise the public offer remains a manual @holistichouse draft.
 // Prefer the existing consent-gated private service bot whenever it is ready;
 // the human @holistichouse message remains the safe fallback if not.
 if(env.HH_CRM_TG_AI_V3_SCHEMA_READY==='true'&&
    channelTransportReady('telegram',env)&&v3CanStart(env)){
   const publicBot=telegramDiagnosticPublicUrl(locale,env)
   if(typeof publicBot==='string'){
     const entry=resolveTelegramServiceEntry({
       available:true,aiInterviewAvailable:true,url:publicBot.split('?')[0],
     },manual,locale,offer)
     if(entry)target=entry.href
   }
 }
 return NextResponse.redirect(target,{status:307,headers})
}
