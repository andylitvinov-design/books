import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {readBody,PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {AppError} from '@/lib/assessments/contracts'
import {createPractitionerCourseRepository} from '@/lib/practitioners/course-repository'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request){
 let auth
 try{
  const config=getAppConfig()
  if(request.method!=='GET')requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  const expectedAccount=request.headers.get('x-hh-account-id')
  if(expectedAccount&&expectedAccount!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  await consumeRate(config,{op:'practice-courses',actor:actor.id},80,60)
  const repo=createPractitionerCourseRepository(config)
  if(request.method==='GET')
    return auth.apply(NextResponse.json({items:await repo.mine(actor)},{headers:PRIVATE_HEADERS}))
  if(request.method!=='POST')throw new AppError('METHOD_NOT_ALLOWED',405)
  const body=await readBody(request,270000)
  let item
  switch(body.action){
   case 'create':
    item=await repo.create(actor,body.course)
    break
   case 'save':
    item=await repo.save(actor,body.id,body.expectedRevision,body.course)
    break
   case 'publish':case 'unpublish':case 'archive':
    item=await repo.changePublication(actor,body.id,body.expectedRevision,body.action,body.reviewed)
    break
   case 'upload-intent':
    item=await repo.mediaIntent(actor,body)
    break
   case 'upload-complete':
    item=await repo.mediaComplete(actor,body.assetId)
    break
   case 'import-library-audio':
    if(!practitionerEmailAllowed(actor))throw new AppError('MATERIAL_UNAVAILABLE',404)
    item=await repo.importLibraryAudio(actor,body)
    break
   default:throw new AppError('INVALID_ACTION',400)
  }
  return auth.apply(NextResponse.json({item},{status:body.action==='create'?201:200,headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
export const GET=handle
export const POST=handle
