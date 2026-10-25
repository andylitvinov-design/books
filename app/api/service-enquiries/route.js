import { NextResponse, after } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { createPublicServiceEnquiry } from '@/lib/practitioners/public-service-enquiry'
import { dispatchPublicServiceEnquiryTelegram } from '@/lib/app/public-enquiry-telegram'

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
    await consumeRate(config, { op: 'guest-service-enquiry', ip }, 6, 3600)
    const payload = await readBody(request, 8192)
    const result = await createPublicServiceEnquiry(config, payload)
    if (result.saved === true && result.contactPending === false) {
      // The committed enquiry is authoritative; optional provider work must
      // never turn a saved lead into a browser-side error or leak private text.
      after(async () => {
        try {
          const delivery = await dispatchPublicServiceEnquiryTelegram(config, result.id)
          if (delivery.attempted > 0 && delivery.accepted !== 1)
            console.error('HH_PUBLIC_ENQUIRY_OWNER_TG_UNCONFIRMED')
        } catch {
          console.error('HH_PUBLIC_ENQUIRY_OWNER_TG_DISPATCH_FAILED')
        }
      })
    }
    return NextResponse.json(result, { status: 201, headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
