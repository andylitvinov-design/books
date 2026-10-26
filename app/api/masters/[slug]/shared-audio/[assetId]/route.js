import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {createDirectMessages} from '@/lib/practitioners/direct-messages'
import {safeError} from '@/lib/app/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(_request,{params}){
  try {
    const {slug,assetId}=await params
    const config=getAppConfig()
    const media=await createDirectMessages(config).publicAudio(slug,assetId)
    return NextResponse.redirect(media.url,{status:302,headers:{
      'Cache-Control':'no-store,max-age=0','Referrer-Policy':'no-referrer',
      'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex',
    }})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({error:safe.code},{status:safe.status,headers:{
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    }})
  }
}
