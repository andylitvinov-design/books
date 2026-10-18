import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { databasePool } from '@/lib/app/database'
import { getCrmEmailConfig, verifyResendWebhook } from '@/lib/crm/email'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

export async function POST(request) {
  const sender=getCrmEmailConfig()
  if (!sender.enabled) return new NextResponse(null,{status:503})
  const text=await request.text()
  let parsed
  try { parsed=verifyResendWebhook(text,request.headers,sender.webhookSecret) }
  catch { return new NextResponse(null,{status:400}) }
  const event=parsed.event
  if (!['email.bounced','email.complained','email.failed'].includes(event.type))
    return NextResponse.json({ok:true})
  const id=event.data?.email_id
  if (typeof id!=='string'||id.length<8||id.length>120) return new NextResponse(null,{status:400})
  try {
    const db=await databasePool(getAppConfig()).connect()
    try {
      await db.query('select app_private.crm_suppress_provider_email($1,$2,$3)',[id,parsed.id,event.type])
    } finally { db.release() }
    return NextResponse.json({ok:true})
  } catch { return new NextResponse(null,{status:503}) }
}
