import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {AppError,onlyKeys} from '@/lib/assessments/contracts'
import {createPractitionerRequestTaskStore} from '@/lib/practitioners/request-tasks'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

async function handler(request){
  let auth
  try{
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method==='POST')requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    const repo=createPractitionerRequestTaskStore(config)
    let data
    if(request.method==='GET'){
      const params=new URL(request.url).searchParams
      if([...params.keys()].some(key=>key!=='requestId')||
         params.getAll('requestId').length!==1)throw new AppError('INVALID_TASK',400)
      data=await repo.list(actor,params.get('requestId'))
    }else{
      const input=await readBody(request,1024)
      if(input.action==='create'){
        onlyKeys(input,['action','requestId','taskId','kind','dueOn'])
        data=await repo.create(actor,input)
      }else if(['complete','reopen','reschedule'].includes(input.action)){
        onlyKeys(input,['action','requestId','taskId','expectedRevision',
          ...(input.action==='reschedule'?['dueOn']:[])])
        data=await repo.change(actor,input)
      }else throw new AppError('INVALID_TASK',400)
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
