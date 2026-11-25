import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { databasePool } from '@/lib/app/database'
import { verifyResendWebhook } from '@/lib/crm/email'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

export async function POST(request) {
  // Bounce/complaint suppression must remain active even when outbound sends are paused.
  const secret=process.env.HH_CRM_RESEND_WEBHOOK_SECRET
  if (!secret?.startsWith('whsec_')) return new NextResponse(null,{status:503})
  const text=await request.text()
  let parsed
  try { parsed=verifyResendWebhook(text,request.headers,secret) }
  catch { return new NextResponse(null,{status:400}) }
  const event=parsed.event
  if (!['email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed','email.suppressed'].includes(event.type))
    return NextResponse.json({ok:true})
  const id=event.data?.email_id
  if (typeof id!=='string'||id.length<8||id.length>120) return new NextResponse(null,{status:400})
  try {
    const db=await databasePool(getAppConfig()).connect()
    try {
      const result=await db.query('select app_private.crm_suppress_provider_email($1,$2,$3) as matched',[id,parsed.id,event.type])
      // Retry a signed bounce/complaint if it arrives before the send receipt is saved.
      if (result.rows[0]?.matched!==true) return new NextResponse(null,{status:503})
    } finally { db.release() }
    return NextResponse.json({ok:true})
  } catch { return new NextResponse(null,{status:503}) }
}
