import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { getSquareGatewayConfig, requireSquareGateway } from '@/lib/commerce/square-gateway'
import { squareCartService } from '@/lib/commerce/square-cart-service'

export const runtime = 'nodejs'
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request) {
  let auth
  try {
    const square = getSquareGatewayConfig()
    requireSquareGateway(square)
    const app = getAppConfig()
    const origin = requireSameOrigin(request, app)
    auth = createRequestAuth(request, app)
    const actor = await auth.verified()
    await consumeRate(app, { op: 'square-cart-checkout', user: actor.id }, 5, 3600)
    const body = await readBody(request, 2048)
    const result = await squareCartService(app, square).checkout(actor, body, origin)
    return auth.apply(NextResponse.json(result, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
