import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {listPersonalVideos,createPersonalVideoUpload} from '@/lib/app/personal-videos'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request,write=false){
  let auth
  try{
    const config=getAppConfig()
    if(write)requireSameOrigin(request,config)
    else requestOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.has('x-hh-account-id') &&
      request.headers.get('x-hh-account-id')!==actor.id)
      return auth.apply(NextResponse.json({error:'ACCOUNT_CHANGED'},{status:403,headers:PRIVATE_HEADERS}))
    await consumeRate(config,{op:write?'personal-video-upload':'personal-video-list',accountId:actor.id},
      write?5:60,60)
    const data=write
      ? await createPersonalVideoUpload(config,actor,await readBody(request,4096))
      : {videos:await listPersonalVideos(config,actor)}
    return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export async function GET(request){return handle(request)}
export async function POST(request){return handle(request,true)}
