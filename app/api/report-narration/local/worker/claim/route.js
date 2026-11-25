import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { privateError } from '@/lib/clients/delivery-http'
import { claimLocalNarration } from '@/lib/clients/local-narration-service'
import { PRIVATE_HEADERS } from '@/lib/app/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=40

export async function POST(request) {
  try {
    const result=await claimLocalNarration(getAppConfig(),request)
    return NextResponse.json(result,{headers:PRIVATE_HEADERS})
  }catch(error){return privateError(error)}
}
