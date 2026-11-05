import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http'
import { consumeRate } from '@/lib/app/database'
import { listLabReports } from '@/lib/app/lab-reports'
import { readDevelopmentGoals } from '@/lib/app/development-goals'
import { readBusinessCoaching } from '@/lib/app/business-coaching'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

// Neutral, read-only account activity adapters; reuse existing sealed source
// repositories. No clinical numbers, goals, source documents, payment data or
// private coaching answers may leave this endpoint, even for the owner.
export async function GET(request) {
  let auth
  try {
    const config=getAppConfig()
    requestOrigin(request,config)
    if (new URL(request.url).search) return NextResponse.json({error:'INVALID_QUERY'},{status:400,headers:PRIVATE_HEADERS})
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const claimed=request.headers.get('x-hh-account-id')
    if(claimed&&claimed!==actor.id)
      return auth.apply(NextResponse.json({error:'ACCOUNT_CHANGED'},{status:403,headers:PRIVATE_HEADERS}))
    await consumeRate(config,{op:'my-progress-extras',actor:actor.id},50,60)
    const [labsResult,developmentResult,businessResult]=await Promise.allSettled([
      listLabReports(config,actor),
      readDevelopmentGoals(config,actor),
      readBusinessCoaching(config,actor),
    ])
    const result={
      accountId:actor.id,
      labs:labsResult.status==='fulfilled'
        ? {available:true,records:(labsResult.value.reports||[]).map(row=>({
            id:row.id,savedAt:row.savedAt,
          }))} : {available:false,records:[]},
      development:developmentResult.status==='fulfilled'
        ? {available:true,updatedAt:developmentResult.value.revision>0?developmentResult.value.updatedAt:null}
        : {available:false,updatedAt:null},
      business:businessResult.status==='fulfilled'
        ? {available:true,updatedAt:businessResult.value.course?businessResult.value.updatedAt:null}
        : {available:false,updatedAt:null},
      partial:[labsResult,developmentResult,businessResult].some(item=>item.status==='rejected'),
    }
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
  }catch(error) {
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
