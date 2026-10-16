import 'server-only'

import { getAppConfig } from '../app/config.js'
import { deliveryEnabled } from './delivery-model.js'
import { getPublishedClientSession, listClientSessions } from './session-delivery-service.js'

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
