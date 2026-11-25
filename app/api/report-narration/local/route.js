import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { smallJson, privateError } from '@/lib/clients/delivery-http'
import { validNarrationRequest } from '@/lib/clients/report-narration-model'
import { enqueueLocalNarration } from '@/lib/clients/local-narration-service'
import { PRIVATE_HEADERS } from '@/lib/app/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=30

// No GET and no browser-supplied narration text or voice ID.
export async function POST(request) {
  try {
    const config=getAppConfig()
    requireSameOrigin(request,config)
    const body=await smallJson(request,1024)
    if(!validNarrationRequest(body))
      return NextResponse.json({error:'LOCAL_NARRATION_INVALID_REQUEST'},
        {status:400,headers:PRIVATE_HEADERS})
    const result=await enqueueLocalNarration(config,request,body)
    return NextResponse.json(result,{headers:PRIVATE_HEADERS})
  }catch(error){return privateError(error)}
}
