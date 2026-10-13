import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { createBillingService } from '@/lib/billing/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
async function handle(request, { params }) {
  let auth
  try {
    const config = getAppConfig(), origin = requestOrigin(request, config)
    const { action } = await params
    if (request.method !== 'GET') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
    const service = createBillingService(config)
    let result
    if (action === 'status' && request.method === 'GET') result = await service.status(actor)
    else if (request.method === 'POST' && ['checkout', 'portal', 'cancel', 'reconcile'].includes(action)) {
      await consumeRate(config, { op: `billing-${action}`, actor: actor.id }, 12, 60)
      const body = await readBody(request, 2048)
      result = await service[action](actor, body, origin)
    } else throw new AppError('NOT_FOUND', 404)
    return auth.apply(NextResponse.json(result, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
export { handle as GET, handle as POST }
