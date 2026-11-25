import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { consumeRate } from '@/lib/app/database'
import { serviceCommerceRuntime } from '@/lib/commerce/runtime'
import { requireCommerceAccount } from '@/lib/commerce/account-binding'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request) {
  let auth
  try {
    const config = getAppConfig()
    const origin = requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    requireCommerceAccount(request, actor)
    await consumeRate(config, { op: 'service-checkout', actor: actor.id }, 12, 600)
    const result = await serviceCommerceRuntime(config).checkout(actor, await readBody(request, 4096), origin)
    return auth.apply(NextResponse.json(result, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
