import {NextResponse} from 'next/server'
import {getAppConfig} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {readOwnerAudioBinary} from '@/lib/clients/owner-audio-binary'
import {createPractitionerCourseRepository} from '@/lib/practitioners/course-repository'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const maxDuration=60

export async function POST(request,{params}){
 let auth
 try{
  const config=getAppConfig()
  const {assetId}=await params
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  const expectedAccount=request.headers.get('x-hh-account-id')
  if(expectedAccount&&expectedAccount!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  const body=await readOwnerAudioBinary(request)
  const repo=createPractitionerCourseRepository(config)
  const item=await repo.uploadCourseAudioBytes(actor,assetId,body)
  return auth.apply(NextResponse.json({item},{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
