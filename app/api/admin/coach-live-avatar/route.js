import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {PRIVATE_HEADERS,readBody} from '@/lib/app/http'
import {startOwnerAvatarPilot,endOwnerSequencerPilot} from '@/lib/coaching/live-avatar-pilot-server.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=60
function json(body,status=200){return Response.json(body,{status,headers:PRIVATE_HEADERS})}
export async function POST(request){
  // No cross-origin starts, public clients, payment calls or customer recordings.
  if(request.headers.get('origin')!=='https://holistichouse.vercel.app'||!await requireAdminRequest())return json({error:'ACCESS_DENIED'},403)
  try{
    const body=await readBody(request,4096)
    if(body.action==='end'){
      await endOwnerSequencerPilot(body.receipt);return json({ended:true})
    }
    // Simli is held until the pinned SDK and lockfile are installed and reviewed.
    if(body.provider!=='sequencer')return json({error:'SIMLI_SDK_PENDING'},409)
    return json(await startOwnerAvatarPilot(body))
  }catch(error){
    const code=['FREE_PILOT_DISABLED','INVALID_PILOT_REQUEST','INVALID_RECEIPT'].includes(error?.message)?error.message:'AVATAR_UNAVAILABLE'
    return json({error:code},code==='FREE_PILOT_DISABLED'?409:400)
  }
}
