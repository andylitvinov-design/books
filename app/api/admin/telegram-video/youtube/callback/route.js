import {NextResponse} from 'next/server'
import {cookies} from 'next/headers'
import {ownerVideoOauthStateMatches} from '@/lib/practitioners/owner-telegram-video-oauth-config.mjs'
import {getAppConfig} from '@/lib/app/config'
import {openSealed} from '@/lib/app/crypto'
import {PRACTITIONER_ID} from '@/data/app-services'
import {verifyYoutubeRuOwner} from '@/lib/practitioners/owner-telegram-video-youtube.mjs'
import {saveOwnerVideoYoutubeConsent,ownerVideoOauthConfigured} from '@/lib/practitioners/owner-telegram-video-service'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const COOKIE='hh_tgvideo_oauth_state'
const CALLBACK='https://holistichouse.vercel.app/api/admin/telegram-video/youtube/callback'
const CONTEXT={accountId:PRACTITIONER_ID,recordId:PRACTITIONER_ID,field:'telegram_video_oauth_state'}
const HEADERS={'cache-control':'no-store','referrer-policy':'no-referrer'}
function result(state){
 const res=NextResponse.redirect('https://holistichouse.vercel.app/admin/youtube-upload?telegramVideo='+state,
   {headers:HEADERS})
 res.cookies.set(COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',
   path:'/api/admin/telegram-video/youtube',maxAge:0})
 return res
}
export async function GET(request){
 // /start requires a verified owner admin session before issuing this sealed
 // PKCE state. A Google cross-site callback cannot carry admin SameSite=Strict
 // cookies, so validate only the owner-bound, short-lived sealed state below.
 // Do not weaken admin session cookies or trust a query-string state alone.
 if(!ownerVideoOauthConfigured())return result('failed')
 try{
   const url=new URL(request.url)
   if(url.searchParams.has('error'))return result('failed')
   const state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||''
   if(!/^[A-Za-z0-9_-]{30,64}$/.test(state)||code.length<20||code.length>4096)
     return result('failed')
   const config=getAppConfig()
   const cookie=(await cookies()).get(COOKIE)?.value
   const sealed=openSealed(cookie,CONTEXT,config)
   if(!ownerVideoOauthStateMatches(sealed,state))return result('failed')
   const payload=new URLSearchParams({code,code_verifier:sealed.verifier,
     grant_type:'authorization_code',
     client_id:process.env.HH_OWNER_VIDEO_GOOGLE_CLIENT_ID,
     client_secret:process.env.HH_OWNER_VIDEO_GOOGLE_CLIENT_SECRET,
     redirect_uri:CALLBACK})
   const response=await fetch('https://oauth2.googleapis.com/token',{
     method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
     body:payload,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)})
   if(!response.ok)return result('failed')
   const token=await response.json().catch(()=>null)
   if(!token||typeof token.refresh_token!=='string'||token.refresh_token.length<10||
     typeof token.access_token!=='string'||token.access_token.length<20||
     !String(token.scope||'').includes('youtube.upload')||
     !String(token.scope||'').includes('youtube.readonly'))
     return result('failed')
   const channel=await verifyYoutubeRuOwner(token.access_token)
   await saveOwnerVideoYoutubeConsent(config,token.refresh_token,channel)
   return result('connected')
 }catch{return result('failed')}
}
