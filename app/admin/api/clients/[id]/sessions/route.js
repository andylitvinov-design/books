import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { privateHeaders } from '@/lib/clients/session'
import { listOwnerSessions,createClientSession } from '@/lib/clients/session-delivery'
import { readBody } from '@/lib/app/http'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const fail=(status=404)=>NextResponse.json({error:'Session unavailable'},{status,headers:privateHeaders})

export async function GET(_request,{params}){
  if(!await requireAdminRequest())return fail()
  try{
    const {id}=await params
    return NextResponse.json({sessions:await listOwnerSessions(id)},{headers:privateHeaders})
  }catch{return fail(503)}
}
export async function POST(request,{params}){
  if(!isSameOriginRequest(request)||!await requireAdminRequest())return fail()
  try{
    const {id}=await params
    const {date,locale,consultationId,title}=await readBody(request,8192)
    const session=await createClientSession(id,{date,locale,consultationId:consultationId||null,title})
    return NextResponse.json({session},{status:201,headers:privateHeaders})
  }catch{return fail(409)}
}
