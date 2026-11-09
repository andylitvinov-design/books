import { NextResponse } from 'next/server'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { clientMemoryEnabled } from '@/lib/app/client-memory-store'
import { listClientCareTasks, offerClientCareTask,
  createClientCommitment, transitionClientCareTask } from '@/lib/app/client-care-task-store'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const respond=(body,status=200)=>NextResponse.json(body,{headers:PRIVATE_HEADERS,status})
async function handler(request){
  let auth
  try{
    if(!clientMemoryEnabled())throw new AppError('CLIENT_MEMORY_DISABLED',503)
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id') && request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    if(request.method==='GET'){
      const params=new URL(request.url).searchParams
      if([...params.keys()].some(key=>!['requestId','taskId'].includes(key)))
        throw new AppError('INVALID_QUERY',400)
      return auth.apply(respond(await listClientCareTasks(config,actor,{
        requestId:params.get('requestId'),taskId:params.get('taskId')})))
    }
    await consumeRate(config,{op:'client-care-task-write',actorId:actor.id},30,3600)
    const data=await readBody(request,4800)
    if(!data||typeof data!=='object'||Array.isArray(data))throw new AppError('INVALID_TASK',400)
    let result
    if(data.action==='offer'){
      onlyKeys(data,['action','requestId','taskId','type','title','instructions','dueOn','operationId'])
      result=await offerClientCareTask(config,actor,data)
    }else if(data.action==='client-create'){
      onlyKeys(data,['action','taskId','type','title','instructions','dueOn','operationId','userConfirmed'])
      result=await createClientCommitment(config,actor,data)
    }else if(['accept','decline','start','self_report','revise_report','pause',
       'review','request_revision','cancel','archive'].includes(data.action)){
      onlyKeys(data,['action','taskId','operationId','expectedRevision','note'])
      result=await transitionClientCareTask(config,actor,data)
    }else throw new AppError('INVALID_TASK',400)
    return auth.apply(respond(result))
  }catch(error){
    const safe=safeError(error)
    const response=respond({error:safe.code},safe.status)
    return auth?auth.apply(response):response
  }
}
export const GET=handler
export const POST=handler
