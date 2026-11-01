import {NextResponse} from 'next/server'
import {randomBytes,createHash} from 'node:crypto'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getAppConfig} from '@/lib/app/config'
import {seal} from '@/lib/app/crypto'
import {PRACTITIONER_ID} from '@/data/app-services'
import {ownerVideoOauthConfigured} from '@/lib/practitioners/owner-telegram-video-service'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const COOKIE='hh_tgvideo_oauth_state'
const CALLBACK='https://holistichouse.vercel.app/api/admin/telegram-video/youtube/callback'
const CONTEXT={accountId:PRACTITIONER_ID,recordId:PRACTITIONER_ID,field:'telegram_video_oauth_state'}
const HEADERS={'cache-control':'no-store','referrer-policy':'no-referrer'}
export async function GET(request){
 // When a fresh iPhone/Telegram browser lacks the private admin cookie, enter the
 // existing verified-owner bridge and return to this exact OAuth start route.
 // A login redirect never grants YouTube access or creates a video.
 if(!await requireAdminRequest())return NextResponse.redirect(
   'https://holistichouse.vercel.app/admin/login?destination=youtubeConnect',
   {status:303,headers:HEADERS})
 if(!ownerVideoOauthConfigured())return new Response(
   'Google offline OAuth for Telegram videos is not configured.',{status:503,headers:HEADERS})
 try{
   const config=getAppConfig()
   const verifier=randomBytes(32).toString('base64url')
   const state=randomBytes(32).toString('base64url')
   // Only an explicit owner click requests stronger metadata-edit rights.
   const visibility=request?.url?
     new URL(request.url).searchParams.get('visibility')==='1':false
   const encrypted=seal({verifier,state,time:Date.now(),visibility},CONTEXT,config)
   const query=new URLSearchParams({
     client_id:process.env.HH_OWNER_VIDEO_GOOGLE_CLIENT_ID,redirect_uri:CALLBACK,
     response_type:'code',
     scope:'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly'+
       (visibility?' https://www.googleapis.com/auth/youtube.force-ssl':''),
     access_type:'offline',prompt:'consent',include_granted_scopes:'false',
     code_challenge:createHash('sha256').update(verifier).digest('base64url'),
     code_challenge_method:'S256',state
   })
   const res=NextResponse.redirect('https://accounts.google.com/o/oauth2/v2/auth?'+query,{headers:HEADERS})
   res.cookies.set(COOKIE,encrypted,{
     httpOnly:true,secure:true,sameSite:'lax',path:'/api/admin/telegram-video/youtube',
     maxAge:600
   })
   return res
 }catch{return new Response('OAuth unavailable',{status:503,headers:HEADERS})}
}
