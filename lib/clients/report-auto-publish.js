import 'server-only'

import { getAppConfig } from '../app/config.js'
import { deliveryEnabled } from './delivery-model.js'
import {
  createClientSession,
  getOwnerSession,
  saveOwnerDraft,
  publishClientSession,
  getPublishedClientSession,
  listClientSessions,
} from './session-delivery-service.js'
import { synchronizeSavedReport } from '../consultations/synchronize-saved-report.js'

/**
 * Called only from an authenticated practitioner "Save" server action.
 * This publishes to the PRIVATE, scoped client session, not a public page.
 * A failure NEVER turns into a "published" success message.
 */
export async function autoPublishSavedClientReport(record,store) {
  if (!record || ['payment','report'].includes(record.kind) || record.status!=='active')
    return {status:'skipped'}
  if (!record.clientId) return {status:'unlinked'}
  if (!deliveryEnabled()) return {status:'unavailable'}
  try {
    return await synchronizeSavedReport(record,{
      store,config:getAppConfig(),
      operations:{createClientSession,getOwnerSession,saveOwnerDraft,
        publishClientSession,getPublishedClientSession},
    })
  } catch (error) {
    // No names, prescriptions, identifiers, links or tokens in logs.
    console.error('CLIENT_REPORT_AUTO_PUBLISH_FAILED',error?.code||'DELIVERY_ERROR')
    return {status:'failed'}
  }
}


/**
 * Read-only status for admin pages. Never trust ?publication=published to claim
 * delivery: the saved document must still match the sealed published snapshot.
 */
export async function inspectSavedClientReportPublication(record,store) {
  if (!record || ['payment','report'].includes(record.kind) || record.status!=='active')
    return 'skipped'
  if(!record.clientId) return 'unlinked'
  if(!deliveryEnabled()) return 'unavailable'
  try {
    const config=getAppConfig()
    const sources=new Set([record.id,record.consultationId].filter(Boolean))
    const sessions=(await listClientSessions(config,store,record.clientId,{publishedOnly:true}))
      .filter(item=>sources.has(item.sourceConsultationId))
    let stale=false
    for(const row of sessions){
      const published=await getPublishedClientSession(config,store,record.clientId,row.id).catch(()=>null)
      if(published?.report?.id===record.id) return 'published'
      if(published && !published.report) stale=true
    }
    return stale?'stale':'not-published'
  }catch {
    return 'unavailable'
  }
}
