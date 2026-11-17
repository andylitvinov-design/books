import {NextResponse} from 'next/server'
import {telegramServiceRequestUrl} from '@/lib/assist/telegram-business-request.mjs'
import {isTelegramServiceDraft} from '@/lib/app/telegram-entry-url.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const headers={'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}
const invalid=()=>new NextResponse('Not Found',{status:404,headers})

// Explicit service clicks stay with the human @holistichouse account.
// The existing signed Telegram Business secretary may answer when authorized;
// never divert a customer to a separate /start bot based on a backend flag.
// Opening this URL is not consent, a CRM lead, a booked order, or payment.
export async function GET(request){
 const params=new URL(request.url).searchParams
 if([...params.keys()].length!==2||
    params.getAll('service').length!==1||params.getAll('locale').length!==1||
    !params.has('service')||!params.has('locale'))return invalid()
 const service=params.get('service'),locale=params.get('locale')
 const manual=telegramServiceRequestUrl(service,locale)
 if(!manual||!isTelegramServiceDraft(manual,locale))return invalid()
 return NextResponse.redirect(manual,{status:307,headers})
}
