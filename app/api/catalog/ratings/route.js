import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { createCatalogStarRepository } from '@/lib/catalog/catalog-star-ratings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
const send=(value,status=200,auth)=>{
  const response=NextResponse.json(value,{status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
}
function failure(error) {
  const safe=safeError(error)
  return send({error:safe.code},safe.status)
}
export async function GET(request) {
  let auth
  try {
    const config=getAppConfig()
    requestOrigin(request,config)
    const params=new URL(request.url).searchParams
    const kind=params.get('kind')||''
    const raw=params.get('keys')||''
    if (raw.length>5000) return send({error:'INVALID_RATING_TARGET'},400)
    const keys=raw.split(',')
    let actor=null
    if(request.cookies.getAll().some(cookie=>cookie.name.startsWith('hh-app-auth'))){
      auth=createRequestAuth(request,config)
      try{actor=await auth.verified()}catch{}
    }
    const repo=createCatalogStarRepository(config)
    // Auth is optional for public summaries, including expired sign-in cookies.
    let ratings
    try {ratings=await repo.list(kind,keys,actor)}
    catch(error){if(!actor)throw error;ratings=await repo.list(kind,keys)}
    return send({ratings},200,auth)
  }catch(error){return failure(error)}
}
export async function POST(request) {
  let auth
  try {
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const input=await readBody(request,512)
    const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,70)
    await consumeRate(config,{op:'catalog-stars-member',accountId:actor.id},30,3600)
    await consumeRate(config,{op:'catalog-stars-ip',ip},100,3600)
    const rating=await createCatalogStarRepository(config).save(actor,input)
    return send({rating},200,auth)
  }catch(error){return failure(error)}
}
