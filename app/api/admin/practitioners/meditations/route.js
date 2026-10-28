import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {meditationAdminList,meditationAdminModerate} from '@/lib/practitioners/meditation-studio-service'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
async function handle(request){
  if(!(await requireAdminRequest()))
    return NextResponse.json({error:'ADMIN_REQUIRED'},{status:401,headers:PRIVATE_HEADERS})
  try{
    const config=getAppConfig()
    if(request.method==='POST')requireSameOrigin(request,config)
    if(request.method==='GET')
      return NextResponse.json({items:await meditationAdminList(config)},{headers:PRIVATE_HEADERS})
    const input=await readBody(request,4000)
    return NextResponse.json(await meditationAdminModerate(config,input),{headers:PRIVATE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  }
}
export async function GET(request){return handle(request)}
export async function POST(request){return handle(request)}
