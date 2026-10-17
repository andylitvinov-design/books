import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { consumeRate } from '@/lib/app/database'
import { readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys, requireUUID } from '@/lib/assessments/contracts'
import { createPractitionerRepository } from '@/lib/practitioners/repository'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

export async function POST(request){
  try {
    const config=getAppConfig()
    requireSameOrigin(request,config)
    const input=await readBody(request,512)
    onlyKeys(input,['serviceId','event'])
    requireUUID(input.serviceId)
    if(!['impression','order','whatsapp','telegram'].includes(input.event))
      throw new AppError('INVALID_EVENT',400)
    // Apply hashed short-lived per-IP protection; store no visitor info in statistics.
    const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,70)
    await consumeRate(config,{op:'service-funnel',ip},180,60)
    await createPractitionerRepository(config).recordPublicServiceEvent(input.serviceId,input.event)
    return new NextResponse(null,{status:204,headers:{'Cache-Control':'no-store'}})
  }catch(error){
    const {status,code}=safeError(error)
    return NextResponse.json({error:code},{status,headers:{'Cache-Control':'no-store'}})
  }
}
