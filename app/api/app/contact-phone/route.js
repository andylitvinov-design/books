import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {createClientPhoneRepository} from '@/lib/app/client-phone-repository'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handler(request){
 let auth
 try{
  const config=getAppConfig()
  requestOrigin(request,config)
  if(request.method==='POST')requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)
   throw new AppError('ACCOUNT_CHANGED',409)
  const store=createClientPhoneRepository(config)
  let data
  if(request.method==='GET'){
   const query=new URL(request.url).searchParams
   if([...query.keys()].length)throw new AppError('INVALID_PHONE_REQUEST',400)
   data=await store.state(actor)
  }else{
   const body=await readBody(request,1024)
   if(body?.action==='save')data=await store.save(actor,body)
   else if(body?.action==='remove')data=await store.remove(actor,body)
   else throw new AppError('INVALID_PHONE_REQUEST',400)
  }
  return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const res=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(res):res
 }
}
export const GET=handler
export const POST=handler
