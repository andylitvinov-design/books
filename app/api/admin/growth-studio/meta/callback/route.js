import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {completeMetaInstagramAuthorization,verifyMetaOAuthState,MetaInstagramError} from '@/lib/growth-studio/meta-instagram.mjs'

export const dynamic='force-dynamic'
const COOKIE='hh_meta_instagram_oauth'
function returnTo(request,status) {
  const url=new URL('/admin/growth-studio',request.url)
  url.searchParams.set('meta',status)
  const response=NextResponse.redirect(url)
  response.cookies.set(COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/admin/growth-studio/meta',maxAge:0})
  return response
}
export async function GET(request) {
  if(!await requireAdminRequest())return new NextResponse('Unauthorized',{status:401})
  const url=new URL(request.url)
  const code=url.searchParams.get('code')
  const state=url.searchParams.get('state')
  const cookie=request.cookies.get(COOKIE)?.value
  if(url.searchParams.has('error')||!code||!state)return returnTo(request,'authorization_denied')
  const verified=verifyMetaOAuthState(cookie,state)
  if(!verified)return returnTo(request,'invalid_state')
  try{
    const result=await completeMetaInstagramAuthorization({code,targetId:verified.targetId})
    return returnTo(request,'connected_'+result.targetId)
  }catch(error){
    const status=error instanceof MetaInstagramError?error.code:'meta_unavailable'
    return returnTo(request,status)
  }
}
