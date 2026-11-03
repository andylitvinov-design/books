import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { privateError } from '@/lib/clients/delivery-http'
import { cleanupExpiredLocalVoice } from '@/lib/clients/local-narration-service'
import { readAuthenticatedWorkerJson } from '@/lib/clients/local-narration-worker-request'
import { PRIVATE_HEADERS } from '@/lib/app/http'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=40

// Only the owner's Mac worker can trigger bounded private Storage cleanup.
export async function POST(request) {
  try {
    const body=await readAuthenticatedWorkerJson(request)
    if(Object.keys(body).length) return NextResponse.json(
      {error:'INVALID_REQUEST'}, {status:400,headers:PRIVATE_HEADERS})
    const result=await cleanupExpiredLocalVoice(getAppConfig(),request)
    return NextResponse.json(result,{headers:PRIVATE_HEADERS})
  }catch(error){return privateError(error)}
}
