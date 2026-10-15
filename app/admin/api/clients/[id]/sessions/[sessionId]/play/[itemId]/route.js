import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { privateHeaders } from '@/lib/clients/session'
import { signedOwnerSessionAsset } from '@/lib/clients/session-delivery'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request,{params}){
  if(!isSameOriginRequest(request)||!await requireAdminRequest())
    return new NextResponse(null,{status:404,headers:privateHeaders})
  try{
    const {id,sessionId,itemId}=await params
    return NextResponse.json(await signedOwnerSessionAsset(id,sessionId,itemId),{headers:privateHeaders})
  }catch{return new NextResponse(null,{status:404,headers:privateHeaders})}
}
