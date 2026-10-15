import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {issueTrustedAdminSession} from '@/lib/prescriptions/admin-session'

export const runtime='nodejs'
export const dynamic='force-dynamic'

// One-time upgrade for practitioners who already have an unexpired /admin
// cookie from before the scoped /api/admin cookie was introduced.
export async function POST(request) {
  const origin=request.headers.get('origin')
  const fetchSite=request.headers.get('sec-fetch-site')
  if((origin&&origin!==new URL(request.url).origin)||
    (fetchSite&&fetchSite!=='same-origin'&&fetchSite!=='none'))
    return NextResponse.json({error:'FORBIDDEN'},{status:403,headers:{'Cache-Control':'no-store'}})
  if(!await requireAdminRequest())
    return NextResponse.json({error:'ADMIN_SIGN_IN_REQUIRED'},{status:401,headers:{'Cache-Control':'no-store'}})
  const response=NextResponse.json({ready:true},{headers:{'Cache-Control':'private, no-store'}})
  if(!issueTrustedAdminSession(response))
    return NextResponse.json({error:'ADMIN_SIGN_IN_REQUIRED'},{status:401,headers:{'Cache-Control':'no-store'}})
  return response
}
