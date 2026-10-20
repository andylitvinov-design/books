import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { privateError } from '@/lib/clients/delivery-http'
import { finalizeLocalNarration } from '@/lib/clients/local-narration-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return NextResponse.json({error:'INVALID_REQUEST'}, {status:400})
    }
    const text = await request.text()
    if (Buffer.byteLength(text) > 2048) {
      return NextResponse.json({error:'INVALID_REQUEST'}, {status:413})
    }
    const data = JSON.parse(text)
    const result = await finalizeLocalNarration(getAppConfig(), request, data)
    return NextResponse.json(result, {headers:{'Cache-Control':'private, no-store'}})
  } catch (error) {
    return privateError(error)
  }
}
