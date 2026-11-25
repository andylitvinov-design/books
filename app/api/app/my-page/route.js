import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {getMyPage,changeMyPage} from '@/lib/app/my-page'
import {AppError} from '@/lib/assessments/contracts'

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
  const data=request.method==='GET'
    ?await getMyPage(config,actor)
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
