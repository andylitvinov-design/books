import {NextResponse} from 'next/server'
import {restoreAdminApiSession} from '@/lib/prescriptions/admin'

export const runtime='nodejs'
export const dynamic='force-dynamic'

// Recover the upload cookie only from a current server-backed owner session.
export async function POST(request) {
  const origin=request.headers.get('origin')
  const fetchSite=request.headers.get('sec-fetch-site')
  if((origin&&origin!==new URL(request.url).origin)||
    (fetchSite&&fetchSite!=='same-origin'&&fetchSite!=='none'))
    return NextResponse.json({error:'FORBIDDEN'},{status:403,headers:{'Cache-Control':'no-store'}})
  const response=NextResponse.json({ready:true},{headers:{'Cache-Control':'private, no-store'}})
  if(!await restoreAdminApiSession(response))
    return NextResponse.json({error:'ADMIN_SIGN_IN_REQUIRED'},{status:401,headers:{'Cache-Control':'no-store'}})
  return response
}
