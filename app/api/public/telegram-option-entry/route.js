import {NextResponse} from 'next/server'
import {channelTransportReady,telegramPublicDiagnosticReady} from '@/lib/crm/messenger-policy'
import {telegramDiagnosticPublicUrl} from '@/lib/crm/telegram-diagnostic.mjs'
import {v3CanStart} from '@/lib/crm/telegram-ai-diagnostic-v3.mjs'
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
   channelTransportReady('telegram',env)&&v3CanStart(env)){
  const url=new URL(publicUrl)
  if(url.origin==='https://t.me'&&/^\/[A-Za-z0-9_]{5,32}$/.test(url.pathname)&&
     /bot$/i.test(url.pathname)&&url.searchParams.get('start')==='hhreview_'+offer.locale)
   return NextResponse.redirect(url.origin+url.pathname+'?start=hhitem_'+offer.id+'_'+offer.locale,{status:307,headers})
 }
 // The bot is not public-ready; retain an honest manual first-party enquiry.
 // No unknown provider, private message, payment or user data in this URL.
 const prefix=offer.locale==='ru'?'Здравствуйте! Меня интересует «':
   offer.locale==='es'?'Hola. Me interesa «':'Hello! I am interested in “'
 const suffix=offer.locale==='ru'?'». Подскажите, как оформить запрос.':
   offer.locale==='es'?'». ¿Cómo puedo solicitarlo?':'”. How can I request this service?'
 return NextResponse.redirect('https://t.me/holistichouse?text='+encodeURIComponent(prefix+offer.title+suffix),{status:307,headers})
}
