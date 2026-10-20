import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { createRequestAuth } from '../app/session.js'
import { readSavedDocument } from '../app/legacy-document-flow.js'
import { readSavedSession } from '../app/client-session-save-flow.js'
import { getClientPrescription } from '../prescriptions/service.js'
import { authorizePrescriptionRequest } from '../prescriptions/session.js'
import { authorizeCabinetRequest } from './session.js'
import { authorizeSessionGuest, readSessionViewerCookie } from './session-delivery-access.js'
import { getPublishedSessionReport } from './session-delivery-service.js'
import { validUuid } from './delivery-model.js'

const deny = () => { throw new AppError('NARRATION_UNAVAILABLE', 404) }

/**
 * Reuses the same published/source-pinned report authorization as the existing
 * client HTML/PDF reader. NEVER accepts text from the browser.
 * This function must be used again on every status and audio read, including
 * reads of previously generated recordings.
 */
export async function authorizedNarrationAnalysis(request, body, config, store) {
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

  if (!record || record.status !== 'active' ||
    record.kind === 'payment' || record.kind === 'report') deny()
  const projected = getClientPrescription(record, locale)
  if (!projected || typeof projected.analysis !== 'string' || !projected.analysis.trim()) deny()
  return { analysis: projected.analysis, principal }
}
