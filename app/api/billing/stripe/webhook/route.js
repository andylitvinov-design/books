import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { getBillingConfig, requireBillingProvider } from '@/lib/billing/config'
import { createStripeProvider } from '@/lib/billing/stripe-provider'
import { createBillingService } from '@/lib/billing/service'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { getCommerceConfig } from '@/lib/commerce/config'
import { handleServiceStripeEvent } from '@/lib/commerce/runtime'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
async function rawBody(request) {
  if (Number(request.headers.get('content-length')) > 262144) throw new AppError('PAYLOAD_TOO_LARGE', 413)
  const reader = request.body?.getReader(), chunks = []
  if (!reader) throw new AppError('INVALID_BODY', 400)
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
    const appConfig = getAppConfig(), config = getBillingConfig(), commerce = getCommerceConfig()
    // Signature readiness is independent of either recurring or one-time prices.
    const signatureConfig = config.configured ? config : { ...config, ...commerce }
    requireBillingProvider(signatureConfig)
    const provider = createStripeProvider(signatureConfig)
    const event = provider.verifyWebhook(await rawBody(request), request.headers.get('stripe-signature') || '')
    const isPaymentCheckout = event.type.startsWith('checkout.session.') && event.data?.object?.mode === 'payment'
    const isChargeEvent = event.type === 'charge.refunded' || event.type.startsWith('charge.dispute.')
    if (isPaymentCheckout || isChargeEvent) {
      const commerceResult = await handleServiceStripeEvent(event, { appConfig })
      if (commerceResult.handled) return NextResponse.json({ received: true, ...commerceResult }, { headers: PRIVATE_HEADERS })
      if (isPaymentCheckout) throw new AppError('SERVICE_PAYMENT_RECONCILIATION_REQUIRED', 503)
    }
    const result = await createBillingService(appConfig, { config, provider }).handleVerifiedEvent(event)
    return NextResponse.json(result, { headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
