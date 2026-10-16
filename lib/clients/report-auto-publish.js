import 'server-only'

import { getAppConfig } from '../app/config.js'
import { deliveryEnabled } from './delivery-model.js'
import {
  createClientSession,
  getOwnerSession,
  saveOwnerDraft,
  publishClientSession,
  getPublishedClientSession,
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
