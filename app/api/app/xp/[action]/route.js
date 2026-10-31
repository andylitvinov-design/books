import { NextResponse } from 'next/server'
import { AppError } from '@/lib/assessments/contracts'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { createXpService } from '@/lib/xp/service'
import { xpCatalog } from '@/lib/xp/model'

export const runtime='nodejs'
export const preferredRegion='yul1'
export const dynamic='force-dynamic'
export const revalidate=0

async function handler(request,{params}) {
  let auth
  try{
    const {action}=await params
    if(request.method==='GET'&&action==='catalog')
      return NextResponse.json(xpCatalog(),{headers:PRIVATE_HEADERS})
    const config=getAppConfig()
    if(request.method==='POST') requireSameOrigin(request,config)
    auth=createRequestAuth(request,config)
    const actor=await auth.verified()
    if(request.headers.get('x-hh-account-id') &&
       request.headers.get('x-hh-account-id')!==actor.id)
      throw new AppError('ACCOUNT_CHANGED',409)
    const xp=createXpService(config)
    let result
    if(request.method==='GET'&&action==='status'){
      await consumeRate(config,{op:'xp-status',actor:actor.id},30,60)
      result=await xp.status(actor)
    }else if(request.method==='POST'&&action==='sync'){
      await consumeRate(config,{op:'xp-sync',actor:actor.id},8,3600)
      result=await xp.sync(actor,request.cookies.get('hh-xp-invite')?.value||'')
    }else if(request.method==='POST'&&action==='hold'){
      await consumeRate(config,{op:'xp-hold',actor:actor.id},12,3600)
      result=await xp.hold(actor,await readBody(request,512))
    }else if(request.method==='POST'&&['complete','release'].includes(action)){
      await consumeRate(config,{op:'xp-'+action,actor:actor.id},24,3600)
      result=await xp.finish(actor,await readBody(request,512),
        action==='complete'?'completed':'released')
    }else throw new AppError('NOT_FOUND',404)
    const response=NextResponse.json(result,{headers:PRIVATE_HEADERS})
    if(action==='sync' && (result.referral?.claimed || result.referral?.reason !== 'email-unverified')){
      response.cookies.set('hh-xp-invite','',{httpOnly:true,secure:!config.test,
        sameSite:'lax',path:'/',maxAge:0})
    }
    return auth.apply(response)
  }catch(error){
    const safe=safeError(error)
    const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
    return auth?auth.apply(response):response
  }
}
export {handler as GET,handler as POST}
