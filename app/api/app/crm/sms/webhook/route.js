import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { databasePool } from '@/lib/app/database'
import { smsRecipientFingerprint, verifyTwilioWebhook } from '@/lib/crm/sms'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

const HEADERS={'Cache-Control':'no-store'}
const STOP=/^(?:STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT|ARRET|ARRÊT|BAJA|СТОП)$/iu

export async function POST(request){
  const secret=process.env.HH_CRM_TWILIO_AUTH_TOKEN
  const account=process.env.HH_CRM_TWILIO_ACCOUNT_SID
  if(!secret||!account)return new NextResponse(null,{status:503,headers:HEADERS})
  if(!/^application\/x-www-form-urlencoded(?:;|$)/i.test(request.headers.get('content-type')||''))
    return new NextResponse(null,{status:415,headers:HEADERS})
  if(Number(request.headers.get('content-length')||0)>16000)
    return new NextResponse(null,{status:413,headers:HEADERS})
  let payload
  try {
    const bytes=await request.arrayBuffer()
    if(bytes.byteLength>16000)throw new Error('oversized')
    payload=verifyTwilioWebhook(Buffer.from(bytes).toString('utf8'),request.headers,secret)
  }catch{return new NextResponse(null,{status:401,headers:HEADERS})}
  if(payload.get('AccountSid')!==account)return new NextResponse(null,{status:401,headers:HEADERS})
  const service=payload.get('MessagingServiceSid')
  if(service&&service!==process.env.HH_CRM_TWILIO_MESSAGING_SERVICE_SID)
    return new NextResponse(null,{status:401,headers:HEADERS})
  const sid=payload.get('MessageSid')||payload.get('SmsSid')
  const status=(payload.get('MessageStatus')||payload.get('SmsStatus')||'').toLowerCase()
  const from=payload.get('From')||''
  const isStop=STOP.test((payload.get('Body')||'').trim())
  // Never store an inbound message's text, phone or clinical details.
  if(!isStop&&!['queued','sending','sent','delivered','undelivered','failed'].includes(status))
    return new NextResponse('<Response></Response>',{status:200,headers:{...HEADERS,'Content-Type':'text/xml'}})
  try{
    const config=getAppConfig()
    const db=await databasePool(config).connect()
    try{
      if(isStop){
        const hash=smsRecipientFingerprint(from,config.encryptionKey)
        const result=await db.query('select app_private.crm_sms_record_stop($1,$2) as ok',[hash,sid])
        if(!result.rows[0]?.ok)throw new Error('STOP_NOT_RECORDED')
      }else{
        const result=await db.query('select app_private.crm_sms_status_receipt($1,$2) as ok',[sid,status])
        if(!result.rows[0]?.ok)throw new Error('STATUS_NOT_RECORDED')
      }
    }finally{db.release()}
    return new NextResponse('<Response></Response>',{status:200,headers:{...HEADERS,'Content-Type':'text/xml'}})
  }catch{return new NextResponse(null,{status:503,headers:HEADERS})}
}
