import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {getPrescriptionStore} from '@/lib/prescriptions/store'
import {readSavedSession} from '@/lib/app/client-session-save-flow'
import {privateMediaStream} from '@/lib/clients/session-delivery-storage'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {deliveryEnabled} from '@/lib/clients/delivery-model'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const fail=()=>new NextResponse(null,{status:404,headers:PRIVATE_HEADERS})
async function handle(request,{params}){
  try{
    if(!deliveryEnabled())return fail()
    const {id,assetId}=await params
    const config=getAppConfig()
    if(request.method==='POST')requireSameOrigin(request,config)
    const auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const saved=await readSavedSession(config,getPrescriptionStore(),actor,id,{markOpened:false})
    if(!saved.session.media.some(item=>item.assetId===assetId&&['audio','video','pdf'].includes(item.kind)))
      return fail()
    if(request.method==='POST')
      return auth.apply(NextResponse.json({url:'/api/app/saved-sessions/'+id+'/media/'+assetId,expiresIn:300},
        {headers:PRIVATE_HEADERS}))
    const response=await privateMediaStream(config,saved.source.clientId,saved.source.sessionId,assetId,request)
    return auth.apply(response)
  }catch{return fail()}
}
export const GET=handle
export const HEAD=handle
export const POST=handle
