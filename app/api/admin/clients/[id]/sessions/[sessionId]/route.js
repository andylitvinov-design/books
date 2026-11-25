import { ownerDelivery,privateJson } from '@/lib/clients/delivery-http'
import { getOwnerSession,saveOwnerDraft,publishClientSession,archiveClientSession } from '@/lib/clients/session-delivery-service'
import { changeSessionGrant } from '@/lib/clients/session-delivery-access'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request,{params}) {
  const {id,sessionId}=await params
  return ownerDelivery(request,async({config,store})=>
    privateJson({session:await getOwnerSession(config,store,id,sessionId)}))
}
export async function PATCH(request,{params}) {
  const {id,sessionId}=await params
  return ownerDelivery(request,async({config,store,data})=>
    privateJson(await saveOwnerDraft(config,store,id,sessionId,data)),{body:true})
}
export async function POST(request,{params}) {
  const {id,sessionId}=await params
  return ownerDelivery(request,async({config,store,data})=>{
    switch(data.action) {
      case 'publish':return privateJson(await publishClientSession(config,store,id,sessionId,data))
      case 'archive':return privateJson(await archiveClientSession(config,store,id,sessionId))
      case 'copy':case 'rotate':case 'revoke':case 'extend':
        return privateJson(await changeSessionGrant(config,store,id,sessionId,data.action,{days:data.days||30}))
      default:return privateJson({error:'INVALID_ACTION'},400)
    }
  },{body:true})
}
