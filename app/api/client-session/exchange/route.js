import { NextResponse } from 'next/server'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { privateHeaders } from '@/lib/clients/session'
import { exchangeClientSessionShare,sessionViewerCookieName } from '@/lib/clients/session-delivery'
import { selectorPattern,secretPattern } from '@/lib/clients/session-delivery-validation'
import { readBody } from '@/lib/app/http'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const unavailable=()=>NextResponse.json({error:'Private session unavailable'},{status:404,headers:privateHeaders})
export async function POST(request){
  if(!isSameOriginRequest(request))return unavailable()
  try{
    const data=await readBody(request,2048)
    if(!selectorPattern.test(data.selector||'')||!secretPattern.test(data.secret||''))return unavailable()
    const ip=(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim()
    const result=await exchangeClientSessionShare(data.selector,data.secret,ip)
    const response=NextResponse.json({ok:true},{headers:privateHeaders})
    response.cookies.set(sessionViewerCookieName(result.selector),result.cookie,{
      httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:result.maxAge
    })
    return response
  }catch{return unavailable()}
}
