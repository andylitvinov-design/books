import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { consumeRate } from '@/lib/app/database'
import { AppError } from '@/lib/assessments/contracts'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { buildCoachingDiagnosticEnquiry } from '@/lib/coaching/diagnostic-enquiry.mjs'
import { createPublicServiceEnquiry } from '@/lib/practitioners/public-service-enquiry'
import { verifyTelegramCoachingHandoff } from '@/lib/coaching/telegram-handoff.mjs'

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
    // Only a real signed Telegram conversation gets linked to the existing
    // CRM lead. A bare topic/query/referrer cannot establish identity.
    const handoff=raw?.handoff===undefined?null:verifyTelegramCoachingHandoff(raw.handoff,config)
    if(raw?.handoff!==undefined&&!handoff)throw new AppError('INVALID_TELEGRAM_HANDOFF',409)
    const {handoff:unusedHandoff,...form}=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}
    let input
    try { input=buildCoachingDiagnosticEnquiry(form,{confirmedTelegramHandoff:Boolean(handoff)}) }
    catch { throw new AppError('INVALID_COACHING_ENQUIRY', 400) }
    if(handoff&&(
      handoff.locale!==input.locale||
      // Public form selects an exact nonclinical topic; token topic may map to
      // a broader website category only through a fixed allowlist.
      !(['business','wellbeing','relationships','other'].includes(handoff.topic))
    ))throw new AppError('INVALID_TELEGRAM_HANDOFF',409)
    const result = await createPublicServiceEnquiry(config,input,{linkedTelegram:handoff})
    return NextResponse.json(result, { status: 201, headers: PRIVATE_HEADERS })
  } catch (error) {
    const safe = safeError(error)
    return NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
  }
}
