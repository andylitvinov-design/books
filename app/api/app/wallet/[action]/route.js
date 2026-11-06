import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requireSameOrigin, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { createWalletService } from '@/lib/wallet/service'

export const runtime = 'nodejs'
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handle(request, { params }) {
  let auth
  try {
    const config = getAppConfig()
    const origin = requestOrigin(request, config)
    if (request.method !== 'GET') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    if (request.headers.get('x-hh-account-id') !== actor.id)
      throw new AppError('ACCOUNT_CHANGED', 409)
    const { action } = await params
    const wallet = createWalletService(config)
    let result
    if (request.method === 'GET' && action === 'status') {
      await consumeRate(config, { op: 'wallet-status', actor: actor.id }, 20, 60)
      result = await wallet.status(actor)
    } else if (request.method === 'POST' && action === 'create') {
      await consumeRate(config, { op: 'wallet-create', actor: actor.id }, 6, 3600)
      result = await wallet.create(actor, await readBody(request, 1024), origin)
    } else if (request.method === 'POST' && action === 'report') {
      await consumeRate(config, { op: 'wallet-receipt', actor: actor.id }, 10, 3600)
      result = await wallet.report(actor, await readBody(request, 1024))
    } else if (request.method === 'POST' && action === 'refresh') {
      await consumeRate(config, { op: 'wallet-refresh', actor: actor.id }, 10, 60)
      const body = await readBody(request, 512)
      if (Object.keys(body).length !== 1) throw new AppError('INVALID_BODY', 400)
      result = await wallet.refresh(actor, body.topupId)
    } else throw new AppError('NOT_FOUND', 404)
    return auth.apply(NextResponse.json(result, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
export { handle as GET, handle as POST }
