import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {AppError} from '@/lib/assessments/contracts'
import {createDaybookDailyRepository} from '@/lib/app/daybook-daily-repository'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request){
 let auth
 try{
  const config=getAppConfig()
  requestOrigin(request,config)
  if(request.method==='POST')requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  await consumeRate(config,{scope:'daybook-daily',method:request.method,accountId:actor.id},
    request.method==='POST'?8:40,60)
  const repo=createDaybookDailyRepository(config)
  const data=request.method==='GET'?await repo.state(actor):
   await repo.mutate(actor,await readBody(request,1300))
  return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
export const GET=handle
export const POST=handle
