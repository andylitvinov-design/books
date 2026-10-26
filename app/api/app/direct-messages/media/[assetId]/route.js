import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {createDirectMessages} from '@/lib/practitioners/direct-messages'
import {safeError,PRIVATE_HEADERS} from '@/lib/app/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request,{params}){
  let auth
  try {
    const config=getAppConfig()
    requestOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const {assetId}=await params
    const media=await createDirectMessages(config).attachment(actor,assetId)
    return auth.apply(NextResponse.redirect(media.url,{status:302,headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
