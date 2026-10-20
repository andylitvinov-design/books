import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { consumeRate } from '@/lib/app/database'
import { serviceCommerceRuntime } from '@/lib/commerce/runtime'
import { requireCommerceAccount } from '@/lib/commerce/account-binding'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request, { params }) {
  let auth
  try {
    const config = getAppConfig()
    requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    requireCommerceAccount(request, actor)
    await consumeRate(config, { op: 'zen-service-order-refresh', actor: actor.id }, 12, 60)
    const order = await serviceCommerceRuntime(config).refreshZenOrder(actor, (await params).orderId)
    return auth.apply(NextResponse.json({ order }, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
