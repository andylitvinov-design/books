import {NextResponse} from 'next/server'
import {channelTransportReady,telegramPublicDiagnosticReady} from '@/lib/crm/messenger-policy'
import {telegramDiagnosticPublicUrl} from '@/lib/crm/telegram-diagnostic.mjs'
import {v3ServiceIntakeReady} from '@/lib/crm/telegram-ai-diagnostic-v3.mjs'
import {telegramServiceOption} from '@/lib/assist/telegram-service-options.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
const reject=()=>new NextResponse('Not Found',{status:404,headers})
export async function GET(request){
 const params=new URL(request.url).searchParams
 if([...params.keys()].length!==2||params.getAll('offer').length!==1||
    params.getAll('locale').length!==1)return reject()
 const offer=telegramServiceOption(params.get('offer'),params.get('locale'))
 if(!offer)return reject()
 const env=process.env
 const publicUrl=telegramDiagnosticPublicUrl(offer.locale,env)
 if(typeof publicUrl==='string'&&telegramPublicDiagnosticReady(env)&&
   env.HH_CRM_TG_AI_V3_SCHEMA_READY==='true'&&
   channelTransportReady('telegram',env)&&v3ServiceIntakeReady(env)){
  const url=new URL(publicUrl)
  if(url.origin==='https://t.me'&&/^\/[A-Za-z0-9_]{5,32}$/.test(url.pathname)&&
     /bot$/i.test(url.pathname)&&url.searchParams.get('start')==='hhreview_'+offer.locale)
   return NextResponse.redirect(url.origin+url.pathname+'?start=hhitem_'+offer.id+'_'+offer.locale,{status:307,headers})
 }
 // Do not quietly leave the selected Wave-bot journey for a different chat.
 // No enquiry was sent; the same bot entry can be retried after availability returns.
 const message=offer.locale==='ru'?'Ali временно недоступен. Повторите запрос позже. Заявка не отправлена.':
   offer.locale==='es'?'Ali no está disponible ahora. Inténtalo más tarde. No se envió ninguna solicitud.':
   'Ali is temporarily unavailable. Please try again later. No request was submitted.'
 return new NextResponse(message,{status:503,headers:{...headers,
   'Content-Type':'text/plain; charset=utf-8','Retry-After':'60'}})
}
