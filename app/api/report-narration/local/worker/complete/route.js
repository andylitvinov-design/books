import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { privateError } from '@/lib/clients/delivery-http'
import { finalizeLocalNarration } from '@/lib/clients/local-narration-service'
import { readAuthenticatedWorkerJson } from '@/lib/clients/local-narration-worker-request'
import { PRIVATE_HEADERS } from '@/lib/app/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const data = await readAuthenticatedWorkerJson(request)
    const result = await finalizeLocalNarration(getAppConfig(), request, data)
    return NextResponse.json(result, {headers: PRIVATE_HEADERS})
  } catch (error) {
    return privateError(error)
  }
}
