import {ownerDelivery,privateJson} from '@/lib/clients/delivery-http'
import {validUuid} from '@/lib/clients/delivery-model'
import {listClientSessions,getPublishedClientSession} from '@/lib/clients/session-delivery-service'
import {changeSessionGrant} from '@/lib/clients/session-delivery-access'

export const runtime='nodejs'
export const dynamic='force-dynamic'

// Never use the old whole-Cabinet or document bearer here. A new copy is valid
// only for one approved, unchanged and published consultation page.
export async function POST(request,{params}) {
  const {id}=await params
  return ownerDelivery(request,async({config,store})=>{
    if(!validUuid(id))return privateJson({error:'SESSION_NOT_PUBLISHED'},409)
    const record=await store.findById(id)
    if(!record||record.status!=='active'||!record.clientId||
      ['payment','report'].includes(record.kind))
      return privateJson({error:'SESSION_NOT_PUBLISHED'},409)
    const sources=new Set([record.id,record.consultationId].filter(Boolean))
    const candidates=(await listClientSessions(config,store,record.clientId,{publishedOnly:true}))
      .filter(row=>sources.has(row.sourceConsultationId))
    for(const row of candidates) {
      const published=await getPublishedClientSession(config,store,record.clientId,row.id)
        .catch(()=>null)
      if(published?.report?.id!==record.id)continue
      const grant=await changeSessionGrant(config,store,record.clientId,row.id,'copy')
      if(!grant.secret)return privateJson({error:'SESSION_LINK_EXPIRED'},409)
      return privateJson({selector:grant.selector,secret:grant.secret})
    }
    return privateJson({error:'SESSION_NOT_PUBLISHED'},409)
  },{body:true})
}
