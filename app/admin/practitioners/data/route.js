import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getAppConfig, requireSameOrigin, requestOrigin } from '@/lib/app/config'
import { createPractitionerRepository } from '@/lib/practitioners/repository'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys, requireUUID } from '@/lib/assessments/contracts'
export const runtime='nodejs'
export const dynamic='force-dynamic'
async function handle(request){
  try{
    if(!(await requireAdminRequest()))throw new AppError('SIGN_IN_REQUIRED',401)
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method!=='GET')requireSameOrigin(request,config)
    await consumeRate(config,{op:'practitioner-moderation'},90,60)
    const repo=createPractitionerRepository(config)
    if(request.method==='GET')return NextResponse.json({items:await repo.moderationList()},{headers:PRIVATE_HEADERS})
    const body=await readBody(request)
    onlyKeys(body,['kind','id','action','note','isPartner'])
    requireUUID(body.id)
    if(body.kind==='practitioner')return NextResponse.json(await repo.moderateProfile(body.id,{action:body.action,note:body.note,isPartner:body.isPartner}),{headers:PRIVATE_HEADERS})
    if(body.kind==='credential')return NextResponse.json(await repo.moderateCredential(body.id,{action:body.action}),{headers:PRIVATE_HEADERS})
    if(body.kind==='service')return NextResponse.json(await repo.moderateService(body.id,{action:body.action,note:body.note}),{headers:PRIVATE_HEADERS})
    throw new AppError('INVALID_ACTION',400)
  }catch(error){const safe=safeError(error);return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})}
}
export {handle as GET,handle as POST}
