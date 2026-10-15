import {privateDelivery,privateJson,smallJson} from '@/lib/clients/delivery-http'
import {createRequestAuth} from '@/lib/app/session'
import {readSavedSession} from '@/lib/app/session-save-flow'
import {privateMediaStream} from '@/lib/clients/session-delivery-storage'
export const runtime='nodejs'
export const dynamic='force-dynamic'
async function handle(request,{params}){
  const {id,assetId}=await params
  return privateDelivery(async({config,store})=>{
    if(request.method==='POST')await smallJson(request,512)
    const actor=await createRequestAuth(request,config).verified()
    const saved=await readSavedSession(config,store,actor,id,{markOpened:false})
    if(!saved.session.media.some(item=>item.assetId===assetId&&item.scope==='client'))
      return privateJson({error:'SESSION_UNAVAILABLE'},404)
    if(request.method==='POST')
      return privateJson({url:'/api/app/saved-sessions/'+id+'/media/'+assetId,expiresIn:300})
    return privateMediaStream(config,saved.clientId,saved.session.id,assetId,request)
  })
}
export const POST=handle
export const GET=handle
export const HEAD=handle
