import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { databasePool } from '@/lib/app/database'
import { readBody, PRIVATE_HEADERS } from '@/lib/app/http'
import { emailTokenDigest } from '@/lib/crm/email'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

// Email links carry their secret in the URL fragment, never in HTTP GET/query/logs.
export async function POST(request) {
  const generic = () => NextResponse.json({ok:true},{headers:PRIVATE_HEADERS})
  try {
    const config=getAppConfig()
    requestOrigin(request,config)
    requireSameOrigin(request,config)
    const data=await readBody(request,1024)
    if (Object.keys(data).some(k=>!['kind','token'].includes(k)) || !['verify','unsubscribe'].includes(data.kind))
      return generic()
    const digest=emailTokenDigest(data.token)
    const db=await databasePool(config).connect()
    try {
      await db.query('select app_private.crm_consume_email_token($1,$2)',[digest,data.kind])
    } finally { db.release() }
  } catch {
    // Never reveal whether a token, email, owner or CRM contact exists.
  }
  return generic()
}
