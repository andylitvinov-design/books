import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {createPractitionerCourseRepository} from '@/lib/practitioners/course-repository'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError,requireUUID} from '@/lib/assessments/contracts'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(request,{params}){
 let auth
 try{
  const {id}=await params
  requireUUID(id)
  const config=getAppConfig()
  const repo=createPractitionerCourseRepository(config)
  let asset=await repo.publicAsset(id)
  if(!asset){
   auth=createRequestAuth(request,config)
   let actor
   try{actor=await auth.verified()}catch{throw new AppError('COURSE_MEDIA_NOT_FOUND',404)}
   asset=await repo.ownAsset(actor,id)
  }
  if(!asset)throw new AppError('COURSE_MEDIA_NOT_FOUND',404)
  const url=await repo.signedAssetUrl(asset)
  const res=NextResponse.redirect(url,302)
  Object.entries(PRIVATE_HEADERS).forEach(([key,value])=>res.headers.set(key,value))
  res.headers.set('Content-Security-Policy',"default-src 'none'; sandbox")
  return auth?auth.apply(res):res
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
