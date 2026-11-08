import {NextResponse} from 'next/server'
import {AppError} from '@/lib/assessments/contracts'
import {getAppConfig,requireSameOrigin,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {communityVideoState,communityPreview,submitCommunityVideo,withdrawCommunityVideo}
 from '@/lib/app/community-video-publishing'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=60
async function handle(request,{params}){
 let auth
 try{
  const config=getAppConfig()
  if(request.method==='GET')requestOrigin(request,config)
  else requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.has('x-hh-account-id')&&request.headers.get('x-hh-account-id')!==actor.id)
   throw new AppError('ACCOUNT_CHANGED',403)
  const {id}=await params
  await consumeRate(config,{op:'community-video-'+request.method,accountId:actor.id},
   request.method==='GET'?40:6,60)
  let data
  if(request.method==='GET')data=await communityVideoState(config,actor,id)
  else if(request.method==='DELETE')data=await withdrawCommunityVideo(config,actor,id)
  else if(request.method==='POST'){
   const body=await readBody(request,12000)
   if(body.action==='preview')data={preview:await communityPreview(config,actor,id,body)}
   else if(body.action==='request')data=await submitCommunityVideo(config,actor,id,body)
   else throw new AppError('INVALID_ACTION',400)
  }else throw new AppError('NOT_FOUND',404)
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
