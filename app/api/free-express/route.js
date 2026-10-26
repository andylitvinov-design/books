import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { freeExpressProof, freeExpressReceipt, saveFreeExpressDetails } from '@/lib/practitioners/free-express-enquiry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'yul1'

async function handler(request) {
  try {
    if (process.env.HH_FREE_EXPRESS_V2_ENABLED !== 'true')
      throw new AppError('FEATURE_UNAVAILABLE', 503)
    const config = getAppConfig()
    requestOrigin(request, config)
    if (request.method !== 'GET') requireSameOrigin(request, config)
    else if (request.headers.get('sec-fetch-site') === 'cross-site')
      throw new AppError('ORIGIN_DENIED', 403)
    const proof = freeExpressProof(request, config)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await consumeRate(config, { op: 'free-express-continuation', ip }, 24, 3600)
    const result = request.method === 'GET'
      ? await freeExpressReceipt(config, proof)
      : await saveFreeExpressDetails(config, proof, await readBody(request, 44000))
    return NextResponse.json(result, { headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
export { handler as GET, handler as POST }
