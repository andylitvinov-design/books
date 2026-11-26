import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {listCoachDrafts,saveCoachDraft,discardCoachDraft,resumeCoachDraft} from '@/lib/app/my-coach-protocol-drafts'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const preferredRegion='yul1'
async function handle(request,write){
 let auth
 try{
  const config=getAppConfig()
  if(write)requireSameOrigin(request,config);else requestOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  let result
  if(write){
   const input=await readBody(request,260000)
   if(!input||typeof input!=='object'||Array.isArray(input))throw new AppError('MY_COACH_DRAFT_INVALID',400)
   if(input.action==='checkpoint'&&Object.keys(input).every(k=>['action','consent','revision','value'].includes(k))){
    await consumeRate(config,{op:'my-coach-draft-checkpoint',actor:actor.id},240,3600)
    result=await saveCoachDraft(config,actor,input)
   }else if(input.action==='resume'&&Object.keys(input).every(k=>['action','confirmed','id','revision'].includes(k))){
    await consumeRate(config,{op:'my-coach-draft-resume',actor:actor.id},30,3600)
    result=await resumeCoachDraft(config,actor,input)
   }else if(input.action==='discard'&&Object.keys(input).every(k=>['action','confirmed','id'].includes(k))){
    await consumeRate(config,{op:'my-coach-draft-discard',actor:actor.id},30,3600)
    result=await discardCoachDraft(config,actor,input)
   }else throw new AppError('MY_COACH_DRAFT_INVALID',400)
  }else{
   const params=new URL(request.url).searchParams
   if([...params.keys()].some(k=>!['before','beforeId','view','personaId'].includes(k)||params.getAll(k).length!==1))throw new AppError('MY_COACH_DRAFT_INVALID',400)
   result=await listCoachDrafts(config,actor,{before:params.get('before'),beforeId:params.get('beforeId'),view:params.get('view'),personaId:params.get('personaId')})
  }
  return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error)
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
export const GET=request=>handle(request,false)
export const POST=request=>handle(request,true)
