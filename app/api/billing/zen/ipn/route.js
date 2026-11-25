import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { getCommerceConfig } from '@/lib/commerce/config'
import { verifyZenIpnPayload } from '@/lib/commerce/zen-protocol'
import { handleServiceZenEvent } from '@/lib/commerce/runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function readBoundedBody(request) {
  const reader = request.body?.getReader()
  if (!reader) throw new AppError('SERVICE_PAYMENT_INVALID', 400)
  const chunks = []
  let length = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > 32768) {
      await reader.cancel()
      throw new AppError('SERVICE_PAYMENT_INVALID', 400)
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

export async function POST(request) {
  try {
    const config = getCommerceConfig()
    if (config.provider !== 'zen' || !config.configured)
      throw new AppError('SERVICE_CHECKOUT_UNAVAILABLE', 503)
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') ||
        Number(request.headers.get('content-length') || 0) > 32768)
      throw new AppError('SERVICE_PAYMENT_INVALID', 400)
    const bytes = await readBoundedBody(request)
    // ZEN's IPN API secret authenticates the *exact received* decimal amount,
    // currency, status and merchant transaction ID. No browser return or
    // unsigned notification can mark an order paid.
    const event = verifyZenIpnPayload(bytes, config.zenIpnSecret)
    const result = await handleServiceZenEvent(event, { appConfig: getAppConfig() })
    return NextResponse.json({ received: true, ...result }, { headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
