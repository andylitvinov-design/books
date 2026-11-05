import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { linkedTelegramCoaching } from '@/lib/crm/telegram-coaching-link'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

export async function POST(request) {
  try {
    const config=getAppConfig()
    requestOrigin(request,config)
    requireSameOrigin(request,config)
    const input=await readBody(request,80000)
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'
    await consumeRate(config,
      {op:input?.action==='submit'?'tg-coaching-submit':'tg-coaching-context',ip},
      input?.action==='submit'?4:50,3600)
    const result=await linkedTelegramCoaching(config,input)
    return NextResponse.json(result,{
      status:input.action==='submit'?201:200,headers:PRIVATE_HEADERS,
    })
  } catch(error) {
    const safe=safeError(error)
    return NextResponse.json({error:safe.code},{
      status:safe.status,headers:PRIVATE_HEADERS,
    })
  }
}
