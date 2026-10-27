import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, safeError, readBody } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import {
  freeExpressOwnerReplyStatus, sendFreeExpressOwnerReply,
} from '@/lib/practitioners/free-express-owner-reply'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'yul1'

async function handle(request, { params }) {
  let auth
  try {
    if (process.env.HH_FREE_EXPRESS_V2_ENABLED !== 'true')
      throw new AppError('FEATURE_UNAVAILABLE', 503)
    const config = getAppConfig()
    requestOrigin(request, config)
    if (request.method === 'POST') requireSameOrigin(request, config)
    else if (request.headers.get('sec-fetch-site') === 'cross-site')
      throw new AppError('ORIGIN_DENIED', 403)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    const { id } = await params
    if (request.method === 'GET') {
      const status = await freeExpressOwnerReplyStatus(config, actor, id)
      return auth.apply(NextResponse.json(status, { headers: PRIVATE_HEADERS }))
    }
    if (request.headers.get('x-hh-account-id') !== actor.id)
      throw new AppError('ACCOUNT_CHANGED', 409)
    await consumeRate(config, {op:'free-express-owner-reply',actor:actor.id}, 20, 3600)
    const body = await readBody(request, 3500)
    onlyKeys(body, ['text','operationId'])
    const receipt = await sendFreeExpressOwnerReply(config, actor, id, body)
    if (!receipt.saved) throw new AppError('SAVE_UNCONFIRMED', 503)
    return auth.apply(NextResponse.json(receipt, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, {
      status: safe.status, headers: PRIVATE_HEADERS,
    })
    return auth ? auth.apply(response) : response
  }
}
export { handle as GET, handle as POST }
