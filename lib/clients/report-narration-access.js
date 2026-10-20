import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { createRequestAuth } from '../app/session.js'
import { transaction } from '../app/database.js'
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
  let record, principal, lineage
  if (scope === 'guest-session') {
    if (typeof selector !== 'string') deny()
    const access = await authorizeSessionGuest(config, store, selector,
      readSessionViewerCookie(request.cookies, selector))
    if (!access.session.report) deny()
    record = await getPublishedSessionReport(config, store, access.clientId, access.sessionId)
    principal = ['guest', access.grantId]
    lineage = {scope, clientId:access.clientId, sessionId:access.sessionId,
      grantId:access.grantId, grantVersion:access.grantVersion}
  } else if (scope === 'cabinet-session') {
    if (typeof selector !== 'string' || !validUuid(sessionId)) deny()
    const access = await authorizeCabinetRequest(selector)
    if (!access) deny()
    record = await getPublishedSessionReport(config, store, access.client.id, sessionId)
    principal = ['cabinet', access.client.id]
    lineage = {scope, selector, clientId:access.client.id, sessionId}
  } else if (scope === 'saved-session') {
    if (!validUuid(id)) deny()
    const actor = await createRequestAuth(request, config).verified()
    const saved = await readSavedSession(config, store, actor, id, { markOpened: false })
    if (!saved.session.report) deny()
    record = await getPublishedSessionReport(config, store, saved.source.clientId, saved.source.sessionId)
    principal = ['app', actor.id]
    lineage = {scope, accountId:actor.id, claims:actor.claims, savedId:id,
      clientId:saved.source.clientId, sessionId:saved.source.sessionId}
  } else if (scope === 'legacy-document') {
    if (typeof selector !== 'string') deny()
    record = await authorizePrescriptionRequest(selector)
    principal = ['legacy', selector]
    lineage = {scope, selector, recordId:record?.id}
  } else if (scope === 'cabinet-document') {
    if (typeof selector !== 'string' || !validUuid(id)) deny()
    const access = await authorizeCabinetRequest(selector, id)
    if (!access) deny()
    record = access.record
    principal = ['cabinet', access.client.id]
    lineage = {scope, selector, clientId:access.client.id, recordId:record?.id}
  } else if (scope === 'saved-document') {
    if (!validUuid(id)) deny()
    const actor = await createRequestAuth(request, config).verified()
    const saved = await readSavedDocument(config, store, actor, id, locale)
    if (['invoice', 'receipt'].includes(saved.kind)) deny()
    const analysis = saved.document?.analysis
    if (typeof analysis !== 'string' || !analysis.trim()) deny()
    return { analysis, principal: ['app', actor.id],
      lineage:{scope, savedId:id, accountId:actor.id, claims:actor.claims} }
  } else deny()

  if (!record || record.status !== 'active' ||
    record.kind === 'payment' || record.kind === 'report') deny()
  const projected = getClientPrescription(record, locale)
  if (!projected || typeof projected.analysis !== 'string' || !projected.analysis.trim()) deny()
  return { analysis: projected.analysis, principal, lineage }
}


/**
 * Only the server may refresh a queued report before sending its text to Mac.
 * Refuses revoked guest links, changed saved copies and expired user sessions.
 * All pointers below came from the original authenticated request and are
 * stored in the authenticated AES-GCM job payload, not in the browser.
 */
export async function currentApprovedAnalysisForWorker(config, store, lineage, locale) {
  if (!lineage || !['ru','en'].includes(locale)) deny()
  const {scope,selector,clientId,sessionId,recordId,savedId,accountId,claims}=lineage
  let record
  if (scope === 'guest-session') {
    if (!validUuid(clientId)||!validUuid(sessionId)||!validUuid(lineage.grantId)||
      !Number.isInteger(lineage.grantVersion)||lineage.grantVersion<1) deny()
    const grant=await transaction(config,null,async db=>(await db.query(
      `select g.id from app_private.client_session_share_grants g
       join app_private.client_delivery_sessions s on s.id=g.session_id and s.legacy_client_id=g.legacy_client_id
       where g.id=$1 and g.legacy_client_id=$2 and g.session_id=$3
         and g.access_version=$4 and g.revoked_at is null and g.expires_at>now()
         and s.status='published'`,
      [lineage.grantId,clientId,sessionId,lineage.grantVersion])).rows[0],{server:true})
    if (!grant) deny()
    record=await getPublishedSessionReport(config,store,clientId,sessionId)
  } else if (scope === 'cabinet-session') {
    if (!validUuid(clientId)||!validUuid(sessionId)||typeof selector!=='string')deny()
    const client=await store.findClientBySelector(selector)
    if (!client || client.id!==clientId || client.status!=='active')deny()
    record=await getPublishedSessionReport(config,store,clientId,sessionId)
  } else if (scope === 'saved-session') {
    if (!validUuid(accountId)||!validUuid(savedId)||!validUuid(clientId)||
      !validUuid(sessionId)||claims?.sub!==accountId)deny()
    const actor={id:accountId,claims}
    const saved=await readSavedSession(config,store,actor,savedId,{markOpened:false})
    if (saved.source.clientId!==clientId||saved.source.sessionId!==sessionId)deny()
    record=await getPublishedSessionReport(config,store,clientId,sessionId)
  } else if (scope === 'legacy-document') {
    if (!validUuid(recordId)||typeof selector!=='string')deny()
    record=await store.findBySelector(selector)
    if (!record || record.id!==recordId)deny()
  } else if (scope === 'cabinet-document') {
    if (!validUuid(recordId)||!validUuid(clientId)||typeof selector!=='string')deny()
    const client=await store.findClientBySelector(selector)
    if (!client || client.id!==clientId || client.status!=='active')deny()
    record=await store.findById(recordId)
    if (record?.clientId!==clientId)deny()
  } else if (scope === 'saved-document') {
    if (!validUuid(accountId)||!validUuid(savedId)||claims?.sub!==accountId)deny()
    const saved=await readSavedDocument(config,store,{id:accountId,claims},savedId,locale)
    if (['invoice','receipt'].includes(saved.kind)||
      typeof saved.document?.analysis!=='string'||!saved.document.analysis.trim())deny()
    return saved.document.analysis
  } else deny()
  if (!record||record.status!=='active'||
    ['payment','report'].includes(record.kind))deny()
  const projected=getClientPrescription(record,locale)
  if (!projected||typeof projected.analysis!=='string'||!projected.analysis.trim())deny()
  return projected.analysis
}
