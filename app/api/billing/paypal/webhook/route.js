import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { getAppConfig } from '@/lib/app/config'
import { getCommerceConfig, requireCommerce } from '@/lib/commerce/config'
import { createPayPalCommerceProvider } from '@/lib/commerce/paypal-provider'
import { handleServicePayPalEvent } from '@/lib/commerce/runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function bodyLimited(request) {
  const sizeHeader = Number(request.headers.get('content-length'))
  if (Number.isFinite(sizeHeader) && sizeHeader > 262144) throw new AppError('PAYLOAD_TOO_LARGE', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new AppError('PAYPAL_WEBHOOK_INVALID', 400)
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 262144) { await reader.cancel(); throw new AppError('PAYLOAD_TOO_LARGE', 413) }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}
export async function POST(request) {
  try {
    const commerce = getCommerceConfig()
    requireCommerce(commerce)
    if (commerce.provider !== 'paypal') throw new AppError('PAYPAL_WEBHOOK_UNAVAILABLE', 503)
    const provider = createPayPalCommerceProvider(commerce)
    const verified = await provider.verifyWebhook(await bodyLimited(request), request.headers)
    const result = await handleServicePayPalEvent(verified, { appConfig: getAppConfig() })
    const payable = /^(CHECKOUT\.ORDER\.|PAYMENT\.CAPTURE\.|CUSTOMER\.DISPUTE\.)/.test(verified.type)
    if (!result.handled && payable) throw new AppError('SERVICE_PAYMENT_RECONCILIATION_REQUIRED', 503)
    return NextResponse.json({ received: true, ...result }, { headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
