import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { authorizedFreeExpressOwnerMedia } from '@/lib/practitioners/free-express-owner'
import { freeExpressMediaStatus, downloadFreeExpressMedia } from '@/lib/practitioners/free-express-media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request, { params }) {
  let auth
  try {
    if (process.env.HH_FREE_EXPRESS_V2_ENABLED !== 'true')
      throw new AppError('FEATURE_UNAVAILABLE', 503)
    const config = getAppConfig()
    requestOrigin(request, config)
    if (request.headers.get('sec-fetch-site') === 'cross-site')
      throw new AppError('ORIGIN_DENIED', 403)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    const { id } = await params
    const row = await authorizedFreeExpressOwnerMedia(config, actor, id)
    return auth.apply(NextResponse.json(await freeExpressMediaStatus(config, row), { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
