import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { onlyKeys, requireUUID } from '@/lib/assessments/contracts'
import { createServiceReviewRepository } from '@/lib/practitioners/reviews'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0

const send=(data,status=200,auth)=> {
  const response=NextResponse.json(data,{status,headers:PRIVATE_HEADERS})
  return auth?auth.apply(response):response
}
const failed=error=>{
  const {status,code}=safeError(error)
  return send({error:code},status)
}
const serviceIdFrom=request=>{
  const serviceId=new URL(request.url).searchParams.get('serviceId')
  requireUUID(serviceId)
  return serviceId
}

export async function GET(request){
  let auth
  try{
    const config=getAppConfig()
    const serviceId=serviceIdFrom(request)
    const requestedPage=new URL(request.url).searchParams.get('page')||'1'
    if(!/^[1-9]\d?$/.test(requestedPage))return send({error:'INVALID_PAGE'},400)
    const page=Number(requestedPage)
    const repo=createServiceReviewRepository(config)
    const {ownerId,...publicReviews}=await repo.listPublic(serviceId,page)
    let viewer={signedIn:false,canReview:false,mine:null,suggestedName:''}
    if(request.cookies.getAll().some(cookie=>cookie.name.startsWith('hh-app-auth'))){
      auth=createRequestAuth(request,config)
      let actor=null
      try{actor=await auth.verified()}catch{}
      if(actor){
        try{viewer=await repo.viewer(serviceId,ownerId,actor)}
        catch{viewer={signedIn:true,canReview:false,mine:null,suggestedName:''}}
      }
    }
    return send({...publicReviews,viewer},200,auth)
  }catch(error){return failed(error)}
}

export async function POST(request){
  let auth
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const input=await readBody(request,2048)
    const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,70)
    await consumeRate(config,{op:'service-review-user',accountId:actor.id},10,3600)
    await consumeRate(config,{op:'service-review-ip',ip},40,3600)
    const review=await createServiceReviewRepository(config).save(actor,input)
    return send({review},200,auth)
  }catch(error){return failed(error)}
}

export async function DELETE(request){
  let auth
  try{
    const config=getAppConfig()
    requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    const input=await readBody(request,256)
    onlyKeys(input,['serviceId'])
    requireUUID(input.serviceId)
    await consumeRate(config,{op:'service-review-user',accountId:actor.id},10,3600)
    await createServiceReviewRepository(config).remove(actor,input.serviceId)
    return send({deleted:true},200,auth)
  }catch(error){return failed(error)}
}
