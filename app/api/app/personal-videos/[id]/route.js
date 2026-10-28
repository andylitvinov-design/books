import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {personalVideoReadUrl,completePersonalVideoUpload,deletePersonalVideo} from '@/lib/app/personal-videos'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request,{params}){
  let auth
  try{
    const config=getAppConfig()
    if(request.method==='GET')requestOrigin(request,config)
    else requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.has('x-hh-account-id') &&
      request.headers.get('x-hh-account-id')!==actor.id)
      return auth.apply(NextResponse.json({error:'ACCOUNT_CHANGED'},{status:403,headers:PRIVATE_HEADERS}))
    const {id}=await params
    await consumeRate(config,{op:'personal-video-'+request.method,accountId:actor.id},30,60)
    const data=request.method==='GET'
      ? await personalVideoReadUrl(config,actor,id)
      : request.method==='POST'
        ? {video:await completePersonalVideoUpload(config,actor,id)}
        : await deletePersonalVideo(config,actor,id)
    return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export async function GET(request,ctx){return handle(request,ctx)}
export async function POST(request,ctx){return handle(request,ctx)}
export async function DELETE(request,ctx){return handle(request,ctx)}
