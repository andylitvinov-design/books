import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {createAppRepository} from '@/lib/app/repository'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

// Read-only own orders. This never merges client records into CRM contacts.
export async function GET(request){
  let auth
  try{
    const config=getAppConfig()
    requestOrigin(request,config)
    if(new URL(request.url).search)throw new AppError('INVALID_QUERY',400)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const result=await createAppRepository(config).myOrderInbox(actor)
    return auth.apply(NextResponse.json({accountId:actor.id,...result},{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
