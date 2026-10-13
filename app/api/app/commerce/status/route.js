import { NextResponse } from 'next/server'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { getAppConfig, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { serviceCheckoutStatus } from '@/lib/commerce/checkout'
import { getCommerceConfig } from '@/lib/commerce/config'
import { requireCommerceAccount } from '@/lib/commerce/account-binding'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function GET(request) {
  let auth
  try {
    const commerce = getCommerceConfig()
    const status = serviceCheckoutStatus(commerce)
    // Public catalog remains usable when payments are unconfigured. No account
    // or assessment bootstrap is needed to show it.
    if (!commerce.configured) return NextResponse.json({ ...status, accountId: null }, { headers: PRIVATE_HEADERS })
    const config = getAppConfig()
    requestOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.has('x-hh-account-id')) requireCommerceAccount(request, actor)
    return auth.apply(NextResponse.json({ ...status, accountId: actor.id }, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
