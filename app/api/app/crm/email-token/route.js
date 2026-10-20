import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { databasePool } from '@/lib/app/database'
import { readBody, PRIVATE_HEADERS } from '@/lib/app/http'
import { emailTokenDigest } from '@/lib/crm/email'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
// One-time token is supplied by a POST body, never via URL path/query/GET.
export async function POST(request) {
  const generic=(status=200)=>NextResponse.json({ok:status===200},{status,headers:PRIVATE_HEADERS})
  let config
  try { config=getAppConfig() } catch { return generic(503) }
  let digest,kind
  try {
    requestOrigin(request,config)
    requireSameOrigin(request,config)
    const data=await readBody(request,1024)
    if (Object.keys(data).some(k=>!['kind','token'].includes(k)) ||
        !['verify','unsubscribe'].includes(data.kind)) return generic()
    digest=emailTokenDigest(data.token)
    kind=data.kind
  } catch {
    // Malformed or invalid tokens must not reveal contact existence.
    return generic()
  }
  let db
  try {
    db=await databasePool(config).connect()
    await db.query('select app_private.crm_consume_email_token($1,$2)',[digest,kind])
  } catch {
    // A database outage cannot be misreported as a successful unsubscribe.
    return generic(503)
  } finally { db?.release() }
  return generic()
}
