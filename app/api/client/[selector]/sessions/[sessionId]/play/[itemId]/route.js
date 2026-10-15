import { NextResponse } from 'next/server'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { authorizeCabinetRequest,privateHeaders } from '@/lib/clients/session'
import { signedClientSessionAsset } from '@/lib/clients/session-delivery'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request,{params}){
  if(!isSameOriginRequest(request))return new NextResponse(null,{status:404,headers:privateHeaders})
  try{
    const {selector,sessionId,itemId}=await params
    const access=await authorizeCabinetRequest(selector)
    if(!access)throw new Error('unavailable')
    return NextResponse.json(await signedClientSessionAsset(access.client.id,sessionId,itemId),{headers:privateHeaders})
  }catch{return new NextResponse(null,{status:404,headers:privateHeaders})}
}
