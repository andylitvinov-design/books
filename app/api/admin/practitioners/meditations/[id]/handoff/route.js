import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getAppConfig} from '@/lib/app/config'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {meditationApprovedHandoff,meditationMediaLocation} from '@/lib/practitioners/meditation-studio-service'
import {consumeRate} from '@/lib/app/database'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(request,{params}){
  if(!(await requireAdminRequest()))
    return NextResponse.json({error:'ADMIN_REQUIRED'},{status:401,headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig(),{id}=await params
    const meta=await meditationApprovedHandoff(config,id)
    const requested=new URL(request.url).searchParams.get('download')==='1'
    if(!requested)return NextResponse.json(meta,{headers:PRIVATE_HEADERS})
    await consumeRate(config,{op:'meditation-owner-handoff'},12,3600)
    const location=await meditationMediaLocation(config,{id,admin:true,video:meta.video})
    // Same-origin streaming handoff avoids disclosing a signed Storage bearer URL
    // and works when Safari refuses a cross-origin fetch of a video object.
    const upstream=await fetch(location,{cache:'no-store',redirect:'error',
      signal:AbortSignal.timeout(90000)})
    if(!upstream.ok||!upstream.body||
      (upstream.headers.get('content-type')||'').split(';')[0]!==meta.mime)
      return NextResponse.json({error:'MEDITATION_STORAGE_UNAVAILABLE'},{status:503,headers:PRIVATE_HEADERS})
    const length=upstream.headers.get('content-length')
    if(length!==null&&Number(length)!==meta.bytes){
      await upstream.body.cancel().catch(()=>{})
      return NextResponse.json({error:'MEDITATION_MEDIA_MISMATCH'},{status:409,headers:PRIVATE_HEADERS})
    }
    return new Response(upstream.body,{status:200,headers:{...PRIVATE_HEADERS,
      'Content-Type':meta.mime,'Content-Length':String(meta.bytes),
      'Content-Disposition':'attachment; filename="meditation.'+(meta.mime==='video/webm'?'webm':'mp4')+'"'}})
  }catch(error){
    const {status,code}=safeError(error)
    return NextResponse.json({error:code},{status,headers:PRIVATE_HEADERS})
  }
}
