import { privateDelivery,privateJson } from '@/lib/clients/delivery-http'
import { authorizeSessionGuest,readSessionViewerCookie } from '@/lib/clients/session-delivery-access'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request,{params}) {
  const {selector}=await params
  return privateDelivery(async({config,store})=>{
    const credential=readSessionViewerCookie(request.cookies,selector)
    const {session}=await authorizeSessionGuest(config,store,selector,credential)
    return privateJson({session})
  })
}
