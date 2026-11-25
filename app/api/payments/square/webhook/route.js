import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig } from '@/lib/app/config'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import {
  getSquareGatewayConfig, requireSquareGateway,
  squareWebhookValid, paymentIdFromSquareEvent,
} from '@/lib/commerce/square-gateway'
import { squareCartService } from '@/lib/commerce/square-cart-service'

export const runtime = 'nodejs'
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function boundedRawBody(request) {
  const size = Number(request.headers.get('content-length'))
  if (size > 262144) throw new AppError('PAYLOAD_TOO_LARGE', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new AppError('SQUARE_WEBHOOK_INVALID', 400)
  let count = 0
  const parts = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    count += value.byteLength
    if (count > 262144) {
      await reader.cancel()
      throw new AppError('PAYLOAD_TOO_LARGE', 413)
    }
    parts.push(value)
  }
  return Buffer.concat(parts)
}

export async function POST(request) {
  try {
    const square = getSquareGatewayConfig()
    requireSquareGateway(square)
    const raw = await boundedRawBody(request)
    const signature = request.headers.get('x-square-hmacsha256-signature')
    if (!squareWebhookValid(raw, signature, square))
      throw new AppError('SQUARE_SIGNATURE_INVALID', 403)
    let event
    try { event = JSON.parse(raw.toString('utf8')) }
    catch { throw new AppError('SQUARE_WEBHOOK_INVALID', 400) }
    const paymentId = paymentIdFromSquareEvent(event, square)
    if (!paymentId) return NextResponse.json({ received: true, handled: false }, { headers: PRIVATE_HEADERS })
    const result = await squareCartService(getAppConfig(), square).verifiedWebhookEvent(event, paymentId)
    return NextResponse.json({ received: true, handled: result.handled }, { headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
