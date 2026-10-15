import { NextResponse } from 'next/server'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { privateHeaders } from '@/lib/clients/session'
import { getGuestClientSession,signedClientSessionAsset } from '@/lib/clients/session-delivery'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request,{params}){
  if(!isSameOriginRequest(request))return new NextResponse(null,{status:404,headers:privateHeaders})
  try{
    const {selector,itemId}=await params
    const grant=await getGuestClientSession(selector)
    if(!grant)throw new Error('unavailable')
    return NextResponse.json(await signedClientSessionAsset(grant.clientId,grant.sessionId,itemId),{headers:privateHeaders})
  }catch{return new NextResponse(null,{status:404,headers:privateHeaders})}
}
