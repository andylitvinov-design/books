import { NextResponse } from 'next/server'
import { privateHeaders } from '@/lib/clients/session'
import { getGuestClientSession,getPublishedSession } from '@/lib/clients/session-delivery'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(_request,{params}){
  try{
    const {selector}=await params
    const grant=await getGuestClientSession(selector)
    if(!grant)return new NextResponse(null,{status:404,headers:privateHeaders})
    const session=await getPublishedSession(grant.clientId,grant.sessionId)
    return NextResponse.json({session},{headers:privateHeaders})
  }catch{return new NextResponse(null,{status:404,headers:privateHeaders})}
}
