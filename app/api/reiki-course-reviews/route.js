import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin } from '@/lib/app/config'
import { listApprovedReikiReviews } from '@/lib/academy/reiki-public-reviews'
import { safeError } from '@/lib/app/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
const HEADERS = {
  'Cache-Control':'no-store, max-age=0',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
}
export async function GET(request) {
  try {
    const config = getAppConfig()
    requestOrigin(request,config)
    // Public projection deliberately has no name, account ID, email or draft.
    return NextResponse.json({ reviews: await listApprovedReikiReviews(config) },{headers:HEADERS})
  } catch(error) {
    const safe=safeError(error)
    return NextResponse.json({error:safe.code},{status:safe.status,headers:HEADERS})
  }
}
