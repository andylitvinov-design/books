import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {consumeRate} from '@/lib/app/database'
import {AppError} from '@/lib/assessments/contracts'
import {getPrescriptionStore} from '@/lib/prescriptions/store'
import {deliveryEnabled} from '@/lib/clients/delivery-model'
import {listSavedProgramReports} from '@/lib/app/daybook-report-index'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export async function GET(request){
  let auth
  try{
    const config=getAppConfig()
    requestOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id')!==actor.id)throw new AppError('ACCOUNT_CHANGED',409)
    const query=new URL(request.url).searchParams,program=query.get('program'),goalId=query.get('goal')
    if(query.getAll('program').length!==1||query.getAll('goal').length>1||[...query.keys()].some(key=>!['program','goal'].includes(key))||!['clarity','business','goal'].includes(program)||(program==='goal'?!goalId:goalId!==null))
      throw new AppError('INVALID_REPORT_PROGRAM',400)
    await consumeRate(config,{op:'daybook-report-index',accountId:actor.id},20,60)
    const payload=deliveryEnabled()?await listSavedProgramReports(config,getPrescriptionStore(),actor,program,goalId):{reports:[],limited:false}
    return auth.apply(NextResponse.json(payload,{headers:PRIVATE_HEADERS}))
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
