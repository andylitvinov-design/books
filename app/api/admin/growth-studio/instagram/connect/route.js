import {randomUUID} from 'node:crypto'
import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {GROWTH_INSTAGRAM_ACCOUNT_TARGETS} from '@/lib/growth-studio/instagram-accounts.mjs'
import {
  buildInstagramLoginUrl,createInstagramOAuthState,readInstagramMetaConfiguration,
} from '@/lib/growth-studio/instagram-meta.mjs'
import {createGrowthInstagramAccountStore} from '@/lib/growth-studio/instagram-account-store.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const COOKIE='hh_growth_instagram_oauth_state'
const cookieOptions={httpOnly:true,secure:true,sameSite:'lax',path:'/api/admin/growth-studio/instagram',maxAge:600}

function studioRedirect(reason){
  const site=process.env.NEXT_PUBLIC_SITE_URL||'https://holistichouse.vercel.app'
  const url=new URL('/admin/growth-studio',site)
  url.searchParams.set('instagram_connect',reason)
  return NextResponse.redirect(url)
}

export async function GET(request){
  if(!await requireAdminRequest())return new NextResponse('Unauthorized',{status:401})
  const accountId=request.nextUrl.searchParams.get('accountId')
  if(!GROWTH_INSTAGRAM_ACCOUNT_TARGETS.some(account=>account.id===accountId))
    return studioRedirect('invalid_account')
  const config=readInstagramMetaConfiguration()
  if(!config.ready)return studioRedirect('oauth_not_configured')
  const store=createGrowthInstagramAccountStore()
  if(!store)return studioRedirect('storage_unavailable')
  const nonce=randomUUID()
  const state=createInstagramOAuthState({accountId,nonce},config.stateSecret)
  try{await store.createOAuthState(nonce,state)}catch{return studioRedirect('storage_unavailable')}
  let authorizationUrl
  try{authorizationUrl=buildInstagramLoginUrl({accountId,state,configuration:config})}
  catch{return studioRedirect('oauth_not_configured')}
  const response=NextResponse.redirect(authorizationUrl)
  response.cookies.set(COOKIE,state,cookieOptions)
  return response
}
