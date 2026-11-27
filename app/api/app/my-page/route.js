import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {getMyPage,changeMyPage} from '@/lib/app/my-page'
import {AppError} from '@/lib/assessments/contracts'
import {readMyPageCourses} from '@/lib/app/my-page-courses-server.js'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
async function handle(request){
 let auth
 try{
  const config=getAppConfig()
  if(request.method==='POST')requireSameOrigin(request,config)
  else requestOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.has('x-hh-account-id')&&request.headers.get('x-hh-account-id')!==actor.id)
    throw new AppError('ACCOUNT_CHANGED',403)
  await consumeRate(config,{op:'my-page-'+request.method,accountId:actor.id},request.method==='POST'?15:60,60)
  const query=new URL(request.url).searchParams
  if(request.method==='GET'&&query.has('view')){
    if(query.get('view')!=='courses'||[...query.keys()].length!==1||request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('INVALID_QUERY',400)
    return auth.apply(NextResponse.json(await readMyPageCourses(config,actor),{headers:PRIVATE_HEADERS}))
  }
  const data=request.method==='GET'
    ?{...await getMyPage(config,actor),accountId:actor.id}
    :await changeMyPage(config,actor,await readBody(request,2600))
  return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
export const GET=handle
export const POST=handle
