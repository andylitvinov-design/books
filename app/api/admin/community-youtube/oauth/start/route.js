import {NextResponse} from 'next/server'
import {randomBytes,createHash} from 'node:crypto'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getAppConfig} from '@/lib/app/config'
import {seal} from '@/lib/app/crypto'
import {PRACTITIONER_ID} from '@/data/app-services'
import {communityFlags,GOOGLE_SCOPES} from '@/lib/app/community-video-model.mjs'
import {communityOauthConfigured} from '@/lib/app/community-youtube-provider'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const COOKIE='hh_community_youtube_pkce'
const CALLBACK='https://holistichouse.vercel.app/api/admin/community-youtube/oauth/callback'
const CONTEXT={accountId:PRACTITIONER_ID,recordId:PRACTITIONER_ID,field:'community_oauth_state'}
const HEADERS={'cache-control':'no-store','referrer-policy':'no-referrer'}
export async function GET(){
 if(!await requireAdminRequest())return NextResponse.redirect(
  'https://holistichouse.vercel.app/admin/login',{status:303,headers:HEADERS})
 if(!communityFlags().schemaReady||!communityOauthConfigured())return new Response(
  'Shared YouTube channel must be configured and migration applied first.',{status:503,headers:HEADERS})
 try{
  const config=getAppConfig(),state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url')
  const sealed=seal({state,verifier,time:Date.now(),channelId:communityFlags().channelId},CONTEXT,config)
  const query=new URLSearchParams({
   client_id:process.env.HH_OWNER_VIDEO_GOOGLE_CLIENT_ID,redirect_uri:CALLBACK,
   response_type:'code',scope:GOOGLE_SCOPES.join(' '),access_type:'offline',prompt:'consent',
   include_granted_scopes:'false',code_challenge:createHash('sha256').update(verifier).digest('base64url'),
   code_challenge_method:'S256',state})
  const response=NextResponse.redirect('https://accounts.google.com/o/oauth2/v2/auth?'+query,{headers:HEADERS})
  response.cookies.set(COOKIE,sealed,{httpOnly:true,secure:true,sameSite:'lax',
   path:'/api/admin/community-youtube/oauth',maxAge:600})
  return response
 }catch{return new Response('OAuth unavailable',{status:503,headers:HEADERS})}
}
