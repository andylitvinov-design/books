import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { createReikiDonationOrders } from '@/lib/academy/reiki-donation-orders'

export const runtime = 'nodejs'
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handle(request) {
  let auth
  try {
    const config = getAppConfig()
    requestOrigin(request, config)
    if (request.method === 'POST') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const actor = await auth.verified()
    const orders = createReikiDonationOrders(config)
    await consumeRate(config, { op: 'reiki-donation', user: actor.id },
      request.method === 'POST' ? 8 : 30, 3600)
    let result
    if (request.method === 'GET') result = await orders.status(actor)
    else if (request.method === 'POST') {
      const input = await readBody(request, 2048)
      if (input?.action === 'create') result = await orders.create(actor, input)
      else if (input?.action === 'claim') result = await orders.claim(actor, input)
      else throw new AppError('INVALID_ACTION', 400)
    } else throw new AppError('INVALID_ACTION', 405)
    return auth.apply(NextResponse.json(result, { headers: PRIVATE_HEADERS }))
  } catch (error) {
    const safe = safeError(error)
    const response = NextResponse.json({ error: safe.code },
      { status: safe.status, headers: PRIVATE_HEADERS })
    return auth ? auth.apply(response) : response
  }
}
export { handle as GET, handle as POST }
