import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { isSameOriginRequest } from '@/lib/prescriptions/session'
import { privateHeaders } from '@/lib/clients/session'
import { readBody } from '@/lib/app/http'
import {
 getOwnerSession,saveClientSession,publishClientSession,copyClientSessionShare,
 revokeClientSessionShare,archiveClientSession,prepareSessionUpload,finalizeSessionUpload
} from '@/lib/clients/session-delivery'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const fail=(status=404)=>NextResponse.json({error:'Session unavailable'},{status,headers:privateHeaders})
export async function GET(_request,{params}){
  if(!await requireAdminRequest())return fail()
  try{
    const {id,sessionId}=await params
    return NextResponse.json({session:await getOwnerSession(id,sessionId)},{headers:privateHeaders})
  }catch{return fail(404)}
}
export async function PATCH(request,{params}){
  if(!isSameOriginRequest(request)||!await requireAdminRequest())return fail()
  try{
    const {id,sessionId}=await params
    const {revision,content}=await readBody(request,120000)
    const session=await saveClientSession(id,sessionId,revision,content)
    return NextResponse.json({session},{headers:privateHeaders})
  }catch{return fail(409)}
}
export async function POST(request,{params}){
  if(!isSameOriginRequest(request)||!await requireAdminRequest())return fail()
  try{
    const {id,sessionId}=await params,body=await readBody(request,8192)
    let result
    switch(body.action){
      case 'publish': result=await publishClientSession(id,sessionId,body.revision);break
      case 'share': result=await copyClientSessionShare(id,sessionId,false);break
      case 'rotate': result=await copyClientSessionShare(id,sessionId,true);break
      case 'revoke': result=await revokeClientSessionShare(id,sessionId);break
      case 'archive': result=await archiveClientSession(id,sessionId);break
      case 'upload-intent': result=await prepareSessionUpload(id,sessionId,body.file);break
      case 'finalize-upload': result=await finalizeSessionUpload(id,sessionId,body.assetId);break
      default:return fail(400)
    }
    return NextResponse.json({result},{headers:privateHeaders})
  }catch{return fail(409)}
}
