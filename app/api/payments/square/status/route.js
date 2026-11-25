import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { getSquareGatewayConfig, requireSquareGateway } from '@/lib/commerce/square-gateway'
import { squareCartService } from '@/lib/commerce/square-cart-service'

export const runtime = 'nodejs'
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  let auth
  try {
    const square = getSquareGatewayConfig()
    requireSquareGateway(square)
    const app = getAppConfig()
    requestOrigin(request, app)
    auth = createRequestAuth(request, app)
    const actor = await auth.verified()
    await consumeRate(app, { op: 'square-order-status', user: actor.id }, 12, 60)
    const url = new URL(request.url)
    const id = url.searchParams.get('orderId')
    const refresh = url.searchParams.get('refresh') === '1'
    if (url.searchParams.size > (refresh ? 2 : 1))
      return auth.apply(NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400, headers: PRIVATE_HEADERS }))
    const result = await squareCartService(app, square).status(actor, id, { refresh })
    return auth.apply(NextResponse.json(result, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
