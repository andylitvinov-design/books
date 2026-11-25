import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {AppError,requireUUID} from '@/lib/assessments/contracts'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {GOAL_PHOTO_MAX_BYTES,saveGoalPhoto,getGoalPhoto,deleteGoalPhoto} from '@/lib/practitioners/remote-goal-photo'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=40
async function handler(request,{params}){
  let auth
  try{
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method!=='GET')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')&&request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    const {id}=await params
    requireUUID(id)
    if(request.method==='GET'){
      const bytes=await getGoalPhoto(config,actor,id)
      return auth.apply(new NextResponse(bytes,{headers:{
        ...PRIVATE_HEADERS,'Content-Type':'image/jpeg','Content-Length':String(bytes.length),
        'Content-Disposition':'inline; filename="goal.jpg"','X-Content-Type-Options':'nosniff',
        'Cache-Control':'private, no-store, max-age=0',
      }}))
    }
    await consumeRate(config,{op:'remote-goal-photo',actor:actor.id},8,3600)
    if(request.method==='DELETE'){
      const result=await deleteGoalPhoto(config,actor,id)
      return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
    }
    if(request.method!=='POST')throw new AppError('NOT_FOUND',404)
    const declared=request.headers.get('content-length')
    if(declared&&Number(declared)>GOAL_PHOTO_MAX_BYTES+40000)
      throw new AppError('PHOTO_TOO_LARGE',413)
    if(!request.headers.get('content-type')?.startsWith('multipart/form-data'))
      throw new AppError('INVALID_CONTENT_TYPE',415)
    const fields=await request.formData()
    if([...fields.keys()].some(key=>!['photo','consent'].includes(key)))
      throw new AppError('INVALID_IMAGE',400)
    const result=await saveGoalPhoto(config,actor,id,fields.get('photo'),fields.get('consent')==='yes')
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export {handler as GET,handler as POST,handler as DELETE}
