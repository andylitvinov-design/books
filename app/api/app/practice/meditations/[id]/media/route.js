import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {createPractitionerRepository} from '@/lib/practitioners/repository'
import {meditationMediaLocation} from '@/lib/practitioners/meditation-studio-service'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(request,{params}){
  let auth
  try {
    const config=getAppConfig()
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    await createPractitionerRepository(config).requireActivated(actor)
    const {id}=await params
    const url=await meditationMediaLocation(config,{id,actor,video:new URL(request.url).searchParams.get('video')==='1'})
    return auth.apply(NextResponse.redirect(url,{status:302,headers:{...PRIVATE_HEADERS}}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
