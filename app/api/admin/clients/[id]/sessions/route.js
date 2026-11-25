import { ownerDelivery,privateJson } from '@/lib/clients/delivery-http'
import { createClientSession,listClientSessions } from '@/lib/clients/session-delivery-service'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request,{params}) {
  const {id}=await params
  return ownerDelivery(request,async({config,store})=>
    privateJson({sessions:await listClientSessions(config,store,id)}))
}
export async function POST(request,{params}) {
  const {id}=await params
  return ownerDelivery(request,async({config,store,data})=>
    privateJson(await createClientSession(config,store,id,data),201),{body:true})
}
