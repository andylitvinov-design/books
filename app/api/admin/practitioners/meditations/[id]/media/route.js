import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getAppConfig} from '@/lib/app/config'
import {meditationMediaLocation} from '@/lib/practitioners/meditation-studio-service'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(request,{params}){
  if(!(await requireAdminRequest()))
    return NextResponse.json({error:'ADMIN_REQUIRED'},{status:401,headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig(),{id}=await params
    const url=await meditationMediaLocation(config,{id,admin:true,video:new URL(request.url).searchParams.get('video')==='1'})
    return NextResponse.redirect(url,{status:302,headers:PRIVATE_HEADERS})
  }catch(error){
    const {status,code}=safeError(error)
    return NextResponse.json({error:code},{status,headers:PRIVATE_HEADERS})
  }
}
