import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {practitionerEmailAllowed} from '@/lib/app/practitioner-access'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError,onlyKeys} from '@/lib/assessments/contracts'
import {createCrmRepository,crmEnabled} from '@/lib/crm/repository'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
async function handle(request){
  let auth
  try{
    if(!crmEnabled())throw new AppError('CRM_UNAVAILABLE',503)
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    if(!practitionerEmailAllowed(actor))throw new AppError('ACCESS_DENIED',403)
    const repo=createCrmRepository(config)
    let data
    if(request.method==='GET'){
      const params=new URL(request.url).searchParams
      if([...params.keys()].some(x=>x!=='flowId')||
        params.getAll('flowId').length!==1)throw new AppError('INVALID_SALESBOT_QUERY',400)
      data=await repo.withOwner(actor,store=>store.listSalesbotRuns(params.get('flowId')))
    }else{
      const body=await readBody(request,4096)
      onlyKeys(body,['action','payload'])
      if(!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))
        throw new AppError('INVALID_SALESBOT_RUN',400)
      if(body.action==='start')
        data=await repo.withOwner(actor,store=>store.startSalesbotRun(body.payload))
      else if(body.action==='resume')
        data=await repo.withOwner(actor,store=>store.resumeSalesbotRun(body.payload))
      else throw new AppError('INVALID_SALESBOT_ACTION',400)
    }
    return auth.apply(NextResponse.json({items:Array.isArray(data)?data:undefined,
      ...(Array.isArray(data)?{}:data),mode:'owner_crm_run',sendsEnabled:false},
      {headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export const GET=handle
export const POST=handle
