import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError} from '@/lib/assessments/contracts'
import {readMyCoachDrafts,writeMyCoachDraft,closeMyCoachDraft} from '@/lib/app/my-coach-drafts'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
async function endpoint(request){
 let auth
 try{
  const config=getAppConfig()
  if(request.method==='GET')requestOrigin(request,config);else requireSameOrigin(request,config)
  auth=createRequestAuth(request,config)
  const actor=await auth.verified()
  if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
  let result
  if(request.method==='GET'){
   const params=new URL(request.url).searchParams
   for(const key of params.keys())if(!['id','personaId','before','beforeId'].includes(key)||params.getAll(key).length!==1)throw new AppError('MY_COACH_DRAFT_INVALID',400)
   result={...await readMyCoachDrafts(config,actor,Object.fromEntries(params)),enabled:process.env.HH_MY_COACH_DRAFTS_ENABLED==='true'}
  }else{
   const input=await readBody(request,350000)
   if(input.action==='checkpoint'){
    if(process.env.HH_MY_COACH_DRAFTS_ENABLED!=='true')throw new AppError('MY_COACH_DRAFT_UNAVAILABLE',503)
    await consumeRate(config,{op:'my-coach-draft-checkpoint',actor:actor.id},90,60)
    result=await writeMyCoachDraft(config,actor,input)
   }else if(['finalize','delete'].includes(input.action)){
    await consumeRate(config,{op:'my-coach-draft-close',actor:actor.id},15,60)
    result=await closeMyCoachDraft(config,actor,input)
   }else throw new AppError('MY_COACH_DRAFT_INVALID',400)
  }
  return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const safe=safeError(error),response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
 }
}
export const GET=endpoint
export const POST=endpoint
