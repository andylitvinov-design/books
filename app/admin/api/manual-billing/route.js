import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { practitionerEmailAllowed } from '@/lib/app/practitioner-access'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requireSameOrigin, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { consumeRate } from '@/lib/app/database'
import { createAppRepository } from '@/lib/app/repository'
import { createManualOrdersService } from '@/lib/billing/manual-orders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handle(request) {
  let auth
  try {
    const config=getAppConfig()
    requestOrigin(request,config)
    if(request.method!=='GET')requireSameOrigin(request,config)
    // BOTH the private /admin session and a verified, active Google owner are required.
    if(!await requireAdminRequest())throw new AppError('SIGN_IN_REQUIRED',401)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(!practitionerEmailAllowed(actor)||!(await createAppRepository(config).isPractitioner(actor)))
      throw new AppError('ACCESS_DENIED',403)
    await consumeRate(config,{op:'manual-payment-review',owner:actor.id},30,60)
    const service=createManualOrdersService(config)
    let result
    if(request.method==='GET')result=await service.listReview(actor)
    else if(request.method==='POST')result=await service.review(actor,await readBody(request,4096))
    else throw new AppError('NOT_FOUND',404)
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
  } catch(error) {
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export {handle as GET,handle as POST}
