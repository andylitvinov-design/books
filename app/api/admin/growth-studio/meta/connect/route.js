import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {buildMetaAuthorizationUrl,createMetaOAuthState,MetaInstagramError} from '@/lib/growth-studio/meta-instagram.mjs'

export const dynamic='force-dynamic'
const COOKIE='hh_meta_instagram_oauth'

export async function GET(request) {
  if(!await requireAdminRequest())return new NextResponse('Unauthorized',{status:401})
  const targetId=new URL(request.url).searchParams.get('account')
  try{
    const {state,cookieValue}=createMetaOAuthState(targetId)
    const response=NextResponse.redirect(buildMetaAuthorizationUrl(targetId,state))
    response.cookies.set(COOKIE,cookieValue,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/admin/growth-studio/meta',maxAge:600})
    return response
  }catch(error){
    const url=new URL('/admin/growth-studio',request.url)
    url.searchParams.set('meta',error instanceof MetaInstagramError?error.code:'meta_unavailable')
    return NextResponse.redirect(url)
  }
}
