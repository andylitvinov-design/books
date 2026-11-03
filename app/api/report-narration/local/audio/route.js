import { NextResponse } from 'next/server'
import { getAppConfig } from '@/lib/app/config'
import { privateError } from '@/lib/clients/delivery-http'
import { validNarrationRequest } from '@/lib/clients/report-narration-model'
import { authorizedLocalNarrationAudio } from '@/lib/clients/local-narration-service'
import { PRIVATE_HEADERS } from '@/lib/app/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=40

export async function GET(request) {
  try {
    if(request.headers.get('sec-fetch-site')==='cross-site')
      return new NextResponse(null,{status:404,headers:PRIVATE_HEADERS})
    const pairs=[...new URL(request.url).searchParams.entries()]
    if(new Set(pairs.map(([key])=>key)).size!==pairs.length)
      return new NextResponse(null,{status:404,headers:PRIVATE_HEADERS})
    const body=Object.fromEntries(pairs)
    if(!/^\d+$/.test(body.part||''))return new NextResponse(null,{status:404,headers:PRIVATE_HEADERS})
    body.part=Number(body.part)
    if(!validNarrationRequest(body))return new NextResponse(null,{status:404,headers:PRIVATE_HEADERS})
    const result=await authorizedLocalNarrationAudio(getAppConfig(),request,body,
      request.headers.get('range'))
    return new NextResponse(result.bytes,{status:result.status,
      headers:{...PRIVATE_HEADERS,...result.headers,
        'Content-Disposition':'inline','Vary':'Cookie'}})
  }catch(error) {
    if(error?.code==='LOCAL_NARRATION_BAD_RANGE')
      return new NextResponse(null,{status:416,headers:PRIVATE_HEADERS})
    return privateError(error)
  }
}
