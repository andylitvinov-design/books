import { NextResponse } from 'next/server'
export const dynamic='force-dynamic'
export const revalidate=0

export async function GET(request,{params}){
  const {locale,code}=await params
  const safeLocale=['en','ru'].includes(locale)?locale:'en'
  const target=new URL('/'+safeLocale+'/app/wallet',request.url)
  const response=NextResponse.redirect(target,{status:303})
  // Invite tokens are not authentication; rewards are validated after sign-in.
  if(/^[A-F0-9]{16}$/.test(code||'')){
    response.cookies.set('hh-xp-invite',code,{
      httpOnly:true,secure:target.protocol==='https:',sameSite:'lax',
      path:'/',maxAge:7*24*3600,
    })
  }
  return response
}
