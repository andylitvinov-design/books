import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {createRequestMedia} from '@/lib/practitioners/request-media'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

// Proxy bytes on the site origin: iPhone Safari can play audio even when its
// network blocks a cross-origin signed Supabase URL. Never leak a storage token.
export async function GET(request,{params}){
  let auth
  try{
    const config=getAppConfig()
    requestOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const {assetId}=await params
    const media=await createRequestMedia(config).read(actor,assetId)
    const originalRange=request.headers.get('range')
    if(originalRange&&!/^bytes=\d+-\d*$/.test(originalRange))
      throw new AppError('INVALID_RANGE',416)
    const upstream=await fetch(media.url,{
      headers:originalRange?{Range:originalRange}:{},
      redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000),
    })
    if(![200,206].includes(upstream.status)||!upstream.body)
      throw new AppError('MEDIA_STORAGE_UNAVAILABLE',503)
    const headers=new Headers(PRIVATE_HEADERS)
    headers.set('Content-Type',media.mime)
    headers.set('X-Content-Type-Options','nosniff')
    headers.set('Accept-Ranges','bytes')
    headers.set('Content-Disposition','inline')
    for(const name of ['content-length','content-range']){
      const value=upstream.headers.get(name)
      if(value)headers.set(name,value)
    }
    return auth.apply(new NextResponse(upstream.body,{status:upstream.status,headers}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
