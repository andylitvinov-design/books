import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {GROWTH_INSTAGRAM_ACCOUNT_TARGETS} from '@/lib/growth-studio/instagram-accounts.mjs'
import {
  decryptInstagramAccessToken,encryptInstagramAccessToken,exchangeInstagramAuthorizationCode,
  readInstagramMetaConfiguration,verifyInstagramOAuthState,
} from '@/lib/growth-studio/instagram-meta.mjs'
import {createGrowthInstagramAccountStore} from '@/lib/growth-studio/instagram-account-store.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
const COOKIE='hh_growth_instagram_oauth_state'
const clearCookie={httpOnly:true,secure:true,sameSite:'lax',path:'/api/admin/growth-studio/instagram',maxAge:0}
const SAFE_REASONS=new Set([
  'access_denied','invalid_oauth_state','oauth_not_configured','storage_unavailable',
  'provider_exchange_failed','instagram_permissions_missing','instagram_identity_unverified',
  'instagram_handle_mismatch','instagram_credential_unavailable','invalid_callback',
])
function redirectToStudio(reason,accountId=''){
  const site=process.env.NEXT_PUBLIC_SITE_URL||'https://holistichouse.vercel.app'
  const url=new URL('/admin/growth-studio',site)
  url.searchParams.set('instagram_connect',reason)
  if(accountId)url.searchParams.set('instagram_account',accountId)
  const response=NextResponse.redirect(url)
  response.cookies.set(COOKIE,'',clearCookie)
  return response
}

export async function GET(request){
  if(!await requireAdminRequest())return new NextResponse('Unauthorized',{status:401})
  const params=request.nextUrl.searchParams
  if(params.has('error'))return redirectToStudio('access_denied')
  const code=params.get('code')
  const state=params.get('state')
  const cookieState=request.cookies.get(COOKIE)?.value
  if(!code||!state||!cookieState||state!==cookieState)return redirectToStudio('invalid_oauth_state')

  const config=readInstagramMetaConfiguration()
  if(!config.ready)return redirectToStudio('oauth_not_configured')
  let stateData
  try{stateData=verifyInstagramOAuthState(state,config.stateSecret)}
  catch{return redirectToStudio('invalid_oauth_state')}
  const account=GROWTH_INSTAGRAM_ACCOUNT_TARGETS.find(item=>item.id===stateData.accountId)
  if(!account)return redirectToStudio('invalid_oauth_state')
  const store=createGrowthInstagramAccountStore()
  if(!store)return redirectToStudio('storage_unavailable',account.id)
  try{
    const consumed=await store.consumeOAuthState(stateData.nonce)
    if(consumed!==state)return redirectToStudio('invalid_oauth_state',account.id)
    const identity=await exchangeInstagramAuthorizationCode({code,configuration:config})
    if(identity.username.toLowerCase()!==account.label.slice(1).toLowerCase())
      return redirectToStudio('instagram_handle_mismatch',account.id)
    const encryptedCredential=encryptInstagramAccessToken(identity.accessToken,config.encryptionKey)
    await store.saveConnected({
      accountId:account.id,
      providerAccountId:identity.providerAccountId,
      username:identity.username,
      permissions:identity.permissions,
      expiresAt:identity.expiresAt,
      encryptedCredential,
    })
    // Verify the credential can be decrypted before declaring the connection persisted.
    const envelope=await store.getCredentialEnvelope(account.id)
    const decrypted=decryptInstagramAccessToken(envelope,config.encryptionKey)
    if(decrypted!==identity.accessToken)return redirectToStudio('instagram_credential_unavailable',account.id)
    return redirectToStudio('connected',account.id)
  }catch(error){
    const reason=SAFE_REASONS.has(error?.code)?error.code:
      String(error?.message||'').includes('permissions')?'instagram_permissions_missing':
      'provider_exchange_failed'
    return redirectToStudio(reason,account.id)
  }
}
