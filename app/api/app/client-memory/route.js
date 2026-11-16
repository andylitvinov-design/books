import { NextResponse } from 'next/server'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { clientMemoryEnabled, readClientMemory, updateClientMemoryConsent,
  confirmClientMemory, editClientMemory, forgetClientMemory } from '@/lib/app/client-memory-store'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const respond=(data,status=200)=>NextResponse.json(data,{status,headers:PRIVATE_HEADERS})

async function handler(request){
  let auth
  try{
    const memoryLive=clientMemoryEnabled()
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id') && request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    if(request.method==='GET'){
      if(!memoryLive)throw new AppError('CLIENT_MEMORY_DISABLED',503)
      const params=new URL(request.url).searchParams
      if([...params.keys()].length)throw new AppError('INVALID_QUERY',400)
      return auth.apply(respond(await readClientMemory(config,actor)))
    }
    await consumeRate(config,{op:'client-memory-write',actorId:actor.id},20,3600)
    const data=await readBody(request,3072)
    if(!data||typeof data!=='object'||Array.isArray(data))throw new AppError('INVALID_MEMORY_ACTION',400)
    // Emergency disabling the feature must not disable a signed-in owner's
    // right to erase records or revoke a previously granted memory consent.
    if(!memoryLive && !(data.action==='forget'||data.action==='forget-all'||
      (data.action==='consent' && data.values && typeof data.values==='object' &&
       !Array.isArray(data.values) && Object.keys(data.values).length>0 &&
       Object.values(data.values).every(value=>value===false))))
      throw new AppError('CLIENT_MEMORY_DISABLED',503)
    let result
    switch(data.action){
      case 'consent':
        onlyKeys(data,['action','values','expectedRevision','operationId'])
        result=await updateClientMemoryConsent(config,actor,data);break
      case 'confirm':
        onlyKeys(data,['action','id','operationId','category','scope','privacyClass','value','userConfirmed','questionKey'])
        result=await confirmClientMemory(config,actor,data);break
      case 'edit':
        onlyKeys(data,['action','id','operationId','value','pinned','expectedRevision'])
        result=await editClientMemory(config,actor,data);break
      case 'forget':
        onlyKeys(data,['action','id','operationId'])
        result=await forgetClientMemory(config,actor,data);break
      case 'forget-all':
        onlyKeys(data,['action','all','operationId'])
        if(data.all!==true)throw new AppError('INVALID_MEMORY_ACTION',400)
        result=await forgetClientMemory(config,actor,data);break
      default:throw new AppError('INVALID_MEMORY_ACTION',400)
    }
    return auth.apply(respond(result))
  }catch(error){
    const safe=safeError(error)
    const response=respond({error:safe.code},safe.status)
    return auth?auth.apply(response):response
  }
}
export const GET=handler
export const POST=handler
