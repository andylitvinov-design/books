import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
import { createPractitionerClientMessages } from '@/lib/practitioners/client-messages'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handler(request){
  let auth
  try {
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    const store=createPractitionerClientMessages(config)
    let data
    if(request.method==='GET'){
      const params=new URL(request.url).searchParams
      const keys=['requestId','before']
      if([...params.keys()].some(key=>!keys.includes(key))||
         keys.some(key=>params.getAll(key).length>1)||
         !params.get('requestId'))
        throw new AppError('INVALID_REQUEST',400)
      data=await store.list(actor,params.get('requestId'),params.get('before'))
    }else{
      const body=await readBody(request,2048)
      onlyKeys(body,['requestId','operationId','text','visibility'])
      data=await store.send(actor,body)
    }
    return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export const GET=handler
export const POST=handler
