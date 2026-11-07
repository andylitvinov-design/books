import {NextResponse} from 'next/server'
import {cookies} from 'next/headers'
import {timingSafeEqual} from 'node:crypto'
import {getAppConfig} from '@/lib/app/config'
import {openSealed} from '@/lib/app/crypto'
import {PRACTITIONER_ID} from '@/data/app-services'
import {communityFlags,GOOGLE_SCOPES} from '@/lib/app/community-video-model.mjs'
import {communityOauthConfigured,saveCommunityOauth} from '@/lib/app/community-youtube-provider'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const COOKIE='hh_community_youtube_pkce'
const CALLBACK='https://holistichouse.vercel.app/api/admin/community-youtube/oauth/callback'
const CONTEXT={accountId:PRACTITIONER_ID,recordId:PRACTITIONER_ID,field:'community_oauth_state'}
const HEADERS={'cache-control':'no-store','referrer-policy':'no-referrer'}
function respond(ok){
 const r=NextResponse.redirect('https://holistichouse.vercel.app/admin/youtube-upload?communityYoutube='+(ok?'connected':'failed'),{headers:HEADERS})
 r.cookies.set(COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',
  path:'/api/admin/community-youtube/oauth',maxAge:0})
 return r
}
export async function GET(request){
 if(!communityFlags().schemaReady||!communityOauthConfigured())return respond(false)
 try{
  const url=new URL(request.url)
  if(url.searchParams.has('error'))return respond(false)
  const code=url.searchParams.get('code')||'',state=url.searchParams.get('state')||''
  if(!/^[A-Za-z0-9_-]{43}$/.test(state)||code.length<20||code.length>4096)return respond(false)
  const config=getAppConfig(),cookie=(await cookies()).get(COOKIE)?.value
  const sealed=openSealed(cookie,CONTEXT,config)
  if(!sealed||!/^[A-Za-z0-9_-]{43}$/.test(sealed.verifier||'')||
   !/^[A-Za-z0-9_-]{43}$/.test(sealed.state||'')||
   !Number.isSafeInteger(sealed.time)||Date.now()<sealed.time||Date.now()-sealed.time>600000||
   sealed.channelId!==communityFlags().channelId||
   !timingSafeEqual(Buffer.from(sealed.state),Buffer.from(state)))return respond(false)
  const response=await fetch('https://oauth2.googleapis.com/token',{
   method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({code,code_verifier:sealed.verifier,grant_type:'authorization_code',
    client_id:process.env.HH_OWNER_VIDEO_GOOGLE_CLIENT_ID,
    client_secret:process.env.HH_OWNER_VIDEO_GOOGLE_CLIENT_SECRET,redirect_uri:CALLBACK}),
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)})
  if(!response.ok)return respond(false)
  const token=await response.json().catch(()=>null)
  const scopes=String(token?.scope||'').split(/\s+/)
  if(typeof token?.refresh_token!=='string'||token.refresh_token.length<10||
   typeof token?.access_token!=='string'||token.access_token.length<20||
   !GOOGLE_SCOPES.every(s=>scopes.includes(s)))return respond(false)
  await saveCommunityOauth(config,{refreshToken:token.refresh_token,
   accessToken:token.access_token,scopes})
  return respond(true)
 }catch{return respond(false)}
}
