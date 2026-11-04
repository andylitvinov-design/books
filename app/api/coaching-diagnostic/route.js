import { NextResponse, after } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { consumeRate } from '@/lib/app/database'
import { AppError } from '@/lib/assessments/contracts'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { buildCoachingDiagnosticEnquiry } from '@/lib/coaching/diagnostic-enquiry.mjs'
import { createPublicServiceEnquiry } from '@/lib/practitioners/public-service-enquiry'
import { dispatchPublicServiceEnquiryTelegram } from '@/lib/app/public-enquiry-telegram'
import { readPublicEnquiryAttribution } from '@/lib/analytics/enquiry-attribution.mjs'

export const runtime = 'nodejs'
export const preferredRegion = 'yul1'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request) {
  try {
    const config = getAppConfig()
    requestOrigin(request, config)
    requireSameOrigin(request, config)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    await consumeRate(config, { op: 'guest-coaching-diagnostic', ip }, 4, 3600)
    const raw = await readBody(request, 80000)
    let input
    try { input = buildCoachingDiagnosticEnquiry(raw) }
    catch { throw new AppError('INVALID_COACHING_ENQUIRY', 400) }
    const result = await createPublicServiceEnquiry(config, input, readPublicEnquiryAttribution(request))
    if (result.saved === true) {
      // The encrypted CRM write is authoritative. A missing optional owner
      // notification cannot turn a saved coaching request into a client error.
      after(async () => {
        try {
          const delivery = await dispatchPublicServiceEnquiryTelegram(config, result.id, input.operationId)
          if (delivery.attempted > 0 && delivery.accepted !== 1)
            console.error('HH_COACHING_ENQUIRY_OWNER_TG_UNCONFIRMED')
        } catch {
          console.error('HH_COACHING_ENQUIRY_OWNER_TG_DISPATCH_FAILED')
        }
      })
    }
    return NextResponse.json(result, { status: 201, headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
