import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { privateDelivery,privateJson,smallJson } from '@/lib/clients/delivery-http'
import { exchangeSessionGuest,setSessionViewerCookie,clearSessionViewerCookie,readSessionViewerCookie } from '@/lib/clients/session-delivery-access'
import { validSelector } from '@/lib/clients/delivery-model'
import { privateHeaders } from '@/lib/clients/session'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { transaction } from '@/lib/app/database'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request) {
  return privateDelivery(async({config,store})=>{
    const body=await smallJson(request,2048)
    if(!validSelector(body.selector)||typeof body.secret!=='string') return privateJson({error:'SESSION_UNAVAILABLE'},404)
    const ip=createHash('sha256').update(request.headers.get('x-real-ip')||'unknown').digest('hex')
    if(!await store?.consumeAccessAttempt('client-session-ip:'+ip,30,300)||
       !await store?.consumeAccessAttempt('client-session-selector:'+body.selector,12,300))
      return privateJson({error:'SESSION_UNAVAILABLE'},404)
    const viewer=await exchangeSessionGuest(config,store,body.selector,body.secret)
    return setSessionViewerCookie(new NextResponse(null,{status:204,headers:privateHeaders}),body.selector,viewer)
  })
}
export async function DELETE(request) {
  return privateDelivery(async({config})=>{
    if(!isSameOriginRequest(request)) return privateJson({error:'SESSION_UNAVAILABLE'},404)
    const {selector}=await smallJson(request,2048)
    if(!validSelector(selector)) return privateJson({error:'SESSION_UNAVAILABLE'},404)
    const credential=readSessionViewerCookie(request.cookies,selector)
    if(credential) await transaction(config,null,db=>db.query(
      'update app_private.client_session_viewer_sessions set revoked_at=now() where id=$1 and secret_hash=$2',
      [credential.id,credential.secretHash]),{server:true})
    return clearSessionViewerCookie(new NextResponse(null,{status:204,headers:privateHeaders}),selector)
  })
}
