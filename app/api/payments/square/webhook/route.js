import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig } from '@/lib/app/config'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import {
  getSquareGatewayConfig, getSquareWalletGatewayConfig, requireSquareGateway,
  squareWebhookValid, paymentIdFromSquareEvent, squareApiRequest,
} from '@/lib/commerce/square-gateway'
import { squareCartService } from '@/lib/commerce/square-cart-service'
import { walletSettings } from '@/lib/wallet/model'
import { createWalletService } from '@/lib/wallet/service'

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
    const servicesSquare = getSquareGatewayConfig()
    const walletSquare = getSquareWalletGatewayConfig()
    // Existing service orders and arbitrary CAD wallet top-ups share one
    // merchant-signed webhook, but each retains independent approval gates.
    const square = servicesSquare.enabled ? servicesSquare : walletSquare
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
    const config = getAppConfig()
    if (servicesSquare.enabled) {
      const result = await squareCartService(config, servicesSquare).verifiedWebhookEvent(event, paymentId)
      if (result.handled)
        return NextResponse.json({ received: true, handled: true }, { headers: PRIVATE_HEADERS })
    }
    const wallet = walletSettings()
    if (!wallet.enabled || !wallet.squareEnabled || !walletSquare.enabled)
      return NextResponse.json({ received: true, handled: false }, { headers: PRIVATE_HEADERS })
    // Never accept the event's reported amount/status. Fetch the exact Payment
    // from the verified merchant after HMAC validation and reconcile atomically.
    const payment = await squareApiRequest(walletSquare, 'GET', '/v2/payments/' + paymentId)
    const result = await createWalletService(config).verifiedSquarePayment(payment?.payment, walletSquare)
    return NextResponse.json({ received: true, handled: result.handled }, { headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
