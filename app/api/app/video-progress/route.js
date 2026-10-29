import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { consumeRate } from '@/lib/app/database'
import { listVideoProgress, markVideoProgress } from '@/lib/app/video-progress'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

async function handle(request, write=false) {
  let auth
  try {
    const config=getAppConfig()
    if (write) requireSameOrigin(request,config)
    else requestOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const declared=request.headers.get('x-hh-account-id')
    if (declared && declared !== actor.id)
      return auth.apply(NextResponse.json({error:'ACCOUNT_CHANGED'},{status:403,headers:PRIVATE_HEADERS}))
    await consumeRate(config,{op:write?'video-progress-mark':'video-progress-list',accountId:actor.id},
      write?24:90,write?3600:60)
    const payload=write ? await markVideoProgress(config,actor,await readBody(request,2048))
      : await listVideoProgress(config,actor)
    return auth.apply(NextResponse.json(payload,{headers:PRIVATE_HEADERS,status:write?201:200}))
  } catch(error) {
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export async function GET(request) { return handle(request) }
export async function POST(request) { return handle(request,true) }
