import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { smallJson, privateError } from '@/lib/clients/delivery-http'
import { PRIVATE_HEADERS } from '@/lib/app/http'
import { splitApprovedAnalysis, validNarrationRequest } from '@/lib/clients/report-narration-model'
import { authorizedNarrationAnalysis } from '@/lib/clients/report-narration-access'
import { narrationEnabled, synthesizeApprovedReportPart } from '@/lib/clients/report-narration-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const privateHash = parts => createHash('sha256').update(JSON.stringify(parts)).digest('hex')

export async function POST(request) {
  try {
    const config = getAppConfig()
    requireSameOrigin(request, config)
    if (!narrationEnabled()) throw new AppError('NARRATION_DISABLED', 503)
    const body = await smallJson(request, 1024)
    if (!validNarrationRequest(body)) throw new AppError('NARRATION_INVALID_REQUEST', 400)
    const store = getPrescriptionStore()
    if (!store?.consumeAccessAttempt) throw new AppError('NARRATION_UNAVAILABLE', 503)
    const { analysis, principal } = await authorizedNarrationAnalysis(request, body, config, store)
    const parts = splitApprovedAnalysis(analysis)
    if (!parts.length || body.part >= parts.length) deny()
    // Each click costs API credits. Scope a conservative rolling daily quota
    // to the verified viewer AND to this one private report.
    const personKey = privateHash(['hh-narration-v1', ...principal])
    const reportKey = privateHash(['hh-narration-report-v1', body.scope,
      body.selector || '', body.id || '', body.sessionId || ''])
    if (!await store.consumeAccessAttempt(personKey, 40, 86400)
      || !await store.consumeAccessAttempt(reportKey, 20, 86400))
      throw new AppError('NARRATION_LIMIT', 429)
    const result = await synthesizeApprovedReportPart(parts[body.part], body.locale)
    return new NextResponse(result.bytes, { status: 200, headers: {
      ...PRIVATE_HEADERS,
      'Content-Type': result.type,
      'Content-Length': String(result.bytes.length),
      'Content-Disposition': 'inline',
      'X-Report-Narration-Parts': String(parts.length),
      'Accept-Ranges': 'none',
    } })
  } catch(error) {
    return privateError(error)
  }
}
