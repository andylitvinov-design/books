import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { freeExpressProof, withFreeExpressRequest } from '@/lib/practitioners/free-express-enquiry'
import {
  FREE_EXPRESS_MAX_PHOTO_BYTES, freeExpressMediaStatus, uploadFreeExpressMedia,
  deleteFreeExpressMedia,
} from '@/lib/practitioners/free-express-media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'yul1'
export const maxDuration = 40

async function handle(request) {
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
    await consumeRate(config, { op: 'guest-express-media', ip }, 12, 3600)
    const row = await withFreeExpressRequest(config, proof, ({ row }) => row)
    let result
    if (request.method === 'GET') {
      result = await freeExpressMediaStatus(config, row)
    } else if (request.method === 'DELETE') {
      const body = await readBody(request, 250)
      if (!body || Object.keys(body).some(key => !['kind','referenceCode'].includes(key)))
        throw new AppError('INVALID_MEDIA_KIND', 400)
      if (body.referenceCode !== row.reference_code)
        throw new AppError('ENQUIRY_CONTINUATION_MISMATCH', 409)
      result = await deleteFreeExpressMedia(config, row, body.kind)
    } else {
      if (!request.headers.get('content-type')?.startsWith('multipart/form-data'))
        throw new AppError('INVALID_CONTENT_TYPE', 415)
      const length = Number(request.headers.get('content-length') || 0)
      if (length > FREE_EXPRESS_MAX_PHOTO_BYTES + 40000)
        throw new AppError('PHOTO_TOO_LARGE', 413)
      const form = await request.formData()
      if ([...form.keys()].some(key => !['photo','kind','consent','referenceCode'].includes(key)))
        throw new AppError('INVALID_IMAGE', 400)
      if (form.get('referenceCode') !== row.reference_code)
        throw new AppError('ENQUIRY_CONTINUATION_MISMATCH', 409)
      result = await uploadFreeExpressMedia(config, row, form.get('kind'),
        form.get('photo'), form.get('consent') === 'yes')
    }
    return NextResponse.json(result, { headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
export { handle as GET, handle as POST, handle as DELETE }
