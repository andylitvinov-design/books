import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requireSameOrigin, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { consumeRate } from '@/lib/app/database'
import { createManualOrdersService } from '@/lib/billing/manual-orders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handle(request, { params }) {
  let auth
  try {
    const config = getAppConfig()
    requestOrigin(request, config)
    if (request.method !== 'GET') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED',409)
    const { action } = await params
    if (action !== 'orders') throw new AppError('NOT_FOUND',404)
    const service = createManualOrdersService(config)
    let result
    if (request.method === 'GET') {
      await consumeRate(config, { op:'manual-orders-read',owner:actor.id }, 30,60)
      result = await service.status(actor)
    } else if (request.method === 'POST') {
      await consumeRate(config, { op:'manual-orders-create',owner:actor.id }, 5,3600)
      result = await service.request(actor, await readBody(request,1024))
    } else throw new AppError('NOT_FOUND',404)
    return auth.apply(NextResponse.json(result,{ headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error:safe.code }, { status:safe.status, headers:PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
export { handle as GET, handle as POST }
