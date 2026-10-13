import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { syncCourseStripeWebhook, verifyStripeSignature } from '@/lib/app/course-billing'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

export async function POST(request){
  try{
    const config=getAppConfig()
    const secret=process.env.HH_STRIPE_WEBHOOK_SECRET
    const key=process.env.HH_STRIPE_SECRET_KEY||''
    if(!secret||!secret.startsWith('whsec_')||!key||(
      process.env.VERCEL_ENV==='production'&&!key.startsWith('sk_live_')))
      return NextResponse.json({error:'BILLING_NOT_CONFIGURED'},{status:503,headers:PRIVATE_HEADERS})
    const raw=await request.text()
    if(raw.length>2000000||!verifyStripeSignature(raw,request.headers.get('stripe-signature'),secret))
      return NextResponse.json({error:'UNVERIFIED_PAYMENT_EVENT'},{status:400,headers:PRIVATE_HEADERS})
    let event
    try{event=JSON.parse(raw)}catch{
      return NextResponse.json({error:'INVALID_PAYMENT_EVENT'},{status:400,headers:PRIVATE_HEADERS})
    }
    const result=await syncCourseStripeWebhook(config,event)
    return NextResponse.json({received:true,...result},{headers:PRIVATE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  }
}
