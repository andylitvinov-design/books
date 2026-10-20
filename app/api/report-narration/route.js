import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { readSavedDocument } from '@/lib/app/legacy-document-flow'
import { readSavedSession } from '@/lib/app/client-session-save-flow'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { getClientPrescription } from '@/lib/prescriptions/service'
import { authorizePrescriptionRequest } from '@/lib/prescriptions/session'
import { authorizeCabinetRequest } from '@/lib/clients/session'
import { authorizeSessionGuest, readSessionViewerCookie } from '@/lib/clients/session-delivery-access'
import { getPublishedSessionReport } from '@/lib/clients/session-delivery-service'
import { smallJson, privateError } from '@/lib/clients/delivery-http'
import { PRIVATE_HEADERS } from '@/lib/app/http'
import { validUuid } from '@/lib/clients/delivery-model'
import { splitApprovedAnalysis, validNarrationRequest } from '@/lib/clients/report-narration-model'
import { narrationEnabled, synthesizeApprovedReportPart } from '@/lib/clients/report-narration-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const deny = () => { throw new AppError('NARRATION_UNAVAILABLE', 404) }
const privateHash = parts => createHash('sha256').update(JSON.stringify(parts)).digest('hex')

// Never accept report text from the browser. Re-read the exact published or
// account-bound document, under the same credential and revision checks as
// its existing private HTML/PDF viewer.
async function authorizedAnalysis(request, body, config, store) {
  const { scope, selector, sessionId, id, locale } = body
  let record, principal
  if (scope === 'guest-session') {
    if (typeof selector !== 'string') deny()
    const access = await authorizeSessionGuest(config, store, selector,
      readSessionViewerCookie(request.cookies, selector))
    if (!access.session.report) deny()
    record = await getPublishedSessionReport(config, store, access.clientId, access.sessionId)
    principal = ['guest', access.grantId]
  } else if (scope === 'cabinet-session') {
    if (typeof selector !== 'string' || !validUuid(sessionId)) deny()
    const access = await authorizeCabinetRequest(selector)
    if (!access) deny()
    record = await getPublishedSessionReport(config, store, access.client.id, sessionId)
    principal = ['cabinet', access.client.id]
  } else if (scope === 'saved-session') {
    if (!validUuid(id)) deny()
    const actor = await createRequestAuth(request, config).verified()
    const saved = await readSavedSession(config, store, actor, id, { markOpened: false })
    if (!saved.session.report) deny()
    record = await getPublishedSessionReport(config, store, saved.source.clientId, saved.source.sessionId)
    principal = ['app', actor.id]
  } else if (scope === 'legacy-document') {
    if (typeof selector !== 'string') deny()
    record = await authorizePrescriptionRequest(selector)
    principal = ['legacy', selector]
  } else if (scope === 'cabinet-document') {
    if (typeof selector !== 'string' || !validUuid(id)) deny()
    const access = await authorizeCabinetRequest(selector, id)
    if (!access) deny()
    record = access.record
    principal = ['cabinet', access.client.id]
  } else if (scope === 'saved-document') {
    if (!validUuid(id)) deny()
    const actor = await createRequestAuth(request, config).verified()
    const saved = await readSavedDocument(config, store, actor, id, locale)
    if (['invoice', 'receipt'].includes(saved.kind)) deny()
    const analysis = saved.document?.analysis
    if (typeof analysis !== 'string' || !analysis.trim()) deny()
    return { analysis, principal: ['app', actor.id] }
  } else deny()

  if (!record || record.status !== 'active'
    || record.kind === 'payment' || record.kind === 'report') deny()
  const projected = getClientPrescription(record, locale)
  if (!projected || typeof projected.analysis !== 'string' || !projected.analysis.trim()) deny()
  return { analysis: projected.analysis, principal }
}

export async function POST(request) {
  try {
    const config = getAppConfig()
    requireSameOrigin(request, config)
    if (!narrationEnabled()) throw new AppError('NARRATION_DISABLED', 503)
    const body = await smallJson(request, 1024)
    if (!validNarrationRequest(body)) throw new AppError('NARRATION_INVALID_REQUEST', 400)
    const store = getPrescriptionStore()
    if (!store?.consumeAccessAttempt) throw new AppError('NARRATION_UNAVAILABLE', 503)
    const { analysis, principal } = await authorizedAnalysis(request, body, config, store)
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
