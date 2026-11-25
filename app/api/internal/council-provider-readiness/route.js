import {NextResponse} from 'next/server'
import {PRIVATE_HEADERS} from '@/lib/app/http'
import {councilProviderProbeAuthorized,inspectCouncilProviderKeys} from '@/lib/practitioners/council-provider-readiness.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=30

// Production-only, short-lived read-only key validation.
// No PII, model generation, paid requests, Telegram send, or key material in response.
export async function GET(request){
  if(!councilProviderProbeAuthorized(request.url,process.env))
    return NextResponse.json({error:'NOT_FOUND'}, {status:404,headers:PRIVATE_HEADERS})
  try{
    return NextResponse.json(await inspectCouncilProviderKeys(process.env),
      {headers:PRIVATE_HEADERS})
  }catch{
    return NextResponse.json({error:'PROVIDER_READINESS_UNAVAILABLE'},
      {status:503,headers:PRIVATE_HEADERS})
  }
}
